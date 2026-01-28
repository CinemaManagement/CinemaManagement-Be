const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLE } = require("../constraints/role");
const { getRoleNameByKey } = require("../cache/roleCache");

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
      roleKey: req.body?.roleKey,
    });

    return res.status(201).json({
      message: `Welcome ${email} as ${req.body?.roleKey ? getRoleNameByKey(req.body.roleKey) : getRoleNameByKey(ROLE.CUSTOMER)}`,
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
        email: matchUser.email,
        roleKey: matchUser.roleKey,
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

module.exports = { handleLogin, handleLogout, handleSignup };
