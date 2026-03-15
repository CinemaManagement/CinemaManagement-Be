const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const verifyJwt = require("./middlewares/authMiddleware");
const credentials = require("./middlewares/credentials");
const corOptions = require("./config/allowedOrigins");
const express = require("express");
const app = express();
require("dotenv").config();
const { initSocket } = require("./socket/socket.js");
const connectDB = require("./config/connectDB.js");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");

const PORT = 3800;
app.use(cors(corOptions));

const server = http.createServer(app);
initSocket(server);

app.use(credentials);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.get("/", (req, res) => {
  res.send("Hello World!");
});
//no verify jwt
app.use("/auth", require("./routers/auth.route.js"));
app.use("/otp", require("./routers/otp.route.js"));

// verify jwt
app.use(verifyJwt);
app.use("/api/users", require("./routers/api/user.route.js"));
app.use("/api/movies", require("./routers/api/movie.route.js"));
app.use("/api/rooms", require("./routers/api/cinemaRoom.route.js"));

app.use((req, res, next) => {
  res
    .status(404)
    .json({ message: `Method ${req.method} at ${req.url} is not supported!` });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}...`);
  console.log(`Swagger is running on port http://localhost:${PORT}/api-docs`);

  // Connect database
  connectDB();
});
