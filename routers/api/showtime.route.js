const express = require("express");
const {
  getAllShowtimes,
  addShowtime,
  getShowtimeSeats,
  updateSeatStatus,
  updateShowtimeStatus,
} = require("../../controllers/showtimeController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const router = express.Router();

router
  .route("/")
  .get(
    verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA, ROLE.MANAGER),
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Get all showtimes'
    // #swagger.security = [{ "bearerAuth": [] }]
    getAllShowtimes
  )
  .post(
    verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
    checkRequiredFields(
      "movieId",
      "startTime",
      "endTime",
      "pricingRule",
      "cinemaRoomId"
    ),
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Create a new showtime'
    // #swagger.security = [{ "bearerAuth": [] }]
    addShowtime
  );

router.route("/:id/seats").get(
  verifyRoles(ROLE.MANAGER, ROLE.CINEMA, ROLE.CUSTOMER),
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Get all seats of a showtime'
  // #swagger.security = [{ "bearerAuth": [] }]
  getShowtimeSeats
);

router.route("/:showTimeId/seats/:seatId").patch(
  verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
  checkRequiredFields("status"),
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Update seat status in a showtime'
  // #swagger.security = [{ "bearerAuth": [] }]
  updateSeatStatus
);

router.route("/:id").patch(
  verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
  checkRequiredFields("status"),
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Update showtime status'
  // #swagger.security = [{ "bearerAuth": [] }]
  updateShowtimeStatus
);

module.exports = router;
