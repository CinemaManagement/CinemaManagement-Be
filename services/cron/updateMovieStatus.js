const cron = require("node-cron");
const Movie = require("../../models/Movie");
const STATUS = require("../../constraints/status");

const updateMovieStatuses = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const movies = await Movie.find({
      releaseDate: { $exists: true },
      showingStatus: { $ne: STATUS.STOPPED },
    });

    for (const movie of movies) {
      const release = new Date(movie.releaseDate);
      release.setHours(0, 0, 0, 0);

      let newStatus = movie.showingStatus;
      if (today < release) {
        newStatus = STATUS.COMING_SOON;
      } else {
        newStatus = STATUS.SHOWING;
      }

      if (movie.showingStatus !== newStatus) {
        movie.showingStatus = newStatus;
        await movie.save();
      }
    }

    console.log("Movie status update completed.");
  } catch (error) {
    console.error("Error running movie status update:", error);
  }
};

cron.schedule("0 0 * * *", updateMovieStatuses);

const mongoose = require("mongoose");
if (mongoose.connection.readyState === 1) {
  updateMovieStatuses();
} else {
  mongoose.connection.once("connected", updateMovieStatuses);
}

module.exports = cron;
