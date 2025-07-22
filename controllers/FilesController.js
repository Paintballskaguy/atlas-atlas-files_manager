import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class FilesController {
  static async getShow(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      // Get userId from Redis token
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      if (!ObjectId.isValid(fileId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Find file by id and userId
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Format response to include id string instead of _id
      return res.json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic || false,
        parentId: file.parentId,
        localPath: file.localPath,
      });
    } catch (error) {
      console.error('FilesController.getShow error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      // Get userId from Redis token
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Query parameters
      const parentId = req.query.parentId || '0';
      const page = parseInt(req.query.page, 10) || 0;
      const limit = 20;

      // Build MongoDB query filter
      const filter = {
        userId: new ObjectId(userId),
        parentId: parentId === '0' ? '0' : parentId,
      };

      // Use aggregation with skip and limit for pagination
      const files = await dbClient.db.collection('files')
        .find(filter)
        .skip(page * limit)
        .limit(limit)
        .toArray();

      // Format files (replace _id and userId ObjectId with strings)
      const formattedFiles = files.map(file => ({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic || false,
        parentId: file.parentId,
        localPath: file.localPath,
      }));

      return res.json(formattedFiles);
    } catch (error) {
      console.error('FilesController.getIndex error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
