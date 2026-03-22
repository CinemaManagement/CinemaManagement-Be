const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const MovieBookingSchema = new Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    showtimeId: { type: Schema.Types.ObjectId, ref: "Showtime", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seats: [
      {
        seatCode: { type: String, required: true },
        type: { type: String, enum: ["NORMAL", "VIP", "COUPLE"], required: true },
        price: { type: Number, required: true },
        barcode: { type: String },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: STATUS.HELD },
    foodBookingId: { type: Schema.Types.ObjectId, ref: "FoodBooking" },
    payment: {
      method: { type: String, enum: ["CASH", "ONLINE"] },
      paidAt: { type: Date },
      transactionId: { type: String },
    },
    discountId: { type: Schema.Types.ObjectId, ref: "Discount" },
    expiredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MovieBooking", MovieBookingSchema);
