const Movie = require("../models/Movie");
const STATUS = require("../constraints/status");
const redisClient = require("../config/redis");

const updateCacheMovie = async (newMovies) => {
  try {
    await redisClient.set("active-movies", JSON.stringify(newMovies), {
      EX: 60 * 60 * 24,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Error when update cache movie");
  }
};

const getAllActiveMovies = async (req, res) => {
  try {
    const cacheMovie = await redisClient.get("active-movies");
    if (cacheMovie) {
      return res.status(200).json(JSON.parse(cacheMovie));
    }
    const movies = await Movie.find({ status: STATUS.ACTIVE });
    await updateCacheMovie(movies);
    res.status(200).json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getAllMovies = async (req, res) => {
  try {
    const movies = await Movie.find();
    res.status(200).json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findById(id);
    if (!movie) {
      return res
        .status(404)
        .json({ message: `Not found movie with id ${id}!` });
    }
    res.status(200).json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const addMovie = async (req, res) => {
  try {
    const {
      title,
      duration,
      ageRestriction,
      posterUrl,
      trailerUrl,
      revenueSharePercent,
      category,
      description,
      director,
      actors,
      releaseDate,
      showingStatus,
    } = req.body;
    const movie = await Movie.create({
      title,
      duration,
      ageRestriction,
      posterUrl,
      trailerUrl,
      revenueSharePercent,
      category,
      description,
      director,
      actors,
      releaseDate,
      showingStatus,
      status: STATUS.ACTIVE,
    });
    const movies = await Movie.find({ status: STATUS.ACTIVE });
    await updateCacheMovie(movies);
    res.status(201).json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const movie = await Movie.findById(id);
    if (!movie) {
      return res
        .status(404)
        .json({ message: `Not found movie with id ${id}!` });
    }
    Object.assign(movie, updateData);
    await movie.save();
    const movies = await Movie.find({ status: STATUS.ACTIVE });
    await updateCacheMovie(movies);
    res.status(200).json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const hideMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByIdAndUpdate(
      id,
      { status: STATUS.HIDDEN },
      { new: true },
    );
    if (!movie) {
      return res
        .status(404)
        .json({ message: `Not found movie with id ${id}!` });
    }
    const movies = await Movie.find({ status: STATUS.ACTIVE });
    await updateCacheMovie(movies);
    res
      .status(200)
      .json({ message: `Movie ${movie.title} hidden successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const rateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const { userId } = req;

    if (!score || score < 1 || score > 5) {
      return res
        .status(400)
        .json({ message: "Score must be between 1 and 5." });
    }

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    if (!movie.ratings) {
      movie.ratings = [];
    }

    const existingRatingIndex = movie.ratings.findIndex(
      (r) => r.userId?.toString() === userId.toString(),
    );

    if (existingRatingIndex > -1) {
      movie.ratings[existingRatingIndex].score = score;
    } else {
      movie.ratings.push({ userId, score });
    }

    const totalScore = movie.ratings.reduce((sum, r) => sum + r.score, 0);
    movie.rate = (totalScore / movie.ratings.length).toFixed(1);

    await movie.save();
    res.status(200).json({
      message: "Rating updated successfully",
      rate: movie.rate,
      totalRatings: movie.ratings.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getMoviesByShowingStatus = async (req, res) => {
  try {
    const { showingStatus } = req.params;
    const movies = await Movie.find({
      status: STATUS.ACTIVE,
      showingStatus: showingStatus,
    });
    res.status(200).json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getUserMovieRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    if (!movie.ratings) {
      return res.status(200).json({ score: 0 });
    }

    const userRating = movie.ratings.find(
      (r) => r.userId?.toString() === userId.toString()
    );

    res.status(200).json({ score: userRating ? userRating.score : 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

module.exports = {
  getAllActiveMovies,
  addMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  hideMovie,
  rateMovie,
  getMoviesByShowingStatus,
  getUserMovieRating,
};
