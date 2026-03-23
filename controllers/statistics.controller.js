const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const User = require("../models/User");
const STATUS = require("../constraints/status");

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const queryMatch = {
      status: { $in: [STATUS.PAID, STATUS.CHECKED_IN] },
      "payment.paidAt": { $gte: startOfMonth, $lte: endOfMonth },
    };

    // 1. Movie & Production Share Statistics
    // We need to join with FoodBooking to get the net ticket revenue (excluding food if attached)
    // We use preserveNullAndEmptyArrays: true so bookings are still counted even if showtime/movie is missing
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
          // If food is attached, totalAmount includes it. We subtract it to get net ticket revenue.
          foodAmount: {
            $ifNull: [{ $arrayElemAt: ["$attachedFood.totalAmount", 0] }, 0],
          },
          // Production share percent defaults to 0 if movie not found
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

    // 2. Total Food Revenue (Calculated from all paid food bookings)
    const foodStats = await FoodBooking.aggregate([
      { $match: queryMatch },
      {
        $group: {
          _id: null,
          totalFoodRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // 3. Active Users (Total active in system)
    const activeUsersCount = await User.countDocuments({
      status: STATUS.ACTIVE,
    });

    // 4. Showtimes Scheduled in this month
    const showtimesCount = await Showtime.countDocuments({
      startTime: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: STATUS.CANCELLED },
    });

    const ticketRevenue = movieStats[0]?.totalTicketRevenue || 0;
    const foodRevenue = foodStats[0]?.totalFoodRevenue || 0;
    const ticketsSold = movieStats[0]?.totalTicketsSold || 0;
    const productionShare = movieStats[0]?.totalProductionShare || 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: ticketRevenue + foodRevenue,
        activeUsers: activeUsersCount,
        ticketsSold: ticketsSold,
        showtimes: showtimesCount,
        ticketRevenue: ticketRevenue,
        foodRevenue: foodRevenue,
        productionShare: productionShare,
        timeRange: {
          start: startOfMonth,
          end: endOfMonth,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getDashboardStats };
