const { Schema, default: mongoose } = require("mongoose");

const RoleSchema = new Schema(
  {
    key: {
      require,
      unique: true,
      type: Number,
    },
    name: {
      require: true,
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Role", RoleSchema);
