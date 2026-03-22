const express = require("express");
const router = express.Router();
const { addToCart } = require("../../controllers/cart.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");

router.post(
  "/add",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
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

module.exports = router;
