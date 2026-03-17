const express = require("express");
const redisClient = require("../config/redis.js");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await redisClient.set("test:key", "hello", { EX: 60 });
    const value = await redisClient.get("test:key");
    res.json({ value });
  } catch (error) {
    console.error("Redis test error:", error);
    res.status(500).json({ error: "Redis test failed" });
  }
});

module.exports = router;