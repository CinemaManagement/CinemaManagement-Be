const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Discount = require("../models/Discount");
const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const crypto = require("crypto");
require("dotenv").config();
const {
  reserveMovieTicketsService,
  foodOrderService,
  getBookingHistoryService,
  checkInService,
  paymentService,
  addFoodToBookingService,
  cancelBookingService,
  cancelFoodBookingService,
  getAllBookingHistoryService,
  createPaymentUrlService,
  vnpayReturnService,
  getBookingByIdService,
  getBookingPriceService,
  checkoutAndPayService,
  releaseSeatService,
} = require("../services/booking.services");
const { search } = require("../routers/redisTest.route");

const reserveMovieTickets = async (req, res) => {
  try {
    const { showtimeId, movieBookingId, seats } = req.body; // seats: [seatCode]
    const userId = req.userId;

    const newBooking = await reserveMovieTicketsService(
      showtimeId,
      movieBookingId,
      seats,
      userId,
    );

    res.status(201).json({ success: true, data: newBooking });
  } catch (error) {
    res.status(error.status).json({ success: false, message: error.message });
  }
};

const orderFood = async (req, res) => {
  try {
    const { items } = req.body; // items: [{ foodId, quantity }]
    const userId = req.userId;

    const newFoodBooking = await foodOrderService(items, userId);

    res.status(201).json({ success: true, data: newFoodBooking });
  } catch (error) {
    res.status(error.status).json({ success: false, message: error.message });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, transactionId } = req.body;
    const { finalAmount, booking } = await paymentService(
      id,
      method,
      transactionId,
    );
    res
      .status(200)
      .json({ message: "Payment confirmed", booking, finalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const { rawMovieBookingHistory, foodBookingHistory } =
      await getBookingHistoryService(userId);

    res.status(200).json({
      rawMovieBookingHistory,
      foodBookingHistory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllBookingHistory = async (req, res) => {
  try {
    const { rawMovieBookingHistory, foodBookingHistory } =
      await getAllBookingHistoryService();

    res.status(200).json({
      movieBookingHistory: rawMovieBookingHistory,
      foodBookingHistory: foodBookingHistory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const checkIn = async (req, res) => {
  try {
    const { bookingCode } = req.params;
    const booking = await checkInService(bookingCode);

    res.status(200).json({ message: "Checked in successfully", booking });
  } catch (error) {
    console.error(error);
    res.status(error.status).json({ success: false, message: error.message });
  }
};

const addFoodToBooking = async (req, res) => {
  try {
    const { movieBookingId, foodBookingId } = req.body;
    const updatedMovieBooking = await addFoodToBookingService(
      movieBookingId,
      foodBookingId,
    );
    return res.status(200).json({ success: true, data: updatedMovieBooking });
  } catch (error) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await cancelBookingService(id);
    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const cancelFoodBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const foodBooking = await cancelFoodBookingService(id);
    res.status(200).json({
      success: true,
      message: "Food booking cancelled successfully",
      data: foodBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const createVnpayPaymentUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountCode } = req.body;
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip;

    const { paymentUrl, finalAmount } = await createPaymentUrlService(
      id,
      discountCode,
      ipAddr,
    );

    res.status(200).json({ success: true, paymentUrl, finalAmount });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const vnpayReturn = async (req, res) => {
  try {
    const result = await vnpayReturnService(req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await getBookingByIdService(id);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const checkoutAndPay = async (req, res) => {
  try {
    const { id } = req.params;
    const { foodItems, discountCode } = req.body;
    const userId = req.userId;
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip;

    const { paymentUrl, finalAmount } = await checkoutAndPayService(
      id,
      foodItems,
      discountCode,
      ipAddr,
      userId,
    );

    res.status(200).json({ success: true, paymentUrl, finalAmount });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getBookingPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await getBookingPriceService(id);
    res.status(200).json({ success: true, price });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const releaseSeat = async (req, res) => {
  try {
    const { movieBookingId } = req.body;
    const result = await releaseSeatService(movieBookingId);
    const booking = await getBookingByIdService(movieBookingId);
    return res.status(200).json({
      deleted: result.deleted,
      message: result.message,
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      deleted: false,
      message: error.message || "Internal server error",
    });
  }
};

const getVietQRInfo = async (req, res) => {
  try {
    const { movieBookingId } = req.params;
    const { foodItems, discountCode } = req.body;
    const userId = req.userId;
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
          const sSeat = showtime.seats.find(
            (s) => s.seatCode === bSeat.seatCode,
          );
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
      if (
        existingFoodBooking &&
        existingFoodBooking.status === STATUS.PENDING
      ) {
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

    // 4. Apply Discount if provided (similar to VNPay flow)
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

      // Save to booking (getBookingPriceService will use this)
      booking.discountId = discount._id;
      await booking.save();
    }

    const finalAmount = await getBookingPriceService(movieBookingId);

    res.status(200).json({
      success: true,
      bankBin: process.env.VIETQR_BANK_BIN,
      accountNumber: process.env.VIETQR_ACCOUNT,
      accountName: process.env.VIETQR_ACCOUNT_NAME ?? "CINEMA MANAGEMENT",
      amount: finalAmount,
      description: `Booking payment for booking ID: ${movieBookingId}`,
      bookingId: movieBookingId,
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};
module.exports = {
  reserveMovieTickets,
  orderFood,
  confirmPayment,
  getBookingHistory,
  getAllBookingHistory,
  checkIn,
  addFoodToBooking,
  cancelBooking,
  cancelFoodBooking,
  createVnpayPaymentUrl,
  vnpayReturn,
  getBookingById,
  getBookingPrice,
  checkoutAndPay,
  releaseSeat,
  getVietQRInfo,
};
