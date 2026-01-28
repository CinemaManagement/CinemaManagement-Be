const allowedOrigins = require('./allowedOrigins');

const corOptions = {
    origin: allowedOrigins,
    optionsSuccessStatus: 200
}

module.exports = corOptions;