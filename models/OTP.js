const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OtpSchema = new Schema(
  {
    email: {
      type: String,
      require,
    },
    otp: {
      type: Number,
      require,
    },
    expire: {
      type: Date,
      require,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Otp", OtpSchema);
