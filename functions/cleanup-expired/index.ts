import { app, InvocationContext, Timer } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

/**
 * Azure Function to cleanup expired share links
 * Runs daily at midnight (0 0 * * * *)
 * Cosmos DB TTL will handle automatic deletion, but this function
 * can be used for additional cleanup or logging
 */
export async function cleanupExpired(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Running cleanup of expired share links');

  try {
    const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
    const cosmosKey = process.env.COSMOS_DB_KEY;
    const databaseName = process.env.COSMOS_DB_NAME || 'CloudPixDB';

    if (!cosmosEndpoint || !cosmosKey) {
      context.log.warn('Cosmos DB not configured, skipping cleanup');
      return;
    }

    const cosmosClient = new CosmosClient({
      endpoint: cosmosEndpoint,
      key: cosmosKey,
    });
    const database = cosmosClient.database(databaseName);
    const container = database.container('ShareLinks');

    // Query for expired links (TTL should handle this, but we can log them)
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.expiryDate < @now AND c.isRevoked = false',
      parameters: [
        {
          name: '@now',
          value: new Date().toISOString(),
        },
      ],
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    context.log(`Found ${resources.length} expired share links (TTL will handle deletion)`);

    // Cosmos DB TTL will automatically delete items with expired TTL
    // This function is mainly for monitoring and logging
  } catch (error) {
    context.log.error('Error during cleanup:', error);
    throw error;
  }
}

app.timer('cleanupExpired', {
  schedule: '0 0 * * * *', // Daily at midnight
  handler: cleanupExpired,
});

