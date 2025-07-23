import pkg from 'bull';
const Bull = pkg.default || pkg; // Handle both ESM and CJS

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

const fileQueue = new Bull('fileQueue', {
  redis: {
    host: redisHost,
    port: redisPort,
    enableReadyCheck: false,
  }
});

export default fileQueue;