const express = require("express");
const {
  getAllActiveMovies,
  addMovie,
  updateMovie,
  hideMovie,
  getAllMovies,
  getMovieById,
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
  /*  #swagger.parameters['body'] = {
        in: 'body',
        description: 'New movie data',
        schema: {
            title: "Movie Title",
            duration: 120,
            ageRestriction: 13,
            posterUrl: "http://url",
            trailerUrl: "http://url",
            revenueSharePercent: 50,
            category: ["Action"],
            description: "Some description here",
            director: [{ name: "Director Name", avatar: "Dir url"}],
            actors: [{ name: "Actor name", avatar: "Actor url"}],
            rate: 5,
            showingStatus: "Đang chiếu"
        }
} */
  verifyRoles(ROLE.MANAGER),
  checkRequiredFields(
    "title",
    "duration",
    "ageRestriction",
    "posterUrl",
    "trailerUrl",
    "revenueSharePercent",
    "description",
    "rate"
  ),
  addMovie,
);

router.route("/all").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get all movies for manager'
  verifyRoles(ROLE.MANAGER),
  getAllMovies,
);

router.route("/:id").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get movie by id'
  getMovieById,
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
