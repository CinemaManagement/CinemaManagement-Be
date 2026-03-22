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
      $expr: { $lt: ["$usedCount", "$usageLimit"] }, // Only if usedCount is less than usageLimit
    });

    res.status(200).json(discounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find();
    res.status(200).json(discounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addDiscount = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      discountType,
      value,
      movieId,
      showtimeId,
      code,
      usageLimit,
      startDate,
      endDate,
    } = req.body;

    if (type === "ONE_TIME_CODE" && !code) {
      return res.status(400).json({ message: "Code is required for ONE_TIME_CODE discount" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "startDate must be before endDate" });
    }

    const discount = await Discount.create({
      name,
      description,
      type,
      discountType,
      value,
      movieId,
      showtimeId,
      code,
      usageLimit: usageLimit ?? 1,
      usedCount: 0,
      startDate,
      endDate,
      status: STATUS.ACTIVE,
    });

    res.status(201).json(discount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.startDate && updateData.endDate && new Date(updateData.startDate) > new Date(updateData.endDate)) {
      return res.status(400).json({ message: "startDate must be before endDate" });
    }

    const discount = await Discount.findByIdAndUpdate(id, updateData, { new: true });
    if (!discount) {
      return res.status(404).json({ message: `Not found discount with id ${id}!` });
    }

    res.status(200).json(discount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getActiveDiscounts,
  getAllDiscounts,
  addDiscount,
  updateDiscount,
};
