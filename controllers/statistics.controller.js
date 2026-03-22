const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const User = require("../models/User");
const STATUS = require("../constraints/status");

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const queryMatch = {
      status: { $in: [STATUS.PAID, STATUS.CHECKED_IN] },
      "payment.paidAt": { $gte: startOfMonth, $lte: endOfMonth },
    };

    // 1. Movie Revenue & Tickets Sold
    const movieStats = await MovieBooking.aggregate([
      { $match: queryMatch },
      {
        $group: {
          _id: null,
          totalTicketRevenue: { $sum: "$totalAmount" },
          totalTicketsSold: { $sum: { $size: "$seats" } },
        },
      },
    ]);

    // 2. Food Revenue
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
    const activeUsersCount = await User.countDocuments({ status: STATUS.ACTIVE });

    // 4. Showtimes Scheduled in this month
    const showtimesCount = await Showtime.countDocuments({
      startTime: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: STATUS.CANCELLED },
    });

    const ticketRevenue = movieStats[0]?.totalTicketRevenue || 0;
    const foodRevenue = foodStats[0]?.totalFoodRevenue || 0;
    const ticketsSold = movieStats[0]?.totalTicketsSold || 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: ticketRevenue + foodRevenue,
        activeUsers: activeUsersCount,
        ticketsSold: ticketsSold,
        showtimes: showtimesCount,
        ticketRevenue: ticketRevenue,
        foodRevenue: foodRevenue,
        timeRange: {
            start: startOfMonth,
            end: endOfMonth
        }
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getDashboardStats };
