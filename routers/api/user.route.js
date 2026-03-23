const express = require("express");
const {
  getAllUsers,
  addUser,
  deleteUser,
  getUserById,
  blockUser,
} = require("../../controllers/userController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const {
  checkRequiredFields,
} = require("../../middlewares/checkRequiredFields");
const router = express.Router();

router.route("/").get(
  verifyRoles(ROLE.ADMIN, ROLE.MANAGER),
  // #swagger.tags = ['Users']
  // #swagger.summary = 'Get all users'
  // #swagger.security = [{ "bearerAuth": [] }]
  getAllUsers,
);
router.route("/:id").delete(
  verifyRoles(ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER),
  deleteUser,
  // #swagger.tags = ['Users']
  // #swagger.summary = 'Delete user'
  // #swagger.security = [{ "bearerAuth": [] }]
);
router.route("/:id/block").put(
  verifyRoles(ROLE.ADMIN, ROLE.MANAGER),
  blockUser,
  // #swagger.tags = ['Users']
  // #swagger.summary = 'Block user'
  // #swagger.security = [{ "bearerAuth": [] }]
);
router.route("/").post(
  verifyRoles(ROLE.ADMIN),
  checkRequiredFields("email", "password"),
  addUser,
  // #swagger.tags = ['Users']
  // #swagger.summary = 'Add new user'
  // #swagger.security = [{ "bearerAuth": [] }]
);
router.route("/me").get(
  getUserById,
  // #swagger.tags = ['Users']
  // #swagger.summary = 'Get personal information'
  // #swagger.security = [{ "bearerAuth": [] }]
);

module.exports = router;
