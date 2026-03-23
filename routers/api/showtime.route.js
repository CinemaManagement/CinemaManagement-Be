const express = require("express");
const {
  getAllShowtimes,
  getShowtimeById,
  getShowtimesByMovie,
  addShowtime,
  updateShowtime,
  deleteShowtime,
  getShowtimeSeats,
  updateSeatStatus,
  updateShowtimeStatus,
  getShowtimeByRoomId,
} = require("../../controllers/showtimeController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const verifyJwt = require("../../middlewares/authMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const router = express.Router();

router
  .route("/")
  .get(
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Get all showtimes (public)'
    getAllShowtimes,
  )
  .post(
    verifyJwt,
    verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
    checkRequiredFields("movieId", "startTime", "pricingRule", "cinemaRoomId"),
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Create a new showtime (endTime auto-computed from movie duration)'
    // #swagger.security = [{ "bearerAuth": [] }]
    addShowtime,
  );

router.route("/movie/:movieId").get(
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Get all showtimes by movieId (public)'
  getShowtimesByMovie,
);
router.route("/room/:roomId").get(
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Get all showtimes by roomId (public)'
  getShowtimeByRoomId,
);

router.route("/:id/seats").get(
  verifyJwt,
  verifyRoles(ROLE.MANAGER, ROLE.CINEMA, ROLE.CUSTOMER),
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Get all seats of a showtime'
  // #swagger.security = [{ "bearerAuth": [] }]
  getShowtimeSeats,
);

router.route("/:showTimeId/seats/:seatCode").patch(
  verifyJwt,
  verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
  checkRequiredFields("status"),
  // #swagger.tags = ['Showtimes']
  // #swagger.summary = 'Update seat status in a showtime using seatCode'
  // #swagger.security = [{ "bearerAuth": [] }]
  updateSeatStatus,
);

router
  .route("/:id")
  .get(
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Get a showtime by id (public)'
    getShowtimeById,
  )
  .patch(
    verifyJwt,
    verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Update a showtime (partial)'
    // #swagger.security = [{ "bearerAuth": [] }]
    updateShowtime,
  )
  .delete(
    verifyJwt,
    verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
    // #swagger.tags = ['Showtimes']
    // #swagger.summary = 'Delete a showtime'
    // #swagger.security = [{ "bearerAuth": [] }]
    deleteShowtime,
  );

module.exports = router;
