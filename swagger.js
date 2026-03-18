const swaggerAutogen = require("swagger-autogen")({
  openapi: "3.0.0",
  autoHeaders: false,
});

const doc = {
  info: {
    title: "Cinema Management API",
    description: "API Documentation for Cinema Management System",
  },
  servers: [
    {
      url: "https://cinemamanagement-be.onrender.com",
      description: "Online server",
    },

    {
      url: "http://localhost:3800",
      description: "Local server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./index.js"]; // Point to the entry file or route files

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, ... */

swaggerAutogen(outputFile, endpointsFiles, doc);
