const Cart = require("../models/Cart");
const Food = require("../models/Food");

const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { foodId, quantity } = req.body || {};

    if (!userId) {
      return res.status(403).json({ message: "Authenticated user not found" });
    }

    if (!foodId || !quantity) {
      return res.status(400).json({ message: "Missing foodId or quantity" });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: "Food item not found" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ foodId, quantity: parsedQuantity }],
      });
      return res.status(201).json({ message: "Cart created", cart });
    }

    const existingItem = cart.items.find(
      (item) => item.foodId.toString() === foodId,
    );
    if (existingItem) {
      existingItem.quantity += parsedQuantity;
    } else {
      cart.items.push({ foodId, quantity: parsedQuantity });
    }

    await cart.save();
    return res.status(200).json({ message: "Added to cart", cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error occured!" });
  }
};

module.exports = {
  addToCart,
};
