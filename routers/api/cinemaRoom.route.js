const express = require("express");
const {
  getAllCinemaRooms,
  addCinemaRoom,
  updateCinemaRoomStatus,
} = require("../../controllers/cinemaRoomController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const router = express.Router();

router.route("/").get(
  verifyRoles(ROLE.MANAGER, ROLE.CINEMA),
  // #swagger.tags = ['CinemaRooms']
  // #swagger.summary = 'Get all cinema rooms'
  // #swagger.security = [{ "bearerAuth": [] }]
  getAllCinemaRooms,
);

router.route("/").post(
  verifyRoles(ROLE.MANAGER),
  checkRequiredFields("roomName"),
  addCinemaRoom,
  // #swagger.tags = ['CinemaRooms']
  // #swagger.summary = 'Create a new cinema room'
  // #swagger.security = [{ "bearerAuth": [] }]
);

router.route("/:id/seats").patch(
  verifyRoles(ROLE.ADMIN, ROLE.MANAGER),
  checkRequiredFields("status"),
  updateCinemaRoomStatus,
  // #swagger.tags = ['CinemaRooms']
  // #swagger.summary = 'Update cinema room seats status'
  // #swagger.security = [{ "bearerAuth": [] }]
);

router.route("/:id/status").patch(
  verifyRoles(ROLE.ADMIN, ROLE.MANAGER),
  checkRequiredFields("status"),
  updateCinemaRoomStatus,
  // #swagger.tags = ['CinemaRooms']
  // #swagger.summary = 'Update cinema room status'
  // #swagger.security = [{ "bearerAuth": [] }]
);

module.exports = router;
