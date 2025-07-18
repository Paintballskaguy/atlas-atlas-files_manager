import redisClient from './utils/redis.js';

(async () => {
  await redisClient.ready; // ✅ Wait until Redis is connected

  console.log('Is Redis alive?', redisClient.isAlive()); // ✅ Should now print true

  console.log('Initial get for myKey:', await redisClient.get('myKey')); // Should print null

  await redisClient.set('myKey', 12, 5); // Set key with value 12, expires in 5 seconds
  console.log('After set, get myKey:', await redisClient.get('myKey')); // Should print '12'

  setTimeout(async () => {
    console.log('After 10s, get myKey again:', await redisClient.get('myKey')); // Should print null
  }, 10000);
})();
