const Food = require("../models/Food");
const STATUS = require("../constraints/status");

const getFoods = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { status: STATUS.ACTIVE };

    if (type) {
      if (!["SINGLE", "COMBO"].includes(type)) {
        return res.status(400).json({ message: "Invalid food type" });
      }
      filter.type = type;
    }

    const foods = await Food.find(filter);
    res.status(200).json(foods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const createFood = async (req, res) => {
  try {
    const { name, type, price, description, items, imageUrl } = req.body;

    if (!["SINGLE", "COMBO"].includes(type)) {
      return res.status(400).json({ message: "Invalid food type" });
    }

    if (type === "COMBO") {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Combo must have at least 1 item",
        });
      }
    }

    if (type === "SINGLE" && items !== undefined && !Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    const food = await Food.create({
      name,
      type,
      price,
      imageUrl,
      description,
      status: STATUS.ACTIVE,
      items: Array.isArray(items) ? items : [],
    });

    res.status(201).json(food);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const food = await Food.findById(id);
    if (!food) {
      return res
        .status(404)
        .json({ message: `Not found food with id ${id}!` });
    }

    const nextType = updates.type ?? food.type;
    const nextItems = updates.items ?? food.items;

    if (!["SINGLE", "COMBO"].includes(nextType)) {
      return res.status(400).json({ message: "Invalid food type" });
    }

    if (nextType === "COMBO") {
      if (!Array.isArray(nextItems) || nextItems.length === 0) {
        return res.status(400).json({
          message: "Combo must have at least 1 item",
        });
      }
    }

    if (nextType === "SINGLE" && updates.items !== undefined && !Array.isArray(updates.items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    Object.assign(food, updates);
    await food.save();

    res.status(200).json(food);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const deleteFood = async (req, res) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === "true" || req.query.hard === "1";

    if (hard) {
      const deleted = await Food.findByIdAndDelete(id);
      if (!deleted) {
        return res
          .status(404)
          .json({ message: `Not found food with id ${id}!` });
      }
      return res
        .status(200)
        .json({ message: "Food deleted permanently", food: deleted });
    }

    const updated = await Food.findByIdAndUpdate(
      id,
      { status: STATUS.HIDDEN },
      { new: true },
    );
    if (!updated) {
      return res
        .status(404)
        .json({ message: `Not found food with id ${id}!` });
    }
    res
      .status(200)
      .json({ message: "Food hidden successfully", food: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

module.exports = {
  getFoods,
  createFood,
  updateFood,
  deleteFood,
};
