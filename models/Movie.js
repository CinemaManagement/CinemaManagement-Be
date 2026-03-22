const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const MovieSchema = new Schema(
  {
    title: { type: String, require },
    duration: { type: Number, require },
    ageRestriction: { type: Number, require },
    posterUrl: { type: String, require },
    trailerUrl: { type: String, require },
    revenueSharePercent: { type: Number, require },
    category: [{ type: String }],
    description: { type: String },
    director: [{
      name: { type: String },
      avatar: { type: String }
    }],
    actors: [{
      name: { type: String },
      avatar: { type: String }
    }],
    rate: { type: Number },
    showingStatus: {
      type: String,
      enum: [STATUS.SHOWING, STATUS.COMING_SOON, STATUS.STOPPED],
      default: STATUS.SHOWING
    },
    status: { type: String, default: STATUS.ACTIVE },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Movie", MovieSchema);
