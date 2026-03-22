const User = require("../models/User");
const OTP = require("../models/OTP");
const { serverErrorMessageRes } = require("../helpers/serverErrorMessage");
const { sendEmail } = require("../helpers/email");

// Tạo mã OTP random
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "Email does not exist. Please check again!",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // Hết hạn sau 2 phút

    const dupplicate = await OTP.findOne({ email });
    if (dupplicate) {
      await OTP.updateOne(
        { email },
        {
          $set: {
            otp: otp,
            expire: expiresAt,
          },
        },
      );
    } else {
      await OTP.insertOne({ email, otp, expire: expiresAt });
    }

    await sendEmail(
      email,
      "Cinema Management - Your OTP",
      `Your OTP: ${otp}. This code will be expired in 2 minutes. \nAfter this code is verified, you have 5 minutes to change your password. Take your time!.`,
    );

    res.status(200).json({ message: "Check mail to get OTP!" });
  } catch (error) {
    serverErrorMessageRes(res, error);
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (otp.length !== 6) {
    return res
      .status(400)
      .json({ message: "OTP is not valid! Please try again!" });
  }

  try {
    const storedOtp = await OTP.findOne({ email, otp });

    if (!storedOtp || storedOtp.verified) {
      return res
        .status(400)
        .json({ message: "OTP has been expired or email does not exist!" });
    }

    // Kiểm tra thời hạn trước khi so sánh OTP
    if (new Date() > storedOtp.expire) {
      return res.status(400).json({ message: "OTP has been expired!" });
    }

    await OTP.updateOne(
      { email },
      {
        $set: {
          verified: true,
          expire: new Date(Date.now() + 5 * 60 * 1000),
        },
      },
    );

    res.status(200).json({ message: "Verify successfully." });
  } catch (error) {
    serverErrorMessageRes(res, error);
  }
};

module.exports = { verifyOtp, sendOtpByEmail };
