const Movie = require("../models/Movie");
const STATUS = require("../constraints/status");

const getAllActiveMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ status: STATUS.ACTIVE });
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
      rate,
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
      rate,
      releaseDate,
      showingStatus,
      status: STATUS.ACTIVE,
    });
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
  getMovieById,
  updateMovie,
  hideMovie,
};
