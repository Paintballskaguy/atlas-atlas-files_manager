import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class FilesController {
  static async postUpload(req, res) {
    // 1. Authenticate user by token
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = '0', isPublic = false, data } = req.body || {};

    // 2. Validate inputs
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const validTypes = ['folder', 'file', 'image'];
    if (!type || !validTypes.includes(type)) return res.status(400).json({ error: 'Missing type' });

    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    // 3. Check parent folder validity if parentId != 0
    if (parentId !== '0') {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: new dbClient.ObjectId(parentId) });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    // 4. Prepare the new file object for DB insertion
    const newFile = {
      userId: new dbClient.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    // 5. If folder, just insert and return
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(newFile);
      return res.status(201).json({ id: result.insertedId, ...newFile });
    }

    // 6. For files and images, store on disk first
    // Determine storage folder path
    let storageFolder = process.env.FOLDER_PATH;
    if (!storageFolder) {
      storageFolder = '/tmp/files_manager';
    }

    // Ensure folder exists
    if (!fs.existsSync(storageFolder)) {
      fs.mkdirSync(storageFolder, { recursive: true });
    }

    // Create a unique filename
    const filename = uuidv4();
    const filePath = path.join(storageFolder, filename);

    // Write the decoded base64 file content to disk
    const buffer = Buffer.from(data, 'base64');
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (err) {
      console.error('Failed to write file:', err);
      return res.status(500).json({ error: 'Failed to save file' });
    }

    // Add localPath to DB record
    newFile.localPath = filePath;

    // 7. Insert file metadata in DB
    const result = await dbClient.db.collection('files').insertOne(newFile);

    // 8. Return new file info (id and properties)
    return res.status(201).json({ id: result.insertedId, ...newFile });
  }
}

export default FilesController;
