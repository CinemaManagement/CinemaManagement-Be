const mongoose = require("mongoose");
const { loadRolesToCache } = require("../cache/roleCache");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Database connected!!!");
    // load roles to cache when app started
    await loadRolesToCache();
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectDB;
