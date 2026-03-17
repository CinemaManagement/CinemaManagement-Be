const { createClient } = require('redis');

// Connect to your Key Value instance using the REDIS_URL environment variable
// The REDIS_URL is set to the internal connection URL e.g. redis://red-343245ndffg023:6379
const redisClient = createClient({ 
  url: process.env.REDIS_URL,
  socket: {
    tls: process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://"),
    rejectUnauthorized: false,
    connectTimeout: 50000
  },
  pingInterval: 1000 * 60 * 4 // Ping every 4 minutes to keep connection alive
});

let hasPrintedSocketError = false;

redisClient.on('error', (err) => {
  if (err.name === 'SocketClosedUnexpectedlyError') {
    if (!hasPrintedSocketError) {
      console.log('Redis notice: Socket closed unexpectedly. Client will auto-reconnect...');
      hasPrintedSocketError = true;
    }
  } else {
    console.log('Redis Client Error', err);
  }
});

redisClient.on('ready', () => {
  hasPrintedSocketError = false; // Reset the flag once it successfully reconnects
});

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