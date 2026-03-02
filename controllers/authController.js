const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLE } = require("../constraints/role");
const OTP = require("../models/OTP");
const { serverErrorMessageRes } = require("../helpers/serverErrorMessage");

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

  try {
    const compare = await bcrypt.compare(password, matchUser.password);
    if (!compare) {
      return res.status(401).json({ message: "Password is incorrect!" });
    }

    const refreshToken = jwt.sign(
      {
        email: matchUser.email,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "1d" },
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
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
    });
  } catch (error) {
    console.error(error);

    res.sendStatus(500);
  }
};

const handleLogout = async (req, res) => {
  const cookies = req.headers?.cookie;

  let refreshToken;
  cookies.split(";").forEach((cookie) => {
    const token = cookie.split("=")[0] === "jwt" ? cookie.split("=")[1] : "";
    if (token.length > 0) {
      refreshToken = token;
    }
  });

  if (!refreshToken) {
    return res.sendStatus(204);
  }

  const email = req.params;
  const matchUser = await User.findOne({ email }).exec();

  if (!matchUser) {
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None" });
    return res.sendStatus(204);
  }

  res.clearCookie("jwt", { httpOnly: true, sameSite: "None" });
  res.sendStatus(204);
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
};
