# CloudPix Backend Architecture

## System Overview

CloudPix is a cloud-native multimedia sharing platform built on Microsoft Azure. The backend provides a RESTful API for file management, user authentication, and sharing capabilities.

## Architecture Diagram

```
┌─────────────────┐
│   Client Apps   │
│  (Frontend/API) │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│      Azure App Service              │
│  ┌───────────────────────────────┐ │
│  │   Express.js REST API         │ │
│  │   - Authentication            │ │
│  │   - File Management           │ │
│  │   - Share Links               │ │
│  └───────────────────────────────┘ │
└────────┬────────────────────────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    │         │              │              │
    ▼         ▼              ▼              ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Cosmos  │ │  Blob    │ │ App      │ │  Functions   │
│   DB    │ │ Storage  │ │ Insights │ │  (Async)     │
└─────────┘ └──────────┘ └──────────┘ └──────────────┘
```

## Component Details

### 1. Azure App Service (Express.js API)

**Responsibilities:**
- Handle HTTP requests
- Authentication & authorization
- Request validation
- Business logic orchestration
- Error handling

**Key Features:**
- JWT-based authentication
- File upload handling
- Share link generation
- RESTful API design

### 2. Azure Cosmos DB

**Collections:**

#### Users Collection
- **Partition Key**: `userId`
- **Indexes**: `email` (unique)
- **Purpose**: Store user accounts and authentication data

#### Files Collection
- **Partition Key**: `fileId`
- **Indexes**: `userId` (for querying user files)
- **Purpose**: Store file metadata
- **Relationships**: One User → Many Files

#### ShareLinks Collection
- **Partition Key**: `linkId`
- **Indexes**: `fileId` (for querying file shares)
- **TTL**: Automatic expiration support
- **Purpose**: Store share link information
- **Relationships**: One File → Many ShareLinks

**Data Flow:**
1. User uploads file → Metadata saved to Files collection
2. User creates share link → Record saved to ShareLinks collection
3. Share link accessed → Access count incremented
4. File deleted → Cascade delete share links

### 3. Azure Blob Storage

**Structure:**
```
cloudpix-files/
  └── {userId}/
      └── {fileId}/
          └── {fileName}
```

**Features:**
- Public read access for shared files
- Content-type preservation
- Automatic container creation
- Blob URL generation

**Operations:**
- Upload: Store file with metadata
- Download: Retrieve file by blob URL
- Delete: Remove file and metadata

### 4. Azure Functions

#### Thumbnail Processor
- **Trigger**: Queue message
- **Purpose**: Generate thumbnails for uploaded images
- **Input**: File metadata (fileId, blobUrl, contentType)
- **Output**: Thumbnail blob URL (stored in Cosmos DB)

#### Cleanup Expired
- **Trigger**: Timer (daily at midnight)
- **Purpose**: Clean up expired share links
- **Note**: Cosmos DB TTL handles most cleanup automatically

### 5. Application Insights

**Telemetry Collected:**
- Custom events (file uploads, shares, logins)
- Metrics (file sizes, access counts)
- Dependencies (Cosmos DB, Blob Storage calls)
- Exceptions and errors
- Performance traces

## Data Flow

### File Upload Flow

```
1. Client → POST /api/files/upload
2. API validates file (size, type)
3. API uploads to Blob Storage
4. API saves metadata to Cosmos DB
5. API triggers Function (queue message)
6. Function processes thumbnail (async)
7. API returns file metadata to client
```

### Share Link Flow

```
1. Client → POST /api/files/:id/share
2. API verifies file ownership
3. API creates ShareLink record in Cosmos DB
4. API sets TTL for automatic expiration
5. API returns share link to client
6. Client shares link → GET /api/share/:linkId
7. API validates link (not expired, not revoked)
8. API increments access count
9. API returns file metadata
```

### Authentication Flow

```
1. Client → POST /api/auth/register
2. API hashes password (bcrypt)
3. API creates User in Cosmos DB
4. API generates JWT token
5. API returns token to client
6. Client includes token in Authorization header
7. API validates token on protected routes
8. API extracts userId from token
```

## Security Architecture

### Authentication
- **Method**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt (10 salt rounds)
- **Token Expiry**: Configurable (default 24h)
- **Storage**: Tokens stored client-side, not in database

### Authorization
- **Middleware**: JWT verification on protected routes
- **File Access**: User can only access their own files
- **Share Links**: Public access with expiration/revocation

### Data Protection
- **Connection Strings**: Stored in environment variables
- **HTTPS**: Enforced in production
- **Input Validation**: All inputs validated before processing
- **Error Handling**: No sensitive data in error messages

## Scalability Considerations

### Horizontal Scaling
- **App Service**: Auto-scaling based on CPU/memory metrics
- **Cosmos DB**: Global distribution with multiple regions
- **Blob Storage**: Automatically scales with usage

### Partitioning Strategy
- **Users**: Partitioned by userId (even distribution)
- **Files**: Partitioned by fileId (even distribution)
- **ShareLinks**: Partitioned by linkId (even distribution)

### Performance Optimization
- **Connection Pooling**: Reuse Cosmos DB connections
- **Async Operations**: Background processing via Functions
- **Caching**: Consider Azure Redis Cache for frequently accessed data
- **CDN**: Use Azure Front Door for static content delivery

## Monitoring & Observability

### Application Insights Integration
- Custom events for business operations
- Performance metrics for API endpoints
- Dependency tracking for Azure services
- Exception logging and alerting

### Health Checks
- `/api/health`: Basic health check
- `/api/metrics`: Application Insights status

### Logging
- Structured logging with jet-logger
- Error tracking with Application Insights
- Request logging with Morgan (development)

## Deployment Architecture

### Development
- Local Node.js server
- Azure services accessed via connection strings
- Hot reload with nodemon

### Production
- Azure App Service (Linux)
- Managed identity for service authentication
- Application Insights for monitoring
- Auto-scaling enabled
- HTTPS only

## Future Enhancements

1. **CDN Integration**: Azure Front Door for global content delivery
2. **Redis Cache**: Cache frequently accessed metadata
3. **Event Grid**: Event-driven architecture for file processing
4. **Key Vault**: Secure secret management
5. **Managed Identity**: Remove connection strings
6. **Multi-region**: Global distribution for low latency
7. **Backup & DR**: Automated backups and disaster recovery

## Cost Optimization

- **App Service**: Use appropriate SKU for workload
- **Cosmos DB**: Autoscale RU/s based on demand
- **Blob Storage**: Use appropriate access tier (hot/cool/archive)
- **Functions**: Consumption plan (pay per execution)
- **Monitoring**: Set up cost alerts

## Compliance & Governance

- **Data Residency**: Configure Cosmos DB regions
- **Retention Policies**: Set up blob lifecycle management
- **Access Control**: Use Azure RBAC
- **Audit Logging**: Enable diagnostic logs
- **Backup**: Regular automated backups

