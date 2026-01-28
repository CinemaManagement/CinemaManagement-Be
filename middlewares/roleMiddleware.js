const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const roleKey = req.roleKey;
    if (!roleKey) {
      return res
        .status(401)
        .json({ message: "You haven't login yet! Please try again!" });
    }
    const rolesArray = [...allowedRoles];

    const result = rolesArray.includes(req.roleKey);
    if (!result)
      return res
        .status(401)
        .json({ message: "You are not allowed to access this data!" });
    next();
  };
};

module.exports = verifyRoles;
