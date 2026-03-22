const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Discount = require("../models/Discount");
const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const crypto = require("crypto");
const cron = require("node-cron");

const reserveMovieTicketsService = async (showtimeId, seats, userId) => {
  // 1. Check ticket limit (e.g., max 8 seats per booking)
  if (seats.length > 8) {
    throw { status: 400, message: "You can only book up to 8 seats at a time" };
  }

  // Find showtime
  const showtime = await Showtime.findById(showtimeId);
  if (!showtime) throw { status: 404, message: "Showtime not found" };

  let totalAmount = 0;
  const reservedSeatsDetails = [];

  // Check if all requested seats are available right now
  for (const seatCode of seats) {
    const seatObj = showtime.seats.find((s) => s.seatCode === seatCode);
    if (!seatObj) {
      throw { status: 400, message: `Seat ${seatCode} is invalid for this showtime` };
    }
    if (seatObj.status !== STATUS.AVAILABLE) {
      throw { status: 400, message: `Seat ${seatCode} is currently not available` };
    }

    // Prepare booking details
    let type = "NORMAL";
    if (seatObj.price === showtime.pricingRule.VIP) type = "VIP";
    if (seatObj.price === showtime.pricingRule.COUPLE) type = "COUPLE";

    reservedSeatsDetails.push({ seatCode: seatObj.seatCode, type, price: seatObj.price });
    totalAmount += seatObj.price;
  }

  // CONCURRENCY HANDLING: Find the exact showtime and update ONLY if the seats are still AVAILABLE
  const updateQuery = {
    _id: showtimeId,
    seats: {
      $all: seats.map(seatCode => ({
        $elemMatch: {
          seatCode,
          status: STATUS.AVAILABLE
        }
      }))
    }
  };

  // Atomic update to mark them as HELD
  const updatedShowtime = await Showtime.findOneAndUpdate(
    updateQuery,
    {
      $set: { "seats.$[elem].status": STATUS.HELD }
    },
    {
      arrayFilters: [{ "elem.seatCode": { $in: seats } }],
      new: true
    }
  );

  if (!updatedShowtime) {
    // If update fails, it means someone else booked at least one of these seats literally milliseconds ago
    throw { status: 409, message: "One or more seats were just booked by another user. Please choose different seats." };
  }

  const bookingCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expiredAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const newBooking = new MovieBooking({
    bookingCode,
    showtimeId,
    userId,
    seats: reservedSeatsDetails,
    totalAmount,
    status: STATUS.HELD,
    expiredAt,
  });

  await newBooking.save();
  return newBooking;
};

const addFoodToBookingService = async(movieBookingId, foodBookingId) => {
  if(!movieBookingId || !foodBookingId)
    throw ({status: 400, message: "Missing movie booking or food booking ID"})

  const movieBooking = await MovieBooking.findById(movieBookingId);

  if(!movieBooking)
      throw ({status: 404, message: "Movie booking not found"})


  const foodBooking = await FoodBooking.findById(foodBookingId);
  if(!foodBooking)
      throw ({status: 404, message: "Food booking not found"})

  if(foodBooking.status !== STATUS.PENDING)
      throw ({status: 400, message: "Food booking must be pending"})

  movieBooking.foodBookingId = foodBookingId;
  await movieBooking.save();

  const updatedMovieBooking = await MovieBooking.findById(movieBookingId).populate("foodBookingId")
  return updatedMovieBooking
}

const foodOrderService = async (items, userId) => {
  let totalAmount = 0;
  const detailedItems = [];

  for (const item of items) {
    const foodItem = await Food.findById(item.foodId);
    if (!foodItem)
      throw ({
        status: 404,
        message: `Food item ${item.foodId} not found`,
      });

    const subtotal = foodItem.price * item.quantity;
    totalAmount += subtotal;

    detailedItems.push({
      foodId: foodItem._id,
      name: foodItem.name,
      type: foodItem.type,
      price: foodItem.price,
      quantity: item.quantity,
      subtotal,
    });
  }

  const newFoodBooking = new FoodBooking({
    userId,
    items: detailedItems,
    totalAmount,
    status: STATUS.PENDING,
  });

  await newFoodBooking.save();
  return newFoodBooking
};

const paymentService = async (id, method, transactionId, discountCode) => {
  // Check if it's a MovieBooking
  let booking = await MovieBooking.findById(id);
  let isMovieBooking = true;

  if (!booking) {
    // Check FoodBooking
    booking = await FoodBooking.findById(id);
    isMovieBooking = false;
    if (!booking) {
      throw ({ status: 404, message: "Booking not found" });
    }
  }

  if (booking.status === STATUS.PAID) {
    throw ({ status: 400, message: "Booking is already paid" });
  }

  if (
    isMovieBooking &&
    new Date() > new Date(booking.expiredAt) &&
    booking.status === STATUS.HELD
  ) {
    // Must release seats
    const showtime = await Showtime.findById(booking.showtimeId);
    if (showtime) {
      booking.seats.forEach((bSeat) => {
        const sSeat = showtime.seats.find((s) => s.seatCode === bSeat.seatCode);
        if (sSeat && sSeat.status === STATUS.HELD) {
          sSeat.status = STATUS.AVAILABLE;
        }
      });
      await showtime.save();
    }
    booking.status = STATUS.EXPIRED;
    await booking.save();
    throw ({ status: 400, message: "Booking has expired" });
  }

  let finalAmount = booking.totalAmount;
  let foodBooking = null;

  // If there's an attached food order, add its amount to the final total
if(booking.foodBookingId){
  foodBooking = await FoodBooking.findById(booking.foodBookingId)
  if(foodBooking){
    finalAmount += foodBooking.totalAmount
  }
}

  // Apply Discount
  if (discountCode) {
    const discount = await Discount.findOne({
      code: discountCode,
      status: STATUS.ACTIVE,
    });

    if (!discount || discount.usedCount >= discount.usageLimit) {
      throw { status: 400, message: "Discount code is invalid or has reached its usage limit" };
    }

    const currentDate = new Date();
    if (currentDate < discount.startDate || currentDate > discount.endDate) {
      throw { status: 400, message: "Discount code is expired or not active yet" };
    }

    // Apply the discount safely
    if (discount.discountType === "PERCENT") {
      finalAmount -= finalAmount * (discount.value / 100);
    } else if (discount.discountType === "FIXED") {
      finalAmount -= discount.value;
      if (finalAmount < 0) finalAmount = 0;
    }

    // Increment usage
    discount.usedCount += 1;
    await discount.save();
    
    // SAVE THE DISCOUNTED AMOUNT AND ID to the booking document
    booking.totalAmount = finalAmount; 
    booking.discountId = discount._id;
  }

  // Process payment
  booking.payment = {
    method, // CASH | ONLINE
    paidAt: new Date(),
    transactionId,
  };
  booking.status = STATUS.PAID;

  // Also mark the associated food booking as paid
  if (foodBooking) {
    foodBooking.payment = booking.payment;
    foodBooking.status = STATUS.PAID;
    await foodBooking.save();
  }

  if (isMovieBooking) {
    // Generate barcodes for tickets
    booking.seats.forEach((seat) => {
      seat.barcode = crypto.randomBytes(6).toString("hex").toUpperCase();
    });

    // Update Showtime seats to SOLD
    const showtime = await Showtime.findById(booking.showtimeId);
    if (showtime) {
      booking.seats.forEach((bSeat) => {
        const sSeat = showtime.seats.find((s) => s.seatCode === bSeat.seatCode);
        if (sSeat) {
          sSeat.status = STATUS.SOLD;
        }
      });
      await showtime.save();
    }
  }

  await booking.save();
  return {finalAmount, booking}
};

const getBookingHistoryService = async (userId) => {
  const rawMovieBookingHistory = await MovieBooking.find({ userId })
    .populate("showtimeId")
    .populate("foodBookingId")
    .lean()
    .transform(bookings => bookings.map((booking) => {
    const { foodBookingId, ...rest } = booking;
    return {
      ...rest,
      foodBooking: foodBookingId || null,
    };
    
  }));    
  
  // Get array of ONLY the FoodBooking IDs as strings so .includes() will work
  const foodBookingIdsInMovieBooking = rawMovieBookingHistory
    .filter(booking => booking.foodBooking)
    .map(booking => ( booking.foodBooking._id.toString()));

  // Get raw food bookings
  const rawFoodBookingHistory = await FoodBooking.find({ userId }).lean();

  // Filter out any FoodBookings that we already returned nested inside the movieBookingHistory
  const foodBookingHistory = rawFoodBookingHistory.filter(
    booking => !foodBookingIdsInMovieBooking.includes(booking._id.toString())
  );

  
  console.log(rawMovieBookingHistory)
  console.log(foodBookingHistory)
  return { rawMovieBookingHistory, foodBookingHistory };
};


const checkInService = async (id) =>{
   
    const booking = await MovieBooking.findById(id);
    if (!booking) throw ({ status: 404, message: "Movie Booking not found" });

    if (booking.status !== STATUS.PAID) {
      throw ({ status: 400, message: "Booking must be PAID to check in" });
    }

    booking.status = STATUS.CHECKED_IN;
    await booking.save();
    return booking;
}

const cancelBookingService = async (id) => {
  const booking = await MovieBooking.findById(id);
  if (!booking) throw ({ status: 404, message: "Movie Booking not found" });

  const showtime = await Showtime.findById(booking.showtimeId);
  if (!showtime) throw { status: 404, message: "Showtime not found" };

  // Check timeframe: Cannot cancel within 1 hours of the movie starting (standard cinema policy)
  const hoursUntilMovie = (new Date(showtime.startTime) - new Date()) / (1000 * 60 * 60);
  if (hoursUntilMovie < 1 && booking.status === STATUS.PAID) {
    throw { status: 400, message: "Cannot cancel tickets within 1 hours of the showtime" };
  }

  if (booking.status === STATUS.CANCELLED || booking.status === STATUS.EXPIRED) {
    throw { status: 400, message: "Booking is already cancelled or expired" };
  }

  // If PAID, handle Refund (You would integrate Stripe or similar refund logic here)
  if (booking.status === STATUS.PAID) {
    // TODO: Initiate Payment Refund Process Here
  }

  // Release seats back to AVAILABLE
  let countReleased = 0;
  booking.seats.forEach((bSeat) => {
    const sSeat = showtime.seats.find((s) => s.seatCode === bSeat.seatCode);
    if (sSeat && (sSeat.status === STATUS.HELD || sSeat.status === STATUS.SOLD)) {
      sSeat.status = STATUS.AVAILABLE;
      countReleased++;
    }
  });

  if (countReleased > 0) {
    await showtime.save();
  }

  // Cancel attached food booking if exists
  if (booking.foodBookingId) {
     const foodBooking = await FoodBooking.findById(booking.foodBookingId);
     if (foodBooking) {
       foodBooking.status = STATUS.CANCELLED;
       await foodBooking.save();
     }
  }

  // Mark MovieBooking as Cancelled
  booking.status = STATUS.CANCELLED;
  await booking.save();

  return booking;
};

const cancelFoodBookingService = async (foodBookingId) => {
  const foodBooking = await FoodBooking.findById(foodBookingId);
  if (!foodBooking) throw { status: 404, message: "Food Booking not found" };

  if (foodBooking.status === STATUS.CANCELLED) {
    throw { status: 400, message: "Food booking is already cancelled" };
  }

  // Mark as cancelled
  foodBooking.status = STATUS.CANCELLED;
  await foodBooking.save();

  // If this food booking was attached to a MovieBooking, you might want to remove the link 
  // so the user can order food again on the same movie ticket
  await MovieBooking.updateMany(
    { foodBookingId: foodBookingId },
    { $unset: { foodBookingId: "" } } 
  );


  return foodBooking;
};

module.exports = {
  reserveMovieTicketsService,
  foodOrderService,
  paymentService,
  getBookingHistoryService,
  checkInService,
  addFoodToBookingService,
  cancelBookingService,
  cancelFoodBookingService
};
