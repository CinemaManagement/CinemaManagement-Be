const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const FoodBookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["SINGLE", "COMBO"], required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        subtotal: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: STATUS.PENDING },
    payment: {
      method: { type: String },
      paidAt: { type: Date },
      transactionId: { type: String },
    },
    discountId: { type: Schema.Types.ObjectId, ref: "Discount" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FoodBooking", FoodBookingSchema);
