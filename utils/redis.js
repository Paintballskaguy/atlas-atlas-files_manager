import { createClient } from 'redis';

class RedisClient {
  constructor() {
    const host = process.env.REDIS_HOST || '127.0.0.1'; // Use IPv4
    const port = process.env.REDIS_PORT || 6379;
    this.client = createClient({ 
      socket: {
        host,
        port
      }
    });
    this.connected = false;

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // This Promise resolves when Redis is fully connected
    this.ready = this.client.connect()
      .then(() => {
        this.connected = true;
        console.log('✅ Redis connected');
      })
      .catch((err) => {
        console.error('Redis connection failed:', err);
      });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.client.setEx(key, duration, value.toString());
    } catch (err) {
      console.error('Error setting key in Redis:', err);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Error deleting key in Redis:', err);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;