const imageThumbnail = require('image-thumbnail');
const fs = require('fs').promises;
const dbClient = require('./utils/db.js');
const fileQueue = require('./utils/queue.js');
const { ObjectId } = require('mongodb');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  // Validate IDs
  if (!ObjectId.isValid(fileId)) throw new Error('Invalid fileId');
  if (!ObjectId.isValid(userId)) throw new Error('Invalid userId');

  // Find file in DB
  const file = await dbClient.db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });

  if (!file) throw new Error('File not found');
  if (file.type !== 'image') return; // Skip non-image files

  // Generate thumbnails
  const sizes = [500, 250, 100];
  
  for (const width of sizes) {
    try {
      const thumbnail = await imageThumbnail(file.localPath, { width });
      await fs.writeFile(`${file.localPath}_${width}`, thumbnail);
      console.log(`Generated ${width}px thumbnail for ${file.localPath}`);
    } catch (err) {
      console.error(`Error generating ${width}px thumbnail:`, err);
    }
  }
});

// Event listeners for the queue
fileQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

fileQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});

console.log('Worker started. Waiting for jobs...');