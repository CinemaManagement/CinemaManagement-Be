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

const getCart = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(403).json({ message: "Authenticated user not found" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.foodId");
    if (!cart) {
      return res.status(200).json({ items: [] });
    }

    return res.status(200).json(cart);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { foodId, quantity } = req.body || {};

    if (!userId) {
      return res.status(403).json({ message: "Authenticated user not found" });
    }

    if (!foodId || quantity === undefined) {
      return res.status(400).json({ message: "Missing foodId or quantity" });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a non-negative number" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.foodId.toString() === foodId,
    );

    if (itemIndex > -1) {
      if (parsedQuantity === 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = parsedQuantity;
      }
      await cart.save();
      return res.status(200).json({ message: "Cart updated", cart });
    } else {
      return res.status(404).json({ message: "Food item not found in cart" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { foodId } = req.params;

    if (!userId) {
      return res.status(403).json({ message: "Authenticated user not found" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter((item) => item.foodId.toString() !== foodId);
    await cart.save();

    return res.status(200).json({ message: "Item removed from cart", cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(403).json({ message: "Authenticated user not found" });
    }

    let cart = await Cart.findOne({ userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return res.status(200).json({ message: "Cart cleared" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error occured!" });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
