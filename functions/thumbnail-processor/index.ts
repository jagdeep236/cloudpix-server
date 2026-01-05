import { app, InvocationContext, output } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { CosmosClient } from '@azure/cosmos';

/**
 * Azure Function to process thumbnails for uploaded files
 * Triggered by queue message when a file is uploaded
 */
export async function thumbnailProcessor(
  fileMessage: string,
  context: InvocationContext
): Promise<void> {
  context.log('Processing thumbnail for file:', fileMessage);

  try {
    const message = JSON.parse(fileMessage);
    const { fileId, userId, blobUrl, contentType } = message;

    // Only process images
    if (!contentType.startsWith('image/')) {
      context.log('Skipping thumbnail generation for non-image file');
      return;
    }

    // Get blob storage connection
    const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_BLOB_CONNECTION_STRING not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = process.env.BLOB_CONTAINER_NAME || 'cloudpix-files';

    // Extract blob name from URL
    const blobName = blobUrl.split('/').slice(-3).join('/');

    // Download original image
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blobClient.download();
    const imageBuffer = await streamToBuffer(downloadResponse.readableStreamBody!);

    // Generate thumbnail (simplified - in production, use sharp or similar)
    // For now, we'll just log that thumbnail processing would happen here
    context.log('Thumbnail generation would occur here for:', blobName);

    // Update Cosmos DB with thumbnail URL (if needed)
    const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
    const cosmosKey = process.env.COSMOS_DB_KEY;
    const databaseName = process.env.COSMOS_DB_NAME || 'CloudPixDB';

    if (cosmosEndpoint && cosmosKey) {
      const cosmosClient = new CosmosClient({
        endpoint: cosmosEndpoint,
        key: cosmosKey,
      });
      const database = cosmosClient.database(databaseName);
      const container = database.container('Files');

      // Update file record with thumbnail URL
      const thumbnailUrl = `${blobUrl}_thumb`;
      // In production, implement actual thumbnail generation and upload

      context.log('Thumbnail processing completed for file:', fileId);
    }
  } catch (error) {
    context.log.error('Error processing thumbnail:', error);
    throw error;
  }
}

/**
 * Helper function to convert stream to buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

app.queue('thumbnailProcessor', {
  queueName: 'thumbnail-processing',
  connection: 'AzureWebJobsStorage',
  handler: thumbnailProcessor,
});

