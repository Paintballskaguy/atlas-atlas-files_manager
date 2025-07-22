import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function parseBasicAuthHeader(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  const base64Credentials = header.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [email, password] = credentials.split(':');
  return { email, password };
}

const AuthController = {
  async getConnect(req, res) {
    const authHeader = req.headers['authorization'];
    const credentials = parseBasicAuthHeader(authHeader);

    if (!credentials || !credentials.email || !credentials.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hashedPassword = sha1(credentials.password);

    // Find user with email and hashed password
    const user = await dbClient.client
      .db()
      .collection('users')
      .findOne({ email: credentials.email, password: hashedPassword });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate token
    const token = uuidv4();
    const redisKey = `auth_${token}`;

    // Store user ID in Redis with 24h expiry (24*3600 seconds)
    await redisClient.set(redisKey, user._id.toString(), 24 * 3600);

    return res.status(200).json({ token });
  },

  async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const redisKey = `auth_${token}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(redisKey);
    return res.status(204).send();
  },
};

export default AuthController;
