const User = require("../models/User");
const { ROLE } = require("../constraints/role");
const STATUS = require("../constraints/status");
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};
const getUserById = async (req, res) => {
  const id = req.userId;
  try {
    const user = await User.findById(id).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ message: `Not found user with id ${id}!` });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};
const addUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.create({
      email,
      password,
      role: role || ROLE.CUSTOMER,
    });
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};
const deleteUser = async (req, res) => {
  try {
    const id = req.params?.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: `Not found user with id ${id}!` });
    }
    await User.deleteOne({ _id: id });
    res
      .status(200)
      .json({ message: `Delete user ${user.email} successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};

const blockUser = async (req, res) => {
  try {
    const id = req.params?.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: `Not found user with id ${id}!` });
    }
    await User.updateOne(
      { _id: id },
      {
        $set: {
          status: STATUS.LOCKED,
        },
      },
    );
    res.status(200).json({ message: `Block user ${user.email} successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected error occured!" });
  }
};
module.exports = { getAllUsers, addUser, deleteUser, getUserById, blockUser };
