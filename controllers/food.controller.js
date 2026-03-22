const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const redisClient = require("../config/redis");

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


    const cacheKey = `foods:${type || 'ALL'}`;
    const cachedFoods = await redisClient.get(cacheKey);
    if (cachedFoods) {
      return res.status(200).json(JSON.parse(cachedFoods));
    }



    const foods = await Food.find(filter);

    // Fetch all active single foods to use for enrichment (indexing by ID and Name)
    const singleFoods = await Food.find({ type: "SINGLE", status: STATUS.ACTIVE });
    const foodMap = {}; // Map by ID
    const nameMap = {}; // Map by Name (fallback)

    singleFoods.forEach((f) => {
      foodMap[f._id.toString()] = f;
      nameMap[f.name.toLowerCase().trim()] = f;
    });

    // Enrich combo items with the latest name and imageURL from the source single food
    const enrichedFoods = foods.map((food) => {
      const foodObj = food.toObject();
      if (foodObj.type === "COMBO" && foodObj.items) {
        foodObj.items = foodObj.items.map((item) => {
          // Priority 1: Match by foodId
          let sourceFood = item.foodId ? foodMap[item.foodId.toString()] : null;
          
          // Priority 2: Match by name (fallback for legacy data)
          if (!sourceFood && item.name) {
            sourceFood = nameMap[item.name.toLowerCase().trim()];
          }

          if (sourceFood) {
            return {
              ...item,
              foodId: sourceFood._id, // Ensure ID is present
              name: sourceFood.name,  // Overwrite with latest name
              imageUrl: sourceFood.imageUrl || null, // Overwrite with latest image
            };
          }
          return item; // Keep as is if no match found
        });
      }
      return foodObj;
    });

    await redisClient.set(cacheKey, JSON.stringify(foods), {
      EX: 60 * 60 * 24, // 1 day
    });

    res.status(200).json(enrichedFoods);
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

    await redisClient.del(["foods:ALL", "foods:SINGLE", "foods:COMBO"]);

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

    await redisClient.del(["foods:ALL", "foods:SINGLE", "foods:COMBO"]);

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

      await redisClient.del(["foods:ALL", "foods:SINGLE", "foods:COMBO"]);

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

    await redisClient.del(["foods:ALL", "foods:SINGLE", "foods:COMBO"]);

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
