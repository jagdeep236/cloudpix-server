# File Sharing Workflow Documentation

## Overview

CloudPix implements a secure, time-limited file sharing system using Azure Cosmos DB for metadata and Azure Blob Storage for file storage. Share links are revocable and support automatic cleanup via TTL.

## Architecture

```
User Upload → Blob Storage → Cosmos DB (File Metadata)
     ↓
Create Share Link → Cosmos DB (ShareLink) → Generate Share URL
     ↓
Access Share Link → Validate → Generate SAS URL → Download
```

## Data Model

### ShareLinks Collection (Cosmos DB)

- **linkId** (GUID, partition key): Unique identifier for the share link
- **fileId** (FK → Files.fileId): Reference to the shared file
- **userId** (FK → Users.userId): File owner
- **expiryDate**: When the share link expires
- **accessCount**: Number of times the link has been accessed
- **createdDate**: When the link was created
- **isRevoked**: Whether the link has been manually revoked
- **ttl** (optional): Time to live in seconds for automatic cleanup

### Relationships

- One File → Many Share Links (cascade delete on file deletion)
- Share Link → One File (via fileId)
- Share Link → One User (file owner via userId)

## API Endpoints

### 1. Create Share Link

**POST** `/api/files/:fileId/share`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "expirationDays": 7  // Optional: 1, 7, 30, or omit for never expires
}
```

**Response**:
```json
{
  "linkId": "uuid",
  "fileId": "uuid",
  "userId": "uuid",
  "expiryDate": "2025-12-27T12:00:00Z",
  "accessCount": 0,
  "createdDate": "2025-12-26T12:00:00Z",
  "isRevoked": false,
  "shareUrl": "http://localhost:5173/share/{linkId}"
}
```

### 2. Get File via Share Link

**GET** `/api/share/:linkId`

**Authentication**: Not required (public endpoint)

**Response**:
```json
{
  "file": {
    "fileId": "uuid",
    "fileName": "example.jpg",
    "contentType": "image/jpeg",
    "fileSize": 5242880,
    "uploadDate": "2025-12-26T10:00:00Z"
  },
  "shareLink": {
    "linkId": "uuid",
    "fileId": "uuid",
    "userId": "uuid",
    "expiryDate": "2025-12-27T12:00:00Z",
    "accessCount": 1,
    "createdDate": "2025-12-26T12:00:00Z",
    "isRevoked": false
  },
  "downloadUrl": "https://account.blob.core.windows.net/container/path?sv=...&sig=..."
}
```

**Notes**:
- Automatically increments `accessCount`
- Generates short-lived SAS URL (max 24 hours or until share link expires)
- Validates link is not expired or revoked

### 3. Revoke Share Link

**POST** `/api/share/:linkId/revoke`

**Authentication**: Required (JWT, must be file owner)

**Response**:
```json
{
  "message": "Share link revoked successfully"
}
```

### 4. List Share Links for File

**GET** `/api/files/:fileId/share-links`

**Authentication**: Required (JWT, must be file owner)

**Response**:
```json
{
  "shareLinks": [
    {
      "linkId": "uuid",
      "fileId": "uuid",
      "userId": "uuid",
      "expiryDate": "2025-12-27T12:00:00Z",
      "accessCount": 5,
      "createdDate": "2025-12-26T12:00:00Z",
      "isRevoked": false,
      "shareUrl": "http://localhost:5173/share/{linkId}"
    }
  ]
}
```

## Security Features

1. **JWT Authentication**: Protected endpoints require valid JWT token
2. **Ownership Verification**: Users can only create/revoke share links for their own files
3. **Time-Limited Access**: Share links expire based on `expiryDate`
4. **Revocable Links**: File owners can revoke share links at any time
5. **SAS Tokens**: Blob access uses short-lived SAS tokens (never expose raw blob URLs)
6. **Access Tracking**: All share link accesses are tracked via `accessCount`

## Automatic Cleanup

- **TTL Support**: Share links with `ttl` set are automatically deleted by Cosmos DB when expired
- **Cascade Delete**: When a file is deleted, all associated share links are automatically deleted

## Example Usage

### Create a Share Link

```bash
curl -X POST http://localhost:3000/api/files/{fileId}/share \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"expirationDays": 7}'
```

### Access Shared File

```bash
curl http://localhost:3000/api/share/{linkId}
```

### Revoke Share Link

```bash
curl -X POST http://localhost:3000/api/share/{linkId}/revoke \
  -H "Authorization: Bearer {token}"
```

### List Share Links

```bash
curl http://localhost:3000/api/files/{fileId}/share-links \
  -H "Authorization: Bearer {token}"
```

## Frontend Integration

The frontend provides:

1. **ShareView Page** (`/share/:linkId`): Public page for accessing shared files
2. **Share API Integration**: RTK Query hooks for creating/revoking share links
3. **Share Button**: UI component to create share links for files

## Monitoring

All share link operations are tracked via Application Insights:
- `share_link_created`: When a share link is created
- `share_link_accessed`: When a share link is accessed
- `share_link_revoked`: When a share link is revoked
- `share_links_listed`: When share links are listed

