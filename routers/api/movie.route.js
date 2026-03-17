const express = require("express");
const {
  getAllActiveMovies,
  addMovie,
  updateMovie,
  hideMovie,
  getAllMovies,
} = require("../../controllers/movieController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const verifyJwt = require("../../middlewares/authMiddleware");
const router = express.Router();

// no need jwt
router.route("/").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get all active movies'
  getAllActiveMovies,
);

// need jwt
router.use(verifyJwt);
router.route("/").post(
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

// no need jwt
router.route("/all").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get all movies for manager'
  verifyRoles(ROLE.MANAGER),
  getAllMovies,
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
