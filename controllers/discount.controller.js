const Discount = require("../models/Discount");
const STATUS = require("../constraints/status");

const getActiveDiscounts = async (req, res) => {
  try {
    const currentDate = new Date();
    
    // Find discounts that are active, strictly within their date range
    const discounts = await Discount.find({
      status: STATUS.ACTIVE,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      $expr: { $lt: ["$usedCount", "$usageLimit"] } // Only if usedCount is less than usageLimit
    });

    res.status(200).json(discounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getActiveDiscounts,
};
