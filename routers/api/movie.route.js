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
  .get(getAllActiveMovies)
  .post(
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
  .put(verifyRoles(ROLE.MANAGER), updateMovie)
  .delete(verifyRoles(ROLE.ADMIN, ROLE.MANAGER), hideMovie);

module.exports = router;
