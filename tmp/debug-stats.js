require("dotenv").config();
const mongoose = require("mongoose");
const MovieBooking = require("../models/MovieBooking");
const STATUS = require("../constraints/status");

const debugStats = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Connected to MongoDB");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log("Checking range:", startOfMonth.toISOString(), "to", endOfMonth.toISOString());

    const allBookings = await MovieBooking.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).select("bookingCode status payment createdAt");

    console.log("Bookings created this month:", allBookings.length);
    allBookings.forEach(b => {
        console.log(`- ${b.bookingCode}: status=${b.status}, paidAt=${b.payment?.paidAt ? b.payment.paidAt.toISOString() : 'NULL'}, createdAt=${b.createdAt.toISOString()}`);
    });

    const filteredBookings = await MovieBooking.find({
      status: { $in: [STATUS.PAID, STATUS.CHECKED_IN] },
      "payment.paidAt": { $gte: startOfMonth, $lte: endOfMonth },
    });
    console.log("Bookings matching queryMatch:", filteredBookings.length);

    process.exit(0);
  } catch (error) {
    console.error("Debug failed:", error);
    process.exit(1);
  }
};

debugStats();
