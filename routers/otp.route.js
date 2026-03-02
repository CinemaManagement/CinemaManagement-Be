const express = require("express");
const { sendOtpByEmail, verifyOtp } = require("../controllers/opt.controller");
const { checkRequiredFields } = require("../middlewares/checkRequiredFields");
const router = express.Router();

router.route("/send").post(
  // #swagger.tags = ['OTP']
  // #swagger.summary = 'Request to send OTP through email'
  checkRequiredFields("email"),
  sendOtpByEmail,
);
router.route("/verify").post(
  // #swagger.tags = ['OTP']
  // #swagger.summary = 'Verify OTP'
  checkRequiredFields("email", "otp"),
  verifyOtp,
);

module.exports = router;
