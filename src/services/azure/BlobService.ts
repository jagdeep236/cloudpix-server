import { 
  BlobServiceClient, 
  ContainerClient, 
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import logger from 'jet-logger';

interface BlobConfig {
  connectionString: string;
  containerName: string;
}

const getBlobConfig = (): BlobConfig => {
  const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING;
  const containerName = process.env.BLOB_CONTAINER_NAME || 'cloudpix-files';


  console.log({ connectionString, containerName });

  if (!connectionString) {
    throw new Error('AZURE_BLOB_CONNECTION_STRING environment variable is required');
  }

  return { connectionString, containerName };
};

let config: BlobConfig | null = null;
let blobServiceClient: BlobServiceClient | null = null;
let containerClientInstance: ContainerClient | null = null;
let sharedKeyCredential: StorageSharedKeyCredential | null = null;

/**
 * Get storage account name and key from connection string
 */
const getStorageCredentials = (): { accountName: string; accountKey: string } => {
  if (!config) {
    config = getBlobConfig();
  }
  
  const connectionString = config.connectionString;
  const accountNameRegex = /AccountName=([^;]+)/;
  const accountKeyRegex = /AccountKey=([^;]+)/;
  const accountNameMatch = accountNameRegex.exec(connectionString);
  const accountKeyMatch = accountKeyRegex.exec(connectionString);
  
  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error('Invalid connection string format');
  }
  
  return {
    accountName: accountNameMatch[1],
    accountKey: accountKeyMatch[1],
  };
};

/**
 * Get or initialize Shared Key Credential for SAS token generation
 */
const getSharedKeyCredential = (): StorageSharedKeyCredential => {
  if (!sharedKeyCredential) {
    const credentials = getStorageCredentials();
    sharedKeyCredential = new StorageSharedKeyCredential(
      credentials.accountName,
      credentials.accountKey
    );
  }
  return sharedKeyCredential;
};

/**
 * Get or initialize Blob Service client
 */
const getBlobServiceClient = (): BlobServiceClient => {
  if (!blobServiceClient) {
    if (!config) {
      config = getBlobConfig();
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
  }
  return blobServiceClient;
};

/**
 * Generate SAS token URL for a blob
 * @param blobName - Name of the blob
 * @param expiresInHours - Hours until SAS token expires (default: 1 year - maximum allowed by Azure)
 */
const generateBlobSASUrl = (
  blobName: string,
  expiresInHours = 24 * 365 // 1 year - maximum allowed by Azure Blob Storage
): string => {
  try {
    if (!config) {
      config = getBlobConfig();
    }
    
    const credentials = getStorageCredentials();
    const credential = getSharedKeyCredential();
    
    // Generate SAS token with read permissions, valid for specified hours
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + expiresInHours);
    
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: config.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse('r'), // Read permission only
        expiresOn: expiresOn,
      },
      credential
    ).toString();
    
    // Construct the full URL with SAS token
    const blobUrl = `https://${credentials.accountName}.blob.core.windows.net/${config.containerName}/${blobName}`;
    return `${blobUrl}?${sasToken}`;
  } catch (error) {
    logger.err('Error generating SAS token:', error);
    throw new Error('Failed to generate blob access URL');
  }
};

/**
 * Get or create the container client
 */
export const getContainerClient = async (): Promise<ContainerClient> => {
  if (containerClientInstance) {
    return containerClientInstance;
  }

  try {
    if (!config) {
      config = getBlobConfig();
    }
    const serviceClient = getBlobServiceClient();
    const containerClient = serviceClient.getContainerClient(config.containerName);
    // Create container without public access (private by default)
    // If public access is needed, use SAS tokens or enable it in Azure Portal
    await containerClient.createIfNotExists();
    containerClientInstance = containerClient;
    logger.info(`Blob Storage container '${config.containerName}' ready`);
    return containerClient;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to connect to Blob Storage');
  }
};

/**
 * Get a blob client for a specific file
 */
export const getBlobClient = async (
  blobName: string
): Promise<BlockBlobClient> => {
  const containerClient = await getContainerClient();
  return containerClient.getBlockBlobClient(blobName);
};

/**
 * Upload a file to blob storage
 */
export const uploadBlob = async (
  blobName: string,
  content: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> => {
  try {
    const blobClient = await getBlobClient(blobName);
    await blobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });
    
    // Return the blob URL with SAS token for access (valid for 1 year - maximum allowed by Azure)
    // Azure Blob Storage SAS tokens can be valid for up to 1 year (365 days)
    return generateBlobSASUrl(blobName, 24 * 365);
  } catch (error) {
    logger.err(error);
    throw new Error(`Failed to upload blob '${blobName}'`);
  }
};

/**
 * Delete a blob from storage
 */
export const deleteBlob = async (blobName: string): Promise<void> => {
  try {
    const blobClient = await getBlobClient(blobName);
    await blobClient.delete();
  } catch (error) {
    logger.err(error);
    throw new Error(`Failed to delete blob '${blobName}'`);
  }
};

/**
 * Get blob URL with SAS token for access
 * @param blobName - Name of the blob
 * @param expiresInHours - Hours until SAS token expires (default: 1 year - maximum allowed by Azure)
 */
export const getBlobUrl = (
  blobName: string,
  expiresInHours = 24 * 365 // 1 year - maximum allowed by Azure Blob Storage
): string => {
  return generateBlobSASUrl(blobName, expiresInHours);
};

/**
 * Check if a blob exists
 */
export const blobExists = async (blobName: string): Promise<boolean> => {
  try {
    const blobClient = await getBlobClient(blobName);
    return await blobClient.exists();
  } catch (error) {
    logger.err(error);
    return false;
  }
};

export default {
  getContainerClient,
  getBlobClient,
  uploadBlob,
  deleteBlob,
  getBlobUrl,
  blobExists,
};

