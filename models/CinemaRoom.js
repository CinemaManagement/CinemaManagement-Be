const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const TYPES = require("../constraints/type");
const Schema = mongoose.Schema;

const CinemaRoomSchema = new Schema({
  roomName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [STATUS.ACTIVE, STATUS.MAINTENANCE],
    default: STATUS.ACTIVE,
  },
  seats: [
    {
      seatCode: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: Object.values(TYPES),
        default: TYPES.NORMAL,
      },
    },
  ],
});

module.exports = mongoose.model("CinemaRoom", CinemaRoomSchema);
