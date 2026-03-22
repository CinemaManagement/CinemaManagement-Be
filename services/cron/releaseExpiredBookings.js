// cron/releaseExpiredBookings.js
const cron = require("node-cron");
const MovieBooking = require("../../models/MovieBooking");
const Showtime = require("../../models/Showtime");
const STATUS = require("../../constraints/status");

// Run every minute
cron.schedule("* * * * *", async () => {
  try {
    const expiredBookings = await MovieBooking.find({
      status: STATUS.HELD,
      expiredAt: { $lt: new Date() }, // Find bookings where expiration time has passed
    });

    if (expiredBookings.length === 0) return;

    console.log(`Found ${expiredBookings.length} expired bookings. Releasing seats...`);

    for (const booking of expiredBookings) {
      // 1. Mark booking as EXPIRED
      booking.status = STATUS.EXPIRED;
      await booking.save();

      // 2. Release seats in the Showtime model
      const showtime = await Showtime.findById(booking.showtimeId);
      if (showtime) {
        let seatsChanged = false;
        booking.seats.forEach((bSeat) => {
          const sSeat = showtime.seats.find((s) => s.seatCode === bSeat.seatCode);
          if (sSeat && sSeat.status === STATUS.HELD) {
            sSeat.status = STATUS.AVAILABLE;
            seatsChanged = true;
          }
        });

        if (seatsChanged) {
          await showtime.save();
        }
      }
    }
  } catch (error) {
    console.error("Error running seat release cron job:", error);
  }
});

module.exports = cron;
