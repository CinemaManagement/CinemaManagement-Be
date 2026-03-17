const mongoose = require("mongoose");
const { ROLE } = require("../constraints/role");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      require,
      unique: true,
    },
    password: {
      type: String,
      require,
    },
    role: {
      type: String,
      default: ROLE.CUSTOMER,
    },
    fullName: {
      type: String,
      require,
    },
    status: {
      type: String,
      default: STATUS.ACTIVE,
    },
    refreshToken: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
