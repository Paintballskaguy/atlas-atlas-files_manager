import pkg from 'mongodb';
import fs from 'fs/promises';
import mime from 'mime-types';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fileQueue from '../utils/queue.js'; // Use direct import

const { ObjectId } = pkg;




class FilesController {
  static async postUpload(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, type, parentId = '0', isPublic = false, data } = req.body;

      // Validate required fields
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type or invalid type' });
      }
      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Validate parent ID
      if (parentId !== '0') {
        if (!ObjectId.isValid(parentId)) {
          return res.status(400).json({ error: 'Invalid parentId' });
        }
        
        const parent = await dbClient.db.collection('files').findOne({
          _id: new ObjectId(parentId),
          userId: new ObjectId(userId),
        });
        
        if (!parent) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parent.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Create folder
      if (type === 'folder') {
        const newFolder = {
          userId: new ObjectId(userId),
          name,
          type,
          isPublic,
          parentId,
        };
        
        const result = await dbClient.db.collection('files').insertOne(newFolder);
        return res.status(201).json({
          id: result.insertedId.toString(),
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }

      // Create file
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      await fs.mkdir(folderPath, { recursive: true });
      
      const localPath = path.join(folderPath, uuidv4());
      const fileContent = Buffer.from(data, 'base64');
      await fs.writeFile(localPath, fileContent);

      const newFile = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId,
        localPath,
      };

      const result = await dbClient.db.collection('files').insertOne(newFile);
      
      // Add to queue only for images
      if (type === 'image' && fileQueue) {
        fileQueue.add({
          userId: userId,
          fileId: result.insertedId.toString(),
        });
      }

      return res.status(201).json({
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    } catch (error) {
      console.error('FilesController.postUpload error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

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
   static async putPublish(req, res) {
    return FilesController.setPublishStatus(req, res, true);
  }

  static async putUnpublish(req, res) {
    return FilesController.setPublishStatus(req, res, false);
  }

  static async setPublishStatus(req, res, isPublic) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      if (!ObjectId.isValid(fileId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const filter = {
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
      };

      const update = { $set: { isPublic } };
      const options = { returnDocument: 'after' };

      const result = await dbClient.db
        .collection('files')
        .findOneAndUpdate(filter, update, options);

      if (!result.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      const file = result.value;
      return res.json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
        localPath: file.localPath,
      });
    } catch (error) {
      console.error(`FilesController.put${isPublic ? 'Publish' : 'Unpublish'} error:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      
      // Validate file ID format
      if (!ObjectId.isValid(fileId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Find file by ID
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
      });

      // File not found
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Handle folders
      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Check file access permissions
      const token = req.header('X-Token');
      const userId = token ? await redisClient.get(`auth_${token}`) : null;
      
      if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Handle size parameter
      let filePath = file.localPath;
      const { size } = req.query;
      
      if (size && ['500', '250', '100'].includes(size)) {
        filePath = `${file.localPath}_${size}`;
      }

      // Check if file exists locally
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Determine MIME type
      const mimeType = mime.lookup(file.name) || 'text/plain';

      // Read and return file content
      const data = await fs.readFile(filePath);
      res.set('Content-Type', mimeType);
      return res.send(data);
    } catch (error) {
      console.error('FilesController.getFile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;