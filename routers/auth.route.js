const express = require("express");
const {
  handleLogin,
  handleLogout,
  handleSignup,
} = require("../controllers/authController");
const router = express.Router();

router.route("/login").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Login'
  handleLogin,
);
router.route("/logout").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Logout'
  handleLogout,
);
router.route("/register").post(
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Register'
  handleSignup,
);

module.exports = router;
