const Showtime = require("../models/Showtime");
const CinemaRoom = require("../models/CinemaRoom");
const Movie = require("../models/Movie");
const STATUS = require("../constraints/status");

const getAllShowtimes = async (req, res) => {
  try {
    const showtimes = await Showtime.find()
      .populate("movieId")
      .populate("cinemaRoomId");
    res.status(200).json(showtimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getShowtimeById = async (req, res) => {
  try {
    const { id } = req.params;
    const showtime = await Showtime.findById(id)
      .populate("movieId")
      .populate("cinemaRoomId");
    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }
    res.status(200).json(showtime);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getShowtimesByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    const showtimes = await Showtime.find({ movieId })
      .populate("movieId")
      .populate("cinemaRoomId")
      .sort({ startTime: 1 });
    res.status(200).json(showtimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const addShowtime = async (req, res) => {
  try {
    const { movieId, startTime, pricingRule, cinemaRoomId } = req.body;

    // Fetch movie to get duration
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found!" });
    }

    // Compute endTime from startTime + duration (minutes)
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + movie.duration * 60 * 1000);

    // Fetch CinemaRoom to get seats
    const room = await CinemaRoom.findById(cinemaRoomId);
    if (!room) {
      return res.status(404).json({ message: "Cinema room not found!" });
    }

    // Check for time overlap with existing showtimes in the same room
    const overlapping = await Showtime.findOne({
      cinemaRoomId,
      status: { $ne: STATUS.CANCELLED },
      $or: [
        // New showtime starts during an existing one
        { startTime: { $lt: endDate }, endTime: { $gt: startDate } },
      ],
    });

    if (overlapping) {
      return res.status(409).json({
        message: "This time slot overlaps with an existing showtime in the same room!",
        conflictWith: {
          id: overlapping._id,
          startTime: overlapping.startTime,
          endTime: overlapping.endTime,
        },
      });
    }

    // Initialize seats for the showtime based on the room's seats object
    const showtimeSeats = [];
    const seatTypes = ["NORMAL", "VIP", "COUPLE"];

    seatTypes.forEach((type) => {
      if (room.seats[type] && Array.isArray(room.seats[type])) {
        room.seats[type].forEach((seatCode) => {
          showtimeSeats.push({
            seatCode,
            price: pricingRule[type] || pricingRule.NORMAL,
            status: STATUS.AVAILABLE,
          });
        });
      }
    });

    const newShowtime = await Showtime.create({
      movieId,
      startTime: startDate,
      endTime: endDate,
      pricingRule,
      cinemaRoomId,
      seats: showtimeSeats,
    });

    res.status(201).json(newShowtime);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getShowtimeSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const showtime = await Showtime.findById(id).select("seats");
    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }
    res.status(200).json(showtime.seats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const { movieId, startTime, pricingRule, cinemaRoomId, status } = req.body;

    const showtime = await Showtime.findById(id);
    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }

    const updateData = {};
    let shouldCheckOverlap = false;

    if (status) updateData.status = status;
    if (pricingRule) updateData.pricingRule = pricingRule;

    // Handle time/movie/room changes which require re-validation
    let currentMovieId = movieId || showtime.movieId;
    let currentStartTime = startTime ? new Date(startTime) : showtime.startTime;
    let currentCinemaRoomId = cinemaRoomId || showtime.cinemaRoomId;

    if (movieId || startTime || cinemaRoomId) {
      shouldCheckOverlap = true;
      const movie = await Movie.findById(currentMovieId);
      if (!movie) return res.status(404).json({ message: "Movie not found!" });

      updateData.movieId = currentMovieId;
      updateData.startTime = currentStartTime;
      updateData.cinemaRoomId = currentCinemaRoomId;
      updateData.endTime = new Date(
        currentStartTime.getTime() + movie.duration * 60 * 1000
      );
    }

    if (shouldCheckOverlap) {
      const overlapping = await Showtime.findOne({
        _id: { $ne: id },
        cinemaRoomId: currentCinemaRoomId,
        status: { $ne: STATUS.CANCELLED },
        startTime: { $lt: updateData.endTime || showtime.endTime },
        endTime: { $gt: updateData.startTime || showtime.startTime },
      });

      if (overlapping) {
        return res.status(409).json({
          message: "Updated time slot overlaps with an existing showtime!",
          conflictWith: {
            id: overlapping._id,
            startTime: overlapping.startTime,
            endTime: overlapping.endTime,
          },
        });
      }
    }

    const updatedShowtime = await Showtime.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    res.status(200).json(updatedShowtime);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const deleteShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const showtime = await Showtime.findByIdAndDelete(id);
    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }
    res.status(200).json({ message: "Delete showtime successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateSeatStatus = async (req, res) => {
  try {
    const { showTimeId, seatCode } = req.params;
    const { status } = req.body;

    if (![STATUS.AVAILABLE, STATUS.HELD, STATUS.SOLD].includes(status)) {
      return res.status(400).json({ message: "Invalid seat status!" });
    }

    const showtime = await Showtime.findOneAndUpdate(
      { _id: showTimeId, "seats.seatCode": seatCode },
      {
        $set: {
          "seats.$.status": status,
        },
      },
      { new: true }
    );

    if (!showtime) {
      return res.status(404).json({ message: "Showtime or seat not found!" });
    }

    res.status(200).json({ message: "Update seat status successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateShowtimeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (![STATUS.ACTIVE, STATUS.CANCELLED, STATUS.FINISHED].includes(status)) {
      return res.status(400).json({ message: "Invalid showtime status!" });
    }

    const showtime = await Showtime.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }

    res.status(200).json({ message: "Update showtime status successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

module.exports = {
  getAllShowtimes,
  getShowtimeById,
  getShowtimesByMovie,
  addShowtime,
  updateShowtime,
  deleteShowtime,
  getShowtimeSeats,
  updateSeatStatus,
  updateShowtimeStatus,
};
