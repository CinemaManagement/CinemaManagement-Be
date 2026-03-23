const express = require("express");
const { getMoviesByShowingStatus } = require("../../controllers/movieController");
const router = express.Router();

router.route("/:showingStatus").get(
  // #swagger.tags = ['Movie']
  // #swagger.summary = 'Get movies by showing status'
  /*  #swagger.parameters['showingStatus'] = {
        in: 'path',
        description: 'Status of the movie (NOW_SHOWING, COMING_SOON)',
        required: true,
        type: 'string'
  } */
  getMoviesByShowingStatus,
);

module.exports = router;