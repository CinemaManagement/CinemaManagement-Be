const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const DiscountSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["MOVIE", "SHOWTIME", "ONE_TIME_CODE"], required: true },
    discountType: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    value: { type: Number, required: true },
    movieId: { type: Schema.Types.ObjectId, ref: "Movie" },
    showtimeId: { type: Schema.Types.ObjectId, ref: "Showtime" },
    code: { type: String, unique: true, sparse: true },
    usageLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, default: STATUS.ACTIVE },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discount", DiscountSchema);
