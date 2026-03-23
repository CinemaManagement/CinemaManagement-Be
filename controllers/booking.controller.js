const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Discount = require("../models/Discount");
const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const crypto = require("crypto");
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
    const { method, transactionId, discountCode } = req.body;
    const { finalAmount, booking } = await paymentService(
      id,
      method,
      transactionId,
      discountCode,
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
    const { id } = req.params;
    const booking = await checkInService(id);

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
    res
      .status(200)
      .json({
        success: true,
        message: "Booking cancelled successfully",
        data: booking,
      });
  } catch (error) {
    console.error(error);
    res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};

const cancelFoodBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const foodBooking = await cancelFoodBookingService(id);
    res
      .status(200)
      .json({
        success: true,
        message: "Food booking cancelled successfully",
        data: foodBooking,
      });
  } catch (error) {
    console.error(error);
    res
      .status(error.status || 500)
      .json({
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
    res
      .status(error.status || 500)
      .json({
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
    res
      .status(error.status || 500)
      .json({
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
    res
      .status(error.status || 500)
      .json({
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
    res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
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
};
