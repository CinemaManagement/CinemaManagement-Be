const CinemaRoom = require("../models/CinemaRoom");
const STATUS = require("../constraints/status");

const getAllCinemaRooms = async (req, res) => {
  try {
    const rooms = await CinemaRoom.find();
    res.status(200).json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const getCinemaRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await CinemaRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: `Not found room with id ${id}!` });
    }
    res.status(200).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const addCinemaRoom = async (req, res) => {
  try {
    const { roomName, seats } = req.body;
    const newRoom = await CinemaRoom.create({
      roomName,
      seats: seats || { NORMAL: [], VIP: [], COUPLE: [] },
    });
    res.status(201).json(newRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateCinemaRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomName, status, seats } = req.body;
    const room = await CinemaRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: `Not found room with id ${id}!` });
    }

    const updateData = {};
    if (roomName) updateData.roomName = roomName;
    if (status) updateData.status = status;
    if (seats) updateData.seats = seats;

    const updatedRoom = await CinemaRoom.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const deleteCinemaRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await CinemaRoom.findByIdAndDelete(id);
    if (!room) {
      return res.status(404).json({ message: `Not found room with id ${id}!` });
    }
    res.status(200).json({ message: "Delete room successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateCinemaRoomStatus = async (req, res) => {
  try {
    const id = req.params?.id;
    const { status } = req.body;
    const room = await CinemaRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: `Not found room with id ${id}!` });
    }

    if (![STATUS.ACTIVE, STATUS.MAINTENANCE].includes(status)) {
      return res.status(400).json({ message: `Invalid status!` });
    }

    await CinemaRoom.updateOne(
      { _id: id },
      {
        $set: {
          status: status,
        },
      },
    );
    res
      .status(200)
      .json({ message: `Update room ${room.roomName} status successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

module.exports = {
  getAllCinemaRooms,
  getCinemaRoomById,
  addCinemaRoom,
  updateCinemaRoom,
  deleteCinemaRoom,
  updateCinemaRoomStatus,
};
