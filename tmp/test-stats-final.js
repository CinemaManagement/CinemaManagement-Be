require("dotenv").config();
const mongoose = require("mongoose");
const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Movie = require("../models/Movie");
const STATUS = require("../constraints/status");

const testFinalStats = async () => {
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

    const movieStats = await MovieBooking.aggregate([
      { $match: queryMatch },
      {
        $lookup: {
          from: "foodbookings",
          localField: "foodBookingId",
          foreignField: "_id",
          as: "attachedFood",
        },
      },
      {
        $lookup: {
          from: "showtimes",
          localField: "showtimeId",
          foreignField: "_id",
          as: "showtime",
        },
      },
      { $unwind: { path: "$showtime", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "movies",
          localField: "showtime.movieId",
          foreignField: "_id",
          as: "movie",
        },
      },
      { $unwind: { path: "$movie", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          foodAmount: {
            $ifNull: [{ $arrayElemAt: ["$attachedFood.totalAmount", 0] }, 0],
          },
          sharePercent: { $ifNull: ["$movie.revenueSharePercent", 0] },
        },
      },
      {
        $addFields: {
          netTicketRevenue: { $subtract: ["$totalAmount", "$foodAmount"] },
        },
      },
      {
        $group: {
          _id: null,
          totalTicketRevenue: { $sum: "$netTicketRevenue" },
          totalTicketsSold: { $sum: { $size: "$seats" } },
          totalProductionShare: {
            $sum: {
              $multiply: [
                "$netTicketRevenue",
                { $divide: ["$sharePercent", 100] },
              ],
            },
          },
        },
      },
    ]);

    const foodStats = await FoodBooking.aggregate([
      { $match: queryMatch },
      {
        $group: {
          _id: null,
          totalFoodRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    console.log("--- FINAL Statistics Results ---");
    console.log("Total Tickets Sold:", movieStats[0]?.totalTicketsSold || 0);
    console.log("Ticket Revenue (Net):", movieStats[0]?.totalTicketRevenue || 0);
    console.log("Food Revenue (Total):", foodStats[0]?.totalFoodRevenue || 0);
    console.log("Production Share:", movieStats[0]?.totalProductionShare || 0);
    console.log("--------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
};

testFinalStats();
