require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const MovieBooking = require("../models/MovieBooking");
const Showtime = require("../models/Showtime");
const Movie = require("../models/Movie");
const STATUS = require("../constraints/status");

const debugStatsJson = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Connected to MongoDB");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const queryMatch = {
      status: { $in: [STATUS.PAID, STATUS.CHECKED_IN] },
      "payment.paidAt": { $gte: startOfMonth, $lte: endOfMonth },
    };

    const bookings = await MovieBooking.find(queryMatch).lean();
    
    const debugData = {
        range: { start: startOfMonth, end: endOfMonth },
        totalMatchingBookings: bookings.length,
        bookings: []
    };

    for (const b of bookings) {
        const showtime = await Showtime.findById(b.showtimeId);
        const movie = showtime ? await Movie.findById(showtime.movieId) : null;
        
        debugData.bookings.push({
            bookingCode: b.bookingCode,
            status: b.status,
            paidAt: b.payment?.paidAt,
            seatCount: b.seats?.length || 0,
            showtimeFound: !!showtime,
            movieFound: !!movie,
            revenueSharePercent: movie?.revenueSharePercent
        });
    }

    fs.writeFileSync("tmp/debug_results.json", JSON.stringify(debugData, null, 2));
    console.log("Debug results saved to tmp/debug_results.json");
    process.exit(0);
  } catch (error) {
    console.error("Debug failed:", error);
    process.exit(1);
  }
};

debugStatsJson();
