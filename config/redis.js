const { createClient } = require('redis');

// Connect to your Key Value instance using the REDIS_URL environment variable
// The REDIS_URL is set to the internal connection URL e.g. redis://red-343245ndffg023:6379
const redisClient = createClient({ 
  url: process.env.REDIS_URL,
  socket: {
    tls: process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://"),
    rejectUnauthorized: false
  }
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  try {
    await redisClient.connect();
    
    // Set and retrieve some values
    await redisClient.set('key', 'node redis');
    const value = await redisClient.get('key');
    console.log("Redis connected. Test key value:", value);
  } catch (error) {
    console.error("Redis connection failed:", error);
  }
})();

module.exports = redisClient;