const express = require("express");
const {
  getAllActiveMovies,
  addMovie,
  updateMovie,
  hideMovie,
} = require("../../controllers/movieController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const router = express.Router();

router
  .route("/")
  .get(
    // #swagger.tags = ['Movie']
    // #swagger.summary = 'Get all active movies'
    getAllActiveMovies,
  )
  .post(
    // #swagger.tags = ['Movie']
    // #swagger.summary = 'Add a new movie'
    // #swagger.security = [{ "bearerAuth": [] }]
    verifyRoles(ROLE.MANAGER),
    checkRequiredFields(
      "title",
      "duration",
      "ageRestriction",
      "posterUrl",
      "trailerUrl",
      "revenueSharePercent",
    ),
    addMovie,
  );

router
  .route("/:id")
  .put(
    // #swagger.tags = ['Movie']
    // #swagger.summary = 'Update movie details'
    // #swagger.security = [{ "bearerAuth": [] }]
    verifyRoles(ROLE.MANAGER),
    updateMovie,
  )
  .delete(
    // #swagger.tags = ['Movie']
    // #swagger.summary = 'Hide (soft delete) a movie'
    // #swagger.security = [{ "bearerAuth": [] }]
    verifyRoles(ROLE.ADMIN, ROLE.MANAGER),
    hideMovie,
  );

module.exports = router;
