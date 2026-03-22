const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../../controllers/cart.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");

router.get(
  "/",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Cart']
  // #swagger.summary = 'Get current user cart'
  // #swagger.security = [{ "bearerAuth": [] }]
  getCart,
);

router.post(
  "/add",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Cart']
  // #swagger.summary = 'Add item to cart'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.requestBody = {
     required: true,
     content: {
       "application/json": {
         example: {
           "foodId": "67d6f4f6d8a4d18fb21463a2",
           "quantity": 2
         }
       }
     }
   } */
  addToCart,
);

router.put(
  "/update",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Cart']
  // #swagger.summary = 'Update item quantity in cart'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.requestBody = {
     required: true,
     content: {
       "application/json": {
         example: {
           "foodId": "67d6f4f6d8a4d18fb21463a2",
           "quantity": 5
         }
       }
     }
   } */
  updateCartItem,
);

router.delete(
  "/remove/:foodId",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Cart']
  // #swagger.summary = 'Remove item from cart'
  // #swagger.security = [{ "bearerAuth": [] }]
  removeFromCart,
);

router.delete(
  "/clear",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Cart']
  // #swagger.summary = 'Clear all items from cart'
  // #swagger.security = [{ "bearerAuth": [] }]
  clearCart,
);

module.exports = router;
