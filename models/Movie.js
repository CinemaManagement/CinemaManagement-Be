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
    status: { type: String, default: STATUS.ACTIVE },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Movie", MovieSchema);
