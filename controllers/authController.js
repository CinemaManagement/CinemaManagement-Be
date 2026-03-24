const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLE } = require("../constraints/role");
const OTP = require("../models/OTP");
const { serverErrorMessageRes } = require("../helpers/serverErrorMessage");
const STATUS = require("../constraints/status");
const redisClient = require("../config/redis");

const handleSignup = async (req, res) => {
  if (!req.body?.email || !req.body?.password) {
    return res.status(401).json({
      message: "Email and password are required!",
    });
  }

  const { email, password } = req.body;

  const duplicate = await User.findOne({ email }).exec();
  if (duplicate) {
    return res.status(409).json({ message: "Email has existed!" });
  }

  try {
    const hashPass = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashPass,
      role: req.body?.role,
    });

    return res.status(201).json({
      message: `Welcome ${email} as ${req.body?.role ? req.body.role : ROLE.CUSTOMER}`,
    });
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
};

const handleLogin = async (req, res) => {
  if (!req.body?.email || !req.body?.password) {
    return res.status(401).json({
      message: "Email and password are required!",
    });
  }
  const { email, password } = req.body;

  const matchUser = await User.findOne({ email }).exec();

  if (!matchUser) {
    return res.status(401).json({
      message: "Email does not exist!",
    });
  }

  if (matchUser.status === STATUS.LOCKED) {
    return res.status(403).json({
      message: "Your account has been locked!",
    });
  }

  try {
    const compare = await bcrypt.compare(password, matchUser.password);
    if (!compare) {
      return res.status(401).json({ message: "Password is incorrect!" });
    }

    const refreshToken = jwt.sign(
      {
        userId: matchUser._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    const accessToken = jwt.sign(
      {
        userId: matchUser._id,
        email: matchUser.email,
        role: matchUser.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" },
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await redisClient.set(`token:${matchUser._id}`, refreshToken, {
      EX: 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      accessToken,
    });
  } catch (error) {
    console.error(error);

    res.sendStatus(500);
  }
};
const handleRefreshAccessToken = async (req, res) => {
  try {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
      return res.sendStatus(401);
    }

    const refreshToken = cookies.jwt;

    if (!refreshToken) {
      return res.status(403).json({
        message: "You have not logged in yet!",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decoded.userId;

    const storedToken = await redisClient.get(`token:${userId}`);

    if (!storedToken || storedToken !== refreshToken) {
      return res.status(403).json({
        message: "Your token has expired or you has not logged in yet!",
      });
    }

    const matchUser = await User.findById(userId).exec();
    if (!matchUser) {
      return res.sendStatus(403);
    }

    const accessToken = jwt.sign(
      {
        userId: matchUser._id,
        email: matchUser.email,
        role: matchUser.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" },
    );

    res.json({ accessToken });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        message: "Refresh token has expired. Please log in again.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        message: "Invalid refresh token.",
      });
    }
    console.error(error);
    res.sendStatus(500);
  }
};

const handleLogout = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.sendStatus(204);
  }

  const refreshToken = cookies.jwt;

  try {
    const matchUser = await User.findOne({ refreshToken }).exec();

    if (!matchUser) {
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      return res.sendStatus(204);
    }

    await redisClient.del(`token:${matchUser._id}`);

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
};

const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const match = await User.findOne({ email });
    if (!match) {
      return res.status(401).json({
        message: "Email does not exist!",
      });
    }

    const otp = await OTP.findOne({ email });

    if (!otp || !otp.verified || new Date() > otp.expire) {
      return res.status(401).json({
        message: "OTP has not been verified or it has been expired!",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { email },
      {
        $set: {
          password: hashedPassword,
        },
      },
    );
    await OTP.deleteOne({ email });

    res.status(200).json({ message: "Change password successfully!" });
  } catch (error) {
    serverErrorMessageRes(res, error);
  }
};

const resetPasswordByAdmin = async (req, res) => {
  if (!req.body?.newPassword || !req.body?.email) {
    return res.status(400).json({
      message: "Email and new password are required!",
    });
  }
  const { email, newPassword } = req.body;

  try {
    const match = await User.findOne({ email });
    if (!match) {
      return res.status(404).json({
        message: "Email does not exists!",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { email },
      {
        $set: {
          password: hashedPassword,
        },
      },
    );

    res
      .status(200)
      .json({ message: `${email} changed password successfully!` });
  } catch (error) {
    serverErrorMessageRes(res, error);
  }
};

const changePassword = async (req, res) => {
  if (!req?.email) {
    return res.status(400).json({
      message: "You have not logged in!",
    });
  }

  const email = req.email;
  const { oldPassword, newPassword } = req.body;

  try {
    const match = await User.findOne({ email });
    if (!match) {
      return res.status(404).json({
        message: "Email does not exist!",
      });
    }

    const checkPass = await bcrypt.compare(oldPassword, match.password);

    if (!checkPass) {
      return res.status(401).json({ message: "Old password is incorrect!" });
    }

    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new password must be different!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { email },
      {
        $set: {
          password: hashedPassword,
        },
      },
    );

    res
      .status(200)
      .json({ message: `${email} changed password successfully!` });
  } catch (error) {
    serverErrorMessageRes(res, error);
  }
};

module.exports = {
  handleLogin,
  handleLogout,
  handleSignup,
  resetPassword,
  changePassword,
  resetPasswordByAdmin,
  handleRefreshAccessToken,
};
