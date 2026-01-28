const Role = require("../models/Role");

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    if (!roles?.length) {
      return res.json([]);
    }
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An unexpected error occured!" });
  }
};
const createRole = async (req, res) => {
  try {
    const { name, key } = req.body;
    if (!name || !key)
      return res
        .status(403)
        .json({ message: "Role name and key is required!" });
    const role = await Role.create({ name, key });
    res.status(201).json({ message: "Create successfully!", role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An unexpected error occured!" });
  }
};
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    if (!roleId)
      return res.status(403).json({ message: "You have to provide roleId!" });
    const role = await Role.findById(roleId);
    if (!role)
      return res
        .status(404)
        .json({ message: `Role with id ${roleId} does not exist!` });
    await Role.deleteOne({ _id: roleId });
    res
      .status(200)
      .json({ message: `Delete role ${role.name} successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An unexpected error occured!" });
  }
};

module.exports = { getAllRoles, createRole, deleteRole };
