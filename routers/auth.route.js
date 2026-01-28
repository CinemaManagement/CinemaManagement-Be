const express = require("express");
const {
  handleLogin,
  handleLogout,
  handleSignup,
} = require("../controllers/authController");
const router = express.Router();

router.route("/login").post(handleLogin);
router.route("/logout").post(handleLogout);
router.route("/register").post(handleSignup);

module.exports = router;
