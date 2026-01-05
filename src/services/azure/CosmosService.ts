import { CosmosClient, Database, Container } from '@azure/cosmos';
import logger from 'jet-logger';

interface CosmosConfig {
  endpoint: string;
  key: string;
  databaseName: string;
}

// Get connection details from environment variables
const getCosmosConfig = (): CosmosConfig => {
  const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseName = process.env.COSMOS_DB_NAME || 'CloudPixDB';

  if (connectionString) {
    // Parse connection string if provided
    const parts = connectionString.split(';');
    const endpointPart = parts.find(p => p.startsWith('AccountEndpoint='));
    const keyPart = parts.find(p => p.startsWith('AccountKey='));
    
    if (endpointPart && keyPart) {
      return {
        endpoint: endpointPart.split('=')[1],
        key: keyPart.split('=')[1],
        databaseName,
      };
    }
  }

  if (!endpoint || !key) {
    throw new Error(
      'Cosmos DB configuration missing. Provide either ' +
      'AZURE_COSMOS_CONNECTION_STRING or COSMOS_DB_ENDPOINT + COSMOS_DB_KEY'
    );
  }

  return { endpoint, key, databaseName };
};

let config: CosmosConfig | null = null;
let client: CosmosClient | null = null;
let databaseInstance: Database | null = null;

/**
 * Get or initialize Cosmos client
 */
const getClient = (): CosmosClient => {
  if (!client) {
    if (!config) {
      config = getCosmosConfig();
    }
    client = new CosmosClient({
      endpoint: config.endpoint,
      key: config.key,
    });
  }
  return client;
};

/**
 * Get or create the database instance
 */
export const getDatabase = async (): Promise<Database> => {
  if (databaseInstance) {
    return databaseInstance;
  }

  try {
    if (!config) {
      config = getCosmosConfig();
    }
    const cosmosClient = getClient();
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: config.databaseName,
    });
    databaseInstance = database;
    logger.info(`Cosmos DB database '${config.databaseName}' ready`);
    return database;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to connect to Cosmos DB');
  }
};

/**
 * Get or create a container
 */
export const getContainer = async (
  containerId: string,
  partitionKey = '/id'
): Promise<Container> => {
  const database = await getDatabase();
  
  try {
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: {
        paths: [partitionKey],
      },
    });
    return container;
  } catch (error) {
    logger.err(error);
    throw new Error(`Failed to get container '${containerId}'`);
  }
};

/**
 * Get the Cosmos client instance
 */
export const getCosmosClient = (): CosmosClient => {
  return getClient();
};

export default {
  getDatabase,
  getContainer,
  getCosmosClient,
};

