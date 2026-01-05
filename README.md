# CloudPix Backend

Cloud-Native Multimedia Sharing Platform backend built with Node.js, Express, and Azure services.

## Architecture Overview

CloudPix backend is a RESTful API service that provides file upload, storage, management, and sharing capabilities using Microsoft Azure cloud services.

### Technology Stack

- **Runtime**: Node.js with Express.js
- **Database**: Azure Cosmos DB (NoSQL)
- **Storage**: Azure Blob Storage
- **Authentication**: JWT (jsonwebtoken + bcrypt)
- **Monitoring**: Azure Application Insights
- **Functions**: Azure Functions for background processing
- **Hosting**: Azure App Service

## Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── azure/          # Azure service integrations
│   │   ├── AuthService.ts   # Authentication logic
│   │   ├── FileService.ts   # File management
│   │   └── ShareLinkService.ts # Share link management
│   ├── repos/              # Data access layer (Cosmos DB)
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── utils/              # Utility functions
│   └── server.ts           # Express app setup
├── functions/              # Azure Functions
│   ├── thumbnail-processor/
│   └── cleanup-expired/
└── config/                # Configuration files
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get user profile (protected)

### Files
- `POST /api/files/upload` - Upload a file (protected)
- `GET /api/files` - List user's files (protected)
- `GET /api/files/:id` - Get file metadata (protected)
- `DELETE /api/files/:id` - Delete a file (protected)
- `POST /api/files/:id/share` - Create share link (protected)

### Share Links
- `GET /api/share/:linkId` - Access file via share link (public)
- `POST /api/share/:linkId/revoke` - Revoke share link (protected)

### System
- `GET /api/health` - Health check
- `GET /api/metrics` - Application Insights metrics

## Environment Variables

Create a `.env` file in the root directory (see `.env.example` for template):

```env
# Azure Cosmos DB
AZURE_COSMOS_CONNECTION_STRING=your-connection-string
# OR
COSMOS_DB_ENDPOINT=your-endpoint
COSMOS_DB_KEY=your-key
COSMOS_DB_NAME=CloudPixDB

# Azure Blob Storage
AZURE_BLOB_CONNECTION_STRING=your-connection-string
BLOB_CONTAINER_NAME=cloudpix-files

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Application Insights (optional)
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string

# Server
PORT=3000
NODE_ENV=development
```

## Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your Azure service connection strings

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Data Models

### Users Collection
- `userId` (GUID, partition key)
- `email` (unique, indexed)
- `passwordHash`
- `createdDate`
- `lastLogin`

### Files Collection
- `fileId` (GUID, partition key)
- `userId` (FK → Users.userId)
- `fileName`
- `blobUrl`
- `fileSize`
- `contentType`
- `uploadDate`
- `status` (active/deleted)

### ShareLinks Collection
- `linkId` (GUID, partition key)
- `fileId` (FK → Files.fileId)
- `expiryDate`
- `accessCount`
- `createdDate`
- `isRevoked`
- `ttl` (for Cosmos DB automatic expiration)

## Features

- ✅ JWT-based authentication
- ✅ Secure password hashing with bcrypt
- ✅ File upload to Azure Blob Storage
- ✅ Metadata storage in Cosmos DB
- ✅ Share links with expiration
- ✅ Cascade delete (files → share links)
- ✅ TTL support for automatic link expiration
- ✅ Application Insights integration
- ✅ File type and size validation
- ✅ Azure Functions ready for async processing

## Azure Functions

The `functions/` directory contains Azure Functions for:
- **Thumbnail Processing**: Generates thumbnails for uploaded images
- **Cleanup Expired**: Removes expired share links (TTL handles most of this)

See `DEPLOYMENT.md` for Azure Functions deployment instructions.

## Testing

```bash
npm test
```

## Deployment

See `DEPLOYMENT.md` for detailed Azure App Service deployment instructions.

## Additional Notes

- Development mode uses `swc` for performance and does NOT check TypeScript errors
- Run `npm run type-check` to verify TypeScript compilation
- For bcrypt issues on MacOS: `npm rebuild bcrypt --build-from-source`
