const express = require("express");
const {
  handleLogin,
  handleLogout,
  handleSignup,
  resetPassword,
  changePassword,
  handleRefreshAccessToken,
} = require("../controllers/authController");
const { checkRequiredFields } = require("../middlewares/checkRequiredFields");
const verifyJwt = require("../middlewares/authMiddleware");
const router = express.Router();

router.route("/refresh").get(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Refresh access token using refresh token in cookie'
  handleRefreshAccessToken,
);

router.route("/logout").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Logout from the application'
  handleLogout,
);

router.route("/change-pass").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Change password (require login)'
  // #swagger.security = [{ "bearerAuth": [] }]
  verifyJwt,
  checkRequiredFields("oldPassword", "newPassword"),
  changePassword,
);

router.route("/reset-password").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Reset password after verifying OTP'
  checkRequiredFields("email", "newPassword"),
  resetPassword,
);

router.use(checkRequiredFields("email", "password"));
router.route("/login").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Login to the application'
  handleLogin,
);
router.route("/register").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Register a new user'
  handleSignup,
);

module.exports = router;
