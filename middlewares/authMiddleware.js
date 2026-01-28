const jwt = require("jsonwebtoken");

const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.sendStatus(401);
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "Your token has expired or you hasn't logged in!" });
    }

    req.email = decoded.email;
    req.roleKey = decoded.roleKey;
    next();
  });
};

module.exports = verifyJwt;
