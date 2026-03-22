const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const FoodSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["SINGLE", "COMBO"], required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    description: { type: String },
    status: { type: String, default: STATUS.ACTIVE },
    items: [
      {
        name: { type: String },
        quantity: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Food", FoodSchema);
