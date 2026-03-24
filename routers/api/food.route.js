const express = require("express");
const {
  getFoods,
  createFood,
  updateFood,
  deleteFood,
} = require("../../controllers/food.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const router = express.Router();

router.get(
  "/",
  verifyRoles(ROLE.MANAGER, ROLE.CUSTOMER, ROLE.CINEMA),
  // Protected menu (requires login)
  // #swagger.tags = ['Foods']
  // #swagger.summary = 'Get food menu'
  // #swagger.security = [{ "bearerAuth": [] }]
  getFoods,
);

// Protected endpoints
router.use(require("../../middlewares/authMiddleware"));

router.route("/").post(
  verifyRoles(ROLE.MANAGER),
  checkRequiredFields("name", "type", "price"),
  // #swagger.tags = ['Foods']
  // #swagger.summary = 'Create a new food/combo'
  // #swagger.security = [{ "bearerAuth": [] }]
  createFood,
);

router
  .route("/:id")
  .put(
    verifyRoles(ROLE.MANAGER),
    // #swagger.tags = ['Foods']
    // #swagger.summary = 'Update food details'
    // #swagger.security = [{ "bearerAuth": [] }]
    updateFood,
  )
  .delete(
    verifyRoles(ROLE.MANAGER),
    // #swagger.tags = ['Foods']
    // #swagger.summary = 'Delete (soft/hard) a food item'
    // #swagger.security = [{ "bearerAuth": [] }]
    deleteFood,
  );

module.exports = router;
