const Showtime = require("../models/Showtime");
const CinemaRoom = require("../models/CinemaRoom");
const Movie = require("../models/Movie");
const STATUS = require("../constraints/status");
const { ROLE } = require("../constraints/role");

const getAllShowtimes = async (req, res) => {
  try {
    const now = new Date();
    const query = {};
    
    // Privileged roles see all showtimes; others (CUSTOMER) see only ACTIVE shows
    const isPrivileged = [ROLE.MANAGER, ROLE.CINEMA, ROLE.ADMIN].includes(req.role);
    if (!isPrivileged) {
      query.status = STATUS.ACTIVE;
      query.startTime = { $gt: now };
    }
    
    console.log(`[getAllShowtimes] UserRole: ${req.role}, Query:`, JSON.stringify(query));


    const showtimes = await Showtime.find(query)
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
    const now = new Date();
    const query = { _id: id };
    
    const isPrivileged = [ROLE.MANAGER, ROLE.CINEMA, ROLE.ADMIN].includes(req.role);
    if (!isPrivileged) {
      query.status = STATUS.ACTIVE;
      query.startTime = { $gt: now };
    }

    console.log(`[getShowtimeById] UserRole: ${req.role}, Query:`, JSON.stringify(query));


    const showtime = await Showtime.findOne(query)
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

const getShowtimeByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;
    const now = new Date();
    const query = { cinemaRoomId: roomId };
    
    const isPrivileged = [ROLE.MANAGER, ROLE.CINEMA, ROLE.ADMIN].includes(req.role);
    if (!isPrivileged) {
      query.status = STATUS.ACTIVE;
      query.startTime = { $gt: now };
    }

    console.log(`[getShowtimeByRoomId] UserRole: ${req.role}, Query:`, JSON.stringify(query));


    const showtime = await Showtime.find(query)
      .select("movieId startTime endTime status")
      .sort({ startTime: 1 });
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
    const now = new Date();
    const query = { movieId };
    
    const isPrivileged = [ROLE.MANAGER, ROLE.CINEMA, ROLE.ADMIN].includes(req.role);
    if (!isPrivileged) {
      query.status = STATUS.ACTIVE;
      query.startTime = { $gt: now };
    }

    console.log(`[getShowtimesByMovie] UserRole: ${req.role}, Query:`, JSON.stringify(query));


    const showtimes = await Showtime.find(query)
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
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (startDate < oneHourFromNow) {
      return res.status(400).json({
        message: "Start time must be at least 1 hour from now!",
      });
    }

    const endDate = new Date(startDate.getTime() + movie.duration * 60 * 1000);

    // Fetch CinemaRoom to get seats
    const room = await CinemaRoom.findById(cinemaRoomId);
    if (!room) {
      return res.status(404).json({ message: "Cinema room not found!" });
    }

    // Check for time overlap with existing showtimes in the same room
    const overlapping = await Showtime.findOne({
      cinemaRoomId,
      status: { $nin: [STATUS.CANCELLED, STATUS.FINISHED] },
      $or: [
        // New showtime starts during an existing one
        { startTime: { $lt: endDate }, endTime: { $gt: startDate } },
      ],
    });

    if (overlapping) {
      return res.status(409).json({
        message:
          "This time slot overlaps with an existing showtime in the same room!",
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

    // 1. Check if showtime has already started
    const now = new Date();
    if (showtime.startTime <= now) {
      return res.status(400).json({
        message: "Cannot update showtime after it has started!",
      });
    }

    // 2. Check if there are any existing bookings
    const hasBookings = showtime.seats.some(
      (seat) => seat.status !== STATUS.AVAILABLE,
    );
    if (hasBookings) {
      return res.status(400).json({
        message: "Cannot update showtime because some seats are already booked!",
      });
    }

    const updateData = {};
    let shouldCheckOverlap = false;

    if (status) updateData.status = status;
    if (pricingRule) updateData.pricingRule = pricingRule;

    // Handle time/movie/room changes which require re-validation
    let currentMovieId = movieId || showtime.movieId;
    let currentStartTime = startTime ? new Date(startTime) : showtime.startTime;
    let currentCinemaRoomId = cinemaRoomId || showtime.cinemaRoomId;

    if (startTime) {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      if (new Date(startTime) < oneHourFromNow) {
        return res.status(400).json({
          message: "New start time must be at least 1 hour from now!",
        });
      }
    }

    if (movieId || startTime || cinemaRoomId) {
      shouldCheckOverlap = true;
      const movie = await Movie.findById(currentMovieId);
      if (!movie) return res.status(404).json({ message: "Movie not found!" });

      updateData.movieId = currentMovieId;
      updateData.startTime = currentStartTime;
      updateData.cinemaRoomId = currentCinemaRoomId;
      updateData.endTime = new Date(
        currentStartTime.getTime() + movie.duration * 60 * 1000,
      );
    }

    if (shouldCheckOverlap) {
      const overlapping = await Showtime.findOne({
        _id: { $ne: id },
        cinemaRoomId: currentCinemaRoomId,
        status: { $nin: [STATUS.CANCELLED, STATUS.FINISHED] },
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
      { new: true },
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
    const showtime = await Showtime.findById(id);

    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }

    // 1. Check if showtime has already started
    const now = new Date();
    if (showtime.startTime <= now) {
      return res.status(400).json({
        message: "Cannot delete showtime after it has started!",
      });
    }

    // 2. Check if there are any existing bookings
    const hasBookings = showtime.seats.some(
      (seat) => seat.status !== STATUS.AVAILABLE,
    );
    if (hasBookings) {
      return res.status(400).json({
        message: "Cannot delete showtime because some seats are already booked!",
      });
    }

    await Showtime.findByIdAndDelete(id);
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

    const showtime = await Showtime.findById(showTimeId);
    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found!" });
    }

    // Block booking if showtime has started
    const now = new Date();
    if (showtime.startTime <= now) {
      return res.status(400).json({
        message: "Cannot book or change seats after the showtime has started!",
      });
    }

    const updatedShowtime = await Showtime.findOneAndUpdate(
      { _id: showTimeId, "seats.seatCode": seatCode },
      {
        $set: {
          "seats.$.status": status,
        },
      },
      { new: true },
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

    if (![STATUS.ACTIVE, STATUS.SHOWING, STATUS.CANCELLED, STATUS.FINISHED].includes(status)) {
      return res.status(400).json({ message: "Invalid showtime status!" });
    }

    const showtime = await Showtime.findByIdAndUpdate(
      id,
      { status },
      { new: true },
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
  getShowtimeByRoomId,
};
