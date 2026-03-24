const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
} = require("../../controllers/statistics.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");

router.get(
  "/dashboard",
  verifyRoles(ROLE.ADMIN, ROLE.MANAGER),
  /* #swagger.tags = ['Statistics']
  #swagger.summary = 'Get dashboard statistics'
  #swagger.security = [{ "bearerAuth": [] }]
  */
  getDashboardStats,
);

module.exports = router;
