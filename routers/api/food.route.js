const express = require("express");
const {
  getFoods,
  createFood,
  updateFood,
  deleteFood,
} = require("../../controllers/food.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const { checkRequiredFields } = require("../../middlewares/checkRequiredFields");
const verifyJwt = require("../../middlewares/authMiddleware");
const router = express.Router();

router.use(verifyJwt);

router
  .route("/")
  .get(
    verifyRoles(ROLE.MANAGER, ROLE.CINEMA, ROLE.CUSTOMER),
    getFoods,
  )
  .post(
    verifyRoles(ROLE.MANAGER),
    checkRequiredFields("name", "type", "price"),
    createFood,
  );

router
  .route("/:id")
  .put(verifyRoles(ROLE.MANAGER), updateFood)
  .delete(verifyRoles(ROLE.MANAGER), deleteFood);

module.exports = router;
