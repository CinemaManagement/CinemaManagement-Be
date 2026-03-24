const allowedOrigins = require("./allowedOrigins");

const corOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corOptions;
