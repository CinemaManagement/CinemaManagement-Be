const express = require("express");
const router = express.Router();
const bookingController = require("../../controllers/booking.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");

// Booking specific endpoints
router.post("/movie", verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA), bookingController.reserveMovieTickets);

router.post("/food", verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA), bookingController.orderFood);

router.post("/:id/pay", verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA), bookingController.confirmPayment);

router.get("/history", verifyRoles(ROLE.CUSTOMER), bookingController.getBookingHistory);

router.patch("/:id/checkin", verifyRoles(ROLE.CINEMA), bookingController.checkIn);

module.exports = router;
