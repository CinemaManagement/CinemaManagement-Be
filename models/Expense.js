const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ExpenseSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["SALARY", "UTILITY", "MAINTENANCE", "RENT", "MARKETING", "OTHER"],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", ExpenseSchema);
