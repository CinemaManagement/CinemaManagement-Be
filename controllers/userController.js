const User = require("../models/User");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
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
module.exports = { getAllUsers, deleteUser };
