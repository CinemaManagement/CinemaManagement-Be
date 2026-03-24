const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Discount = require("../models/Discount");
const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const crypto = require("crypto");
const cron = require("node-cron");
const vnpay = require("../config/vnpay.config");
const { ProductCode, VnpLocale } = require("vnpay");

const { createBarcodeAndSendEmail } = require("../helpers/createBarcode");

const reserveMovieTicketsService = async (
  showtimeId,
  movieBookingId,
  seats,
  userId,
) => {
  let oldBooking = null;
  if (movieBookingId) oldBooking = await MovieBooking.findById(movieBookingId);

  // 1. Check ticket limit (e.g., max 8 seats per booking)
  if (seats.length > 8) {
    throw { status: 400, message: "You can only book up to 8 seats at a time" };
  }

  // 3. Find showtime (re-fetch to get updated seat statuses if we just released some)
  const showtime = await Showtime.findById(showtimeId);
  if (!showtime) throw { status: 404, message: "Showtime not found" };

  let totalAmount = 0;
  const reservedSeatsDetails = [];

  // 4. Check if all requested seats are available right now
  for (const seatCode of seats) {
    const seatObj = showtime.seats.find((s) => s.seatCode === seatCode);
    if (!seatObj) {
      throw {
        status: 400,
        message: `Seat ${seatCode} is invalid for this showtime`,
      };
    }
    if (seatObj.status !== STATUS.AVAILABLE) {
      throw {
        status: 400,
        message: `Seat ${seatCode} is currently not available`,
      };
    }

    // Prepare booking details
    let type = "NORMAL";
    if (seatObj.price === showtime.pricingRule.VIP) type = "VIP";
    if (seatObj.price === showtime.pricingRule.COUPLE) type = "COUPLE";

    reservedSeatsDetails.push({
      seatCode: seatObj.seatCode,
      type,
      price: seatObj.price,
    });
    totalAmount += seatObj.price;
  }

  // 5. CONCURRENCY HANDLING: Find the exact showtime and update ONLY if the seats are still AVAILABLE
  const updateQuery = {
    _id: showtimeId,
    seats: {
      $all: seats.map((seatCode) => ({
        $elemMatch: {
          seatCode,
          status: STATUS.AVAILABLE,
        },
      })),
    },
  };

  // Atomic update to mark them as HELD
  const updatedShowtime = await Showtime.findOneAndUpdate(
    updateQuery,
    {
      $set: { "seats.$[elem].status": STATUS.HELD },
    },
    {
      arrayFilters: [{ "elem.seatCode": { $in: seats } }],
      new: true,
    },
  );

  if (!updatedShowtime) {
    throw {
      status: 409,
      message:
        "One or more seats were just booked by another user. Please choose different seats.",
    };
  }

  // 6. Update or Create Booking
  if (oldBooking) {
    oldBooking.showtimeId = showtimeId;
    oldBooking.seats = reservedSeatsDetails;
    oldBooking.totalAmount = totalAmount;
    oldBooking.expiredAt = new Date(Date.now() + 10 * 60 * 1000); // Reset timer
    await oldBooking.save();
    return oldBooking;
  } else {
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
  }
};

const addFoodToBookingService = async (movieBookingId, foodBookingId) => {
  if (!movieBookingId || !foodBookingId)
    throw { status: 400, message: "Missing movie booking or food booking ID" };

  const movieBooking = await MovieBooking.findById(movieBookingId);

  if (!movieBooking) throw { status: 404, message: "Movie booking not found" };

  const foodBooking = await FoodBooking.findById(foodBookingId);
  if (!foodBooking) throw { status: 404, message: "Food booking not found" };

  if (foodBooking.status !== STATUS.PENDING)
    throw { status: 400, message: "Food booking must be pending" };

  movieBooking.foodBookingId = foodBookingId;
  await movieBooking.save();

  const updatedMovieBooking =
    await MovieBooking.findById(movieBookingId).populate("foodBookingId");
  return updatedMovieBooking;
};

const foodOrderService = async (items, userId) => {
  let totalAmount = 0;
  const detailedItems = [];

  for (const item of items) {
    const foodItem = await Food.findById(item.foodId);
    if (!foodItem)
      throw {
        status: 404,
        message: `Food item ${item.foodId} not found`,
      };

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
  return newFoodBooking;
};

const paymentService = async (id, method, transactionId) => {
  // Check if it's a MovieBooking
  let booking = await MovieBooking.findById(id);
  let isMovieBooking = true;

  if (!booking) {
    // Check FoodBooking
    booking = await FoodBooking.findById(id);
    isMovieBooking = false;
    if (!booking) {
      throw { status: 404, message: "Booking not found" };
    }
  }

  if (booking.status === STATUS.PAID) {
    throw { status: 400, message: "Booking is already paid" };
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
    throw { status: 400, message: "Booking has expired" };
  }

  let finalAmount = booking.totalAmount;
  let foodBooking = null;

  // If there's an attached food order, add its amount to the final total
  if (booking.foodBookingId) {
    foodBooking = await FoodBooking.findById(booking.foodBookingId);
    if (foodBooking) {
      finalAmount += foodBooking.totalAmount;
    }
  }

  // Apply Discount
  if (booking.discountId) {
    const discount = await Discount.findById(booking.discountId);

    if (!discount || discount.usedCount >= discount.usageLimit) {
      throw {
        status: 400,
        message: "Discount code is invalid or has reached its usage limit",
      };
    }

    const currentDate = new Date();
    if (currentDate < discount.startDate || currentDate > discount.endDate) {
      throw {
        status: 400,
        message: "Discount code is expired or not active yet",
      };
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

  // Generate barcode and send email (async, don't necessarily need to await it here if we want faster response,
  // but since it updates the same booking, it's safer to await or handle carefully.
  // Given the user request, I'll await it to ensure DB is updated before returning.)
  if (isMovieBooking) {
    await createBarcodeAndSendEmail(booking);
  }

  return { finalAmount, booking };
};

const getDiscountAmount = (discount, amount) => {
  if (!discount) return amount;
  switch (discount.discountType) {
    case "PERCENT": {
      amount -= (amount * discount.value) / 100;
      break;
    }
    case "FIXED": {
      amount -= discount.value;
      break;
    }
  }
  if (amount < 0) amount = 0;
  return amount;
};

const getBookingPriceService = async (id) => {
  let booking = await MovieBooking.findById(id)
    .populate({
      path: "foodBookingId",
      populate: { path: "discountId" },
    })
    .populate("discountId");

  if (!booking) {
    booking = await FoodBooking.findById(id).populate("discountId");

    if (!booking) throw { status: 404, message: "Booking not found" };

    return getDiscountAmount(booking.discountId, booking.totalAmount);
  } else {
    let amount = booking.totalAmount;
    let foodAmount = 0;
    if (booking.foodBookingId) {
      foodAmount = getDiscountAmount(
        booking.foodBookingId.discountId,
        booking.foodBookingId.totalAmount,
      );
    }
    return getDiscountAmount(booking.discountId, amount + foodAmount);
  }
};

const getBookingHistoryService = async (userId) => {
  const movieBookings = await MovieBooking.find({ userId })
    .populate("showtimeId")
    .populate("foodBookingId")
    .lean();

  const rawMovieBookingHistory = movieBookings.map((booking) => {
    const { foodBookingId, ...rest } = booking;
    return {
      ...rest,
      foodBooking: foodBookingId || null,
    };
  });

  // Get array of ONLY the FoodBooking IDs as strings so .includes() will work
  const foodBookingIdsInMovieBooking = rawMovieBookingHistory
    .filter((booking) => booking.foodBooking)
    .map((booking) => booking.foodBooking._id.toString());

  // Get raw food bookings
  const rawFoodBookingHistory = await FoodBooking.find().lean();

  // Filter out any FoodBookings that we already returned nested inside the movieBookingHistory
  const foodBookingHistory = rawFoodBookingHistory.filter(
    (booking) => !foodBookingIdsInMovieBooking.includes(booking._id.toString()),
  );

  return { rawMovieBookingHistory, foodBookingHistory };
};

const getAllBookingHistoryService = async () => {
  const movieBookings = await MovieBooking.find()
    .populate("showtimeId")
    .populate("foodBookingId")
    .lean();

  const rawMovieBookingHistory = movieBookings.map((booking) => {
    const { foodBookingId, ...rest } = booking;
    return {
      ...rest,
      foodBooking: foodBookingId || null,
    };
  });

  // Get array of ONLY the FoodBooking IDs as strings so .includes() will work
  const foodBookingIdsInMovieBooking = rawMovieBookingHistory
    .filter((booking) => booking.foodBooking)
    .map((booking) => booking.foodBooking._id.toString());

  // Get raw food bookings
  const rawFoodBookingHistory = await FoodBooking.find().lean();

  // Filter out any FoodBookings that we already returned nested inside the movieBookingHistory
  const foodBookingHistory = rawFoodBookingHistory.filter(
    (booking) => !foodBookingIdsInMovieBooking.includes(booking._id.toString()),
  );

  return { rawMovieBookingHistory, foodBookingHistory };
};

const checkInService = async (bookingCode) => {
  const booking = await MovieBooking.findOne({ bookingCode });
  if (!booking) throw { status: 404, message: "Movie Booking not found" };

  if (booking.status !== STATUS.PAID) {
    throw { status: 400, message: "Booking must be PAID to check in" };
  }

  booking.status = STATUS.CHECKED_IN;
  await booking.save();
  return booking;
};

const cancelBookingService = async (id) => {
  const booking = await MovieBooking.findById(id);
  if (!booking) throw { status: 404, message: "Movie Booking not found" };

  const showtime = await Showtime.findById(booking.showtimeId);
  if (!showtime) throw { status: 404, message: "Showtime not found" };

  // Check timeframe: Cannot cancel within 1 hours of the movie starting (standard cinema policy)
  const hoursUntilMovie =
    (new Date(showtime.startTime) - new Date()) / (1000 * 60 * 60);
  if (hoursUntilMovie < 1 && booking.status === STATUS.PAID) {
    throw {
      status: 400,
      message: "Cannot cancel tickets within 1 hours of the showtime",
    };
  }

  if (
    booking.status === STATUS.CANCELLED ||
    booking.status === STATUS.EXPIRED
  ) {
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
    if (
      sSeat &&
      (sSeat.status === STATUS.HELD || sSeat.status === STATUS.SOLD)
    ) {
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
    { $unset: { foodBookingId: "" } },
  );

  return foodBooking;
};

const createPaymentUrlService = async (id, discountCode, ipAddr) => {
  // Find booking
  let booking = await MovieBooking.findById(id);
  let isMovieBooking = true;

  if (!booking) {
    booking = await FoodBooking.findById(id);
    isMovieBooking = false;
    if (!booking) {
      throw { status: 404, message: "Booking not found" };
    }
  }

  if (booking.status === STATUS.PAID) {
    throw { status: 400, message: "Booking is already paid" };
  }

  // Check expiry for movie bookings
  if (
    isMovieBooking &&
    new Date() > new Date(booking.expiredAt) &&
    booking.status === STATUS.HELD
  ) {
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
    throw { status: 400, message: "Booking has expired" };
  }

  let finalAmount = booking.totalAmount;
  let foodBooking = null;

  // Add food total if attached
  if (booking.foodBookingId) {
    foodBooking = await FoodBooking.findById(booking.foodBookingId);
    if (foodBooking) {
      finalAmount += foodBooking.totalAmount;
    }
  }

  // Apply Discount (save to booking but do NOT mark as paid yet)
  if (discountCode) {
    const discount = await Discount.findOne({
      code: discountCode,
      status: STATUS.ACTIVE,
    });

    if (!discount || discount.usedCount >= discount.usageLimit) {
      throw {
        status: 400,
        message: "Discount code is invalid or has reached its usage limit",
      };
    }

    const currentDate = new Date();
    if (currentDate < discount.startDate || currentDate > discount.endDate) {
      throw {
        status: 400,
        message: "Discount code is expired or not active yet",
      };
    }

    if (discount.discountType === "PERCENT") {
      finalAmount -= finalAmount * (discount.value / 100);
    } else if (discount.discountType === "FIXED") {
      finalAmount -= discount.value;
      if (finalAmount < 0) finalAmount = 0;
    }

    // Increment usage now (to prevent double-use during redirect)
    discount.usedCount += 1;
    await discount.save();

    booking.totalAmount = finalAmount;
    booking.discountId = discount._id;
    await booking.save();
  }

  // Build VNPay payment URL
  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: finalAmount,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_TxnRef: booking._id.toString(),
    vnp_OrderInfo: `Thanh toan don hang ${booking._id}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
    vnp_Locale: VnpLocale.VN,
  });

  return { paymentUrl, finalAmount };
};

const vnpayReturnService = async (vnpayQuery) => {
  const verify = vnpay.verifyReturnUrl(vnpayQuery);

  if (!verify.isVerified) {
    throw { status: 400, message: "Invalid VNPay signature" };
  }

  if (!verify.isSuccess) {
    return {
      success: false,
      message: "Payment was not successful",
      code: vnpayQuery.vnp_ResponseCode,
    };
  }

  const bookingId = vnpayQuery.vnp_TxnRef;
  const transactionId = vnpayQuery.vnp_TransactionNo;

  // Find booking
  let booking = await MovieBooking.findById(bookingId);
  let isMovieBooking = true;

  if (!booking) {
    booking = await FoodBooking.findById(bookingId);
    isMovieBooking = false;
    if (!booking) {
      return { success: false, message: "Booking not found" };
    }
  }

  // Already paid
  if (booking.status === STATUS.PAID) {
    return {
      success: true,
      message: "Booking already paid",
      bookingId,
      finalAmount: booking.totalAmount,
    };
  }

  // Mark as PAID
  booking.payment = {
    method: "ONLINE",
    paidAt: new Date(),
    transactionId: transactionId,
  };
  booking.status = STATUS.PAID;

  // Also mark attached food booking as paid
  if (booking.foodBookingId) {
    const foodBooking = await FoodBooking.findById(booking.foodBookingId);
    if (foodBooking) {
      foodBooking.payment = booking.payment;
      foodBooking.status = STATUS.PAID;
      await foodBooking.save();
    }
  }

  if (isMovieBooking) {
    // Generate barcodes
    booking.seats.forEach((seat) => {
      seat.barcode = crypto.randomBytes(6).toString("hex").toUpperCase();
    });

    // Update seats to SOLD
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
  let bookingPopulate = await booking.populate("userId");
  if (isMovieBooking) {
    try {
      await createBarcodeAndSendEmail(bookingPopulate);
    } catch (err) {
      console.error("Failed to send barcode email after VNPay return:", err);
    }
  }

  return {
    success: true,
    message: "Payment confirmed",
    bookingId,
    finalAmount: booking.totalAmount,
  };
};

const getBookingByIdService = async (id) => {
  // Try MovieBooking first
  let booking = await MovieBooking.findById(id)
    .populate("showtimeId")
    .populate("foodBookingId")
    .lean();

  if (booking) {
    const { foodBookingId, ...rest } = booking;
    return { type: "movie", ...rest, foodBooking: foodBookingId || null };
  }

  // Try FoodBooking
  booking = await FoodBooking.findById(id).lean();
  if (booking) {
    return { type: "food", ...booking };
  }

  throw { status: 404, message: "Booking not found" };
};

const checkoutAndPayService = async (
  movieBookingId,
  foodItems,
  discountCode,
  ipAddr,
  userId,
) => {
  // 1. Find and validate the MovieBooking
  const booking = await MovieBooking.findById(movieBookingId);
  if (!booking) throw { status: 404, message: "Movie booking not found" };

  if (booking.status === STATUS.PAID) {
    throw { status: 400, message: "Booking is already paid" };
  }
  if (
    booking.status === STATUS.EXPIRED ||
    booking.status === STATUS.CANCELLED
  ) {
    throw { status: 400, message: "Booking is expired or cancelled" };
  }

  // Check expiry
  if (
    new Date() > new Date(booking.expiredAt) &&
    booking.status === STATUS.HELD
  ) {
    const showtime = await Showtime.findById(booking.showtimeId);
    if (showtime) {
      booking.seats.forEach((bSeat) => {
        const sSeat = showtime.seats.find((s) => s.seatCode === bSeat.seatCode);
        if (sSeat && sSeat.status === STATUS.HELD)
          sSeat.status = STATUS.AVAILABLE;
      });
      await showtime.save();
    }
    booking.status = STATUS.EXPIRED;
    await booking.save();
    throw {
      status: 400,
      message: "Booking has expired. Please select seats again.",
    };
  }

  // 2. Handle Food Booking updates vs creation
  if (booking.foodBookingId) {
    const existingFoodBooking = await FoodBooking.findById(
      booking.foodBookingId,
    );
    if (existingFoodBooking && existingFoodBooking.status === STATUS.PENDING) {
      if (!foodItems || foodItems.length === 0) {
        // User removed all food items – cancel the existing one
        existingFoodBooking.status = STATUS.CANCELLED;
        await existingFoodBooking.save();
        booking.foodBookingId = undefined;
        await booking.save();
      } else {
        // User changed their food choices – update the existing booking instead of creating a new one
        let totalAmount = 0;
        const detailedItems = [];

        for (const item of foodItems) {
          const foodItem = await Food.findById(item.foodId);
          if (!foodItem)
            throw {
              status: 404,
              message: `Food item ${item.foodId} not found`,
            };

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

        existingFoodBooking.items = detailedItems;
        existingFoodBooking.totalAmount = totalAmount;
        await existingFoodBooking.save();
      }
    }
  } else if (foodItems && foodItems.length > 0) {
    // 3. No existing food booking, so create a new one
    const newFoodBooking = await foodOrderService(foodItems, userId);
    booking.foodBookingId = newFoodBooking._id;
    await booking.save();
  }

  // 4. Build VNPay URL (reuse existing service, which also handles discount logic)
  const { paymentUrl, finalAmount } = await createPaymentUrlService(
    movieBookingId,
    discountCode,
    ipAddr,
  );

  return { paymentUrl, finalAmount };
};

const releaseSeatService = async (movieBookingId) => {
  // 2. Handle Reselection: Release old seats if movieBookingId is provided
  let oldBooking = null;
  if (movieBookingId) {
    oldBooking = await MovieBooking.findById(movieBookingId);
    if(!oldBooking) throw {status:404, message:"Movie booking not found"}
    if (oldBooking.status === STATUS.HELD) {
      const oldSeats = oldBooking.seats.map((s) => s.seatCode);
      await Showtime.findByIdAndUpdate(
        oldBooking.showtimeId,
        {
          $set: { "seats.$[elem].status": STATUS.AVAILABLE },
        },
        {
          arrayFilters: [{ "elem.seatCode": { $in: oldSeats } }],
        },
      );
      return {deleted:true, message:"Release old seats successfully"}
    }
    return {deleted:false, message:"Movie booking is not in HELD status"}

  }

    return {deleted:false, message:"no movie booking Id"};
};

module.exports = {
  reserveMovieTicketsService,
  foodOrderService,
  paymentService,
  getBookingHistoryService,
  getAllBookingHistoryService,
  checkInService,
  addFoodToBookingService,
  cancelBookingService,
  cancelFoodBookingService,
  createPaymentUrlService,
  vnpayReturnService,
  getBookingByIdService,
  getBookingPriceService,
  checkoutAndPayService,
  releaseSeatService,
};
