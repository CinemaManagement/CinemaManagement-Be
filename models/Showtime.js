const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const TYPES = require("../constraints/type");
const Schema = mongoose.Schema;

const ShowtimeSchema = new Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
    },
    startTime: {
      type: Date,
      require: true,
    },
    endTime: {
      type: Date,
      require: true,
    },
    status: {
      type: String,
      enum: [STATUS.ACTIVE, STATUS.CANCELLED, STATUS.FINISHED],
      default: STATUS.ACTIVE,
    },
    pricingRule: {
      NORMAL: {
        type: Number,
      },
      VIP: {
        type: Number,
      },
      COUPLE: {
        type: Number,
      },
    },
    seats: [{}],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Showtime", ShowtimeSchema);
