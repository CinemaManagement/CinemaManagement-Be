require("dotenv").config();
const mongoose = require("mongoose");

const repairOrphanedBookings = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    const db = mongoose.connection.db;
    const movieBookings = db.collection('moviebookings');
    const showtimes = await db.collection('showtimes').find().toArray();

    if (showtimes.length >= 2) {
      console.log('Found showtimes. Repairing...');
      
      const res1 = await movieBookings.updateOne(
        { bookingCode: 'AB1234XY' },
        { $set: { showtimeId: showtimes[0]._id } }
      );
      console.log('Updated AB1234XY:', res1.modifiedCount);

      const res2 = await movieBookings.updateOne(
        { bookingCode: 'ZX9876PQ' },
        { $set: { showtimeId: showtimes[1]._id } }
      );
      console.log('Updated ZX9876PQ:', res2.modifiedCount);
      
      console.log('Repair completed.');
    } else {
      console.log('Not enough showtimes in database to perform specific repair (need at least 2).');
    }
    process.exit(0);
  } catch (error) {
    console.error('Repair failed:', error);
    process.exit(1);
  }
};

repairOrphanedBookings();
