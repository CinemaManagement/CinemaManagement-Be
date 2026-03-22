const Movie = require("../models/Movie");
const { ROLE } = require("../constraints/role");
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

const addMovie = async (req, res) => {
  try {
    const {
      title,
      duration,
      ageRestriction,
      posterUrl,
      trailerUrl,
      revenueSharePercent,
    } = req.body;
    const movie = await Movie.create({
      title,
      duration,
      ageRestriction,
      posterUrl,
      trailerUrl,
      revenueSharePercent,
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
    const movie = await Movie.findByIdAndUpdate(id, updateData, { new: true });
    if (!movie) {
      return res
        .status(404)
        .json({ message: `Not found movie with id ${id}!` });
    }
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

module.exports = {
  getAllActiveMovies,
  addMovie,
  getAllMovies,
  updateMovie,
  hideMovie,
};
