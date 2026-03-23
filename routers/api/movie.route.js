const express = require("express");
const {
  getAllActiveMovies,
  addMovie,
  updateMovie,
  hideMovie,
  getAllMovies,
  getMovieById,
  rateMovie,
  getUserMovieRating,
} = require("../../controllers/movieController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const verifyJwt = require("../../middlewares/authMiddleware");
const router = express.Router();

router.route("/all").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get all movies for manager'
  verifyJwt,
  verifyRoles(ROLE.MANAGER),
  getAllMovies,
);

// no need jwt
router.route("/").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get all active movies'
  getAllActiveMovies,
);

router.route("/:id").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get movie by id'
  getMovieById,
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
    "rate",
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

router
  .route("/:id/rate")
  .get(
    // #swagger.tags = ['Movie']
    // #swagger.summary = 'Get current user rate for a movie'
    // #swagger.security = [{ "bearerAuth": [] }]
    getUserMovieRating,
  )
  .post(
    // #swagger.tags = ['Movie']
    // #swagger.summary = 'Rate a movie'
    // #swagger.security = [{ "bearerAuth": [] }]
    /*  #swagger.parameters['score'] = {
          in: 'body',
          description: 'Movie score (1-5)',
          schema: { score: 5 }
    } */
    rateMovie,
  );

module.exports = router;
