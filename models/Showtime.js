const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const ShowtimeSchema = new Schema(
  {
    movieId: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [STATUS.ACTIVE, STATUS.CANCELLED, STATUS.FINISHED],
      default: STATUS.ACTIVE,
    },
    pricingRule: {
      NORMAL: { type: Number, required: true },
      VIP: { type: Number, required: true },
      COUPLE: { type: Number, required: true },
    },
    cinemaRoomId: {
      type: Schema.Types.ObjectId,
      ref: "CinemaRoom",
      required: true,
    },
    seats: [
      {
        seatId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        seatCode: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: [STATUS.AVAILABLE, STATUS.HELD, STATUS.SOLD],
          default: STATUS.AVAILABLE,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Showtime", ShowtimeSchema);
