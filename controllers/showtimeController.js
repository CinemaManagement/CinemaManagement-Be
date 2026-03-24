const Showtime = require("../models/Showtime");
const CinemaRoom = require("../models/CinemaRoom");
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

const addShowtime = async (req, res) => {
  try {
    const { movieId, startTime, pricingRule, cinemaRoomId } = req.body;

    // Fetch movie to get duration
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found!" });
    }

    if (movie.showingStatus !== STATUS.SHOWING) {
      return res.status(400).json({ message: "Movie is not showing!" });
    }

    // Compute endTime from startTime + duration (minutes)
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + movie.duration * 60 * 1000);

    // Fetch CinemaRoom to get seats
    const room = await CinemaRoom.findById(cinemaRoomId);
    if (!room) {
      return res.status(404).json({ message: "Cinema room not found!" });
    }

    // Initialize seats for the showtime based on the room's seats
    const seats = room.seats.map((seat) => ({
      seatId: seat._id,
      seatCode: seat.seatCode,
      price: pricingRule[seat.type] || pricingRule.NORMAL,
      status: STATUS.AVAILABLE,
    }));

    const newShowtime = await Showtime.create({
      movieId,
      startTime,
      endTime,
      pricingRule,
      cinemaRoomId,
      seats,
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

const updateSeatStatus = async (req, res) => {
  try {
    const { showTimeId, seatId } = req.params;
    const { status } = req.body;

    if (![STATUS.AVAILABLE, STATUS.HELD, STATUS.SOLD].includes(status)) {
      return res.status(400).json({ message: "Invalid seat status!" });
    }

    const showtime = await Showtime.findOneAndUpdate(
      { _id: showTimeId, "seats.seatId": seatId },
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

    if (![STATUS.ACTIVE, STATUS.CANCELLED, STATUS.FINISHED].includes(status)) {
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
  addShowtime,
  getShowtimeSeats,
  updateSeatStatus,
  updateShowtimeStatus,
};
