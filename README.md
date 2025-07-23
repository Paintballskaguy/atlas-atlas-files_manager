# Files Manager

Files Manager is a comprehensive file management system built with Node.js, Express, MongoDB, and Redis. It provides user authentication, file storage, and image processing capabilities. The system allows users to upload files, manage their visibility (public/private), and generates thumbnails for images automatically.

## Key Features

- User authentication with JWT tokens

- File upload and management

- Image thumbnail generation (100px, 250px, 500px)

- File visibility control (public/private)

- Paginated file listing

- RESTful API design

## Technologies Used

- **Node.js** - JavaScript runtime

- **Express** - Web framework

- **MongoDB** - Database for storing metadata

- **Redis** - For token storage and queue management

- **Bull** - Queue system for background processing

- **Image Thumbnail** - For generating thumbnails

- **Mime-types** - For detecting file types

## Installation

### Prerequisites

- **Node.js v18+**

- **MongoDB**

- **Redis**

## Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/Paintballskaguy/atlas-atlas-files_manager.git
    cd atlas-atlas-files_manager

2. Install dependencies

    ``` bash
    npm install

3. Create environment file:

    ``` bash
    echo "PORT=5001" > .env
    echo "DB_HOST=127.0.0.1" >> .env
    echo "DB_PORT=27017" >> .env
    echo "DB_DATABASE=files_manager" >> .env
    echo "REDIS_HOST=127.0.0.1" >> .env
    echo "REDIS_PORT=6379" >> .env
    echo "FOLDER_PATH=/tmp/files_manager" >> .env3


4. Create storage directory:

    ```bash
    mkdir -p /tmp/files_manager

5. Start services:

    ```bash
    sudo service mongod start
    sudo service redis-server start

## Running the Application

### Start the Server

    ```bash
    npm run start-server

### Start the Worker (in a separate terminal)

    ```bash
    npm run start-worker

## API Reference

### Authentication

- ***POST /users*** - Create a new user

- ***GET /connect*** - Authenticate and get token

- ***GET /disconnect*** - Invalidate token

- ***GET /users/me*** - Get current user

### Files

- ***POST /files*** - Upload a file

- ***GET /files/:id*** - Get file metadata

- ***GET /files*** - List files (paginated)

- ***PUT /files/:id/publish*** - Make file public

- ***PUT /files/:id/unpublish*** - Make file private

- ***GET /files/:id/data*** - Get file content

## Testing Examples

1. Create a User

    ```bash
    curl -XPOST <http://localhost:5001/users> \
    -H "Content-Type: application/json" \
    -d '{"email": "<test@example.com>", "password": "password123"}'

2. Get Authentication Token

    ```bash
    TOKEN=$(curl -s -XGET http://localhost:5001/connect \
    -H "Authorization: Basic $(echo -n '<test@example.com>:password123' | base64)" | jq -r '.token')
    echo "Token: $TOKEN"

3. Upload a Text File

    ```bash
    curl -XPOST <http://localhost:5001/files> \
    -H "X-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "test.txt",
        "type": "file",
        "parentId": "0",
        "isPublic": true,
        "data": "VGhpcyBpcyBhIHRlc3QgZmlsZQ=="
    }'

4. Upload an Image

    ```bash
    curl -XPOST <http://localhost:5001/files> \
    -H "X-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "test.png",
        "type": "image",
        "parentId": "0",
        "isPublic": true,
        "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    }'
5. Get File List

    ```bash
    curl -XGET <http://localhost:5001/files> \
    -H "X-Token: $TOKEN"
6. Retrieve File Content

    ```bash

    # Get file ID from upload response

    FILE_ID="your-file-id-here"

    # Original file

    curl <http://localhost:5001/files/$FILE_ID/data> -o file.txt

    # For images with different sizes

    curl "<http://localhost:5001/files/$FILE_ID/data?size=100>" -o 100.png
    curl "<http://localhost:5001/files/$FILE_ID/data?size=250>" -o 250.png
    curl "<http://localhost:5001/files/$FILE_ID/data?size=500>" -o 500.png

7. Publish a File

    ```bash
    curl -XPUT <http://localhost:5001/files/$FILE_ID/publish> \
    -H "X-Token: $TOKEN"
8. Unpublish a File

    ```bash
    curl -XPUT http://localhost:5001/files/$FILE_ID/unpublish \
    -H "X-Token: $TOKEN"

## Worker Output Examples

When you upload an image, the worker will process it and generate thumbnails:

    ```text
    Worker started. Waiting for jobs...
    Job 1 completed
    Generated 100px thumbnail for /tmp/files_manager/uuid
    Generated 250px thumbnail for /tmp/files_manager/uuid
    Generated 500px thumbnail for /tmp/files_manager/uuid

## File Structure

    ```text
    files-manager/
    ├── controllers/          # Business logic
    │   ├── AppController.js
    │   ├── AuthController.js
    │   ├── FilesController.js
    │   └── UsersController.js
    ├── routes/               # API routes
    │   └── index.js
    ├── utils/                # Utility modules
    │   ├── db.js
    │   ├── redis.js
    │   └── queue.js
    ├── worker.cjs            # Background worker
    ├── server.js             # Main server file
    ├── package.json
    └── .env                  # Environment variables

## Troubleshooting

### Common Issues

1. **Redis connection refused:**

    - Ensure Redis is running: sudo service redis-server start

    - Verify connection: redis-cli ping (should return "PONG")

2. **MongoDB connection issues:**

    - Start MongoDB: sudo service mongod start

    - Check status: sudo service mongod status

3. **File permission errors:**

    ```bash
    chmod -R 777 /tmp/files_manager

4. **Missing dependencies:**

    ```bash
    rm -rf node_modules
    npm install

5. **Checking Services**

    ```bash

    # Check Redis

    redis-cli ping

    # Check MongoDB

    mongosh --eval "db.stats()"

    # Check running processes

    ps aux | grep -e node -e redis -e mongo

## License

This project is licensed under the MIT License

## Authors

- John Wilson
- Harrison Gearhart
