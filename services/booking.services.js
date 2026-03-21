const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Discount = require("../models/Discount");
const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const crypto = require("crypto");
const cron = require("node-cron");

const reserveMovieTicketsService = async (showtimeId, seats, userId,) => {
  const showtime = await Showtime.findById(showtimeId);
  if (!showtime)
    throw ({ status: 404, message: "Showtime not found" });

  // Validate seats
  let totalAmount = 0;
  const reservedSeatsDetails = [];

  for (const seatCode of seats) {
    const seatObj = showtime.seats.find((s) => s.seatCode === seatCode);
    if (!seatObj)
      throw ({
        status: 400,
        message: `Seat ${seatCode} is invalid for this showtime`,
      });

    if (seatObj.status !== STATUS.AVAILABLE)
      throw ({
        status: 400,
        message: `Seat ${seatCode} is not available`,
      });

    // Mark showtime seat as HELD
    seatObj.status = STATUS.HELD;
    totalAmount += seatObj.price;

    // Determine type based on price matching pricingRules (approximate fallback)
    let type = "NORMAL";
    if (seatObj.price === showtime.pricingRule.VIP) type = "VIP";
    if (seatObj.price === showtime.pricingRule.COUPLE) type = "COUPLE";

    reservedSeatsDetails.push({
      seatCode: seatObj.seatCode,
      type,
      price: seatObj.price,
    });
  }

  await showtime.save();

  const bookingCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  // Held tickets expire in 10 minutes if not paid
  const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

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
    if (discount && discount.usedCount < discount.usageLimit) {
      const currentDate = new Date();
      if (
        currentDate >= discount.startDate &&
        currentDate <= discount.endDate
      ) {
        if (discount.discountType === "PERCENT") {
          finalAmount -= finalAmount * (discount.value / 100);
        } else if (discount.discountType === "FIXED") {
          finalAmount -= discount.value;
          if (finalAmount < 0) finalAmount = 0;
        }
        discount.usedCount += 1;
        await discount.save();
      }
    }
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

 //release seats
 const showtime = await Showtime.findById(booking.showtimeId)
 if(showtime){
  booking.seats.forEach((bSeat) => {
    const showtimeSeat = showtime.seats.find(sSeat => sSeat.seatCode === bSeat.seatCode)
    if(showtimeSeat && showtimeSeat.status === STATUS.HELD){
      showtimeSeat.status = STATUS.AVAILABLE
    }
  })
 }

  booking.status = STATUS.CANCELLED;
  await booking.save();

  return booking;
}
module.exports = {
  reserveMovieTicketsService,
  foodOrderService,
  paymentService,
  getBookingHistoryService,
  checkInService,
  addFoodToBookingService
};
