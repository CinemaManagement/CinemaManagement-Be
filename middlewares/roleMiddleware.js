const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("req.role in verifyRoles:", req.role);
    console.log("allowedRoles:", allowedRoles);
    const role = req.role;
    if (!role) {
      return res
        .status(401)
        .json({ message: "You haven't login yet! Please try again!" });
    }
    const rolesArray = [...allowedRoles];

    const result = rolesArray.includes(req.role);
    if (!result)
      return res
        .status(401)
        .json({ message: "You are not allowed to access this data!" });
    next();
  };
};

module.exports = verifyRoles;
