import logger from 'jet-logger';

import ENV from '@src/common/constants/ENV';
import server from './server';
import { getContainer } from './services/azure/CosmosService';

// Azure App Service sets PORT automatically, but we use ENV.Port which handles it
// Convert to number to ensure it's not an object
const port = Number(ENV.Port) || Number(process.env.PORT) || 3000;

const CONTAINER_NAMES = {
  USERS: 'Users',
  FILES: 'Files',
  SHARE_LINKS: 'ShareLinks',
};

/**
 * Initialize all Cosmos DB containers
 */
async function initializeContainers(): Promise<void> {
  try {
    // Users container - partition key: userId
    await getContainer(CONTAINER_NAMES.USERS, '/userId');
    logger.info(`Container '${CONTAINER_NAMES.USERS}' initialized`);

    // Files container - partition key: fileId
    await getContainer(CONTAINER_NAMES.FILES, '/fileId');
    logger.info(`Container '${CONTAINER_NAMES.FILES}' initialized`);

    // ShareLinks container - partition key: linkId
    await getContainer(CONTAINER_NAMES.SHARE_LINKS, '/linkId');
    logger.info(`Container '${CONTAINER_NAMES.SHARE_LINKS}' initialized`);
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to initialize Cosmos DB containers');
  }
}

// Initialize Cosmos DB containers
initializeContainers()
  .then(() => {
    // Start the server
    server.listen(port, (err) => {
      if (!!err) {
        logger.err(err.message);
        throw new Error(`Failed to start server: ${err.message}`);
      } else {
        logger.info(`Express server started on port: ${port}`);
        logger.info('Server is ready to accept connections');
      }
    });
  })
  .catch((error: unknown) => {
    if (error instanceof Error) {
      logger.err(`Failed to initialize database: ${error.message}`);
      throw error;
    } else {
      const errorMessage =
        typeof error === 'string' ? error : JSON.stringify(error);
      logger.err(`Failed to initialize database: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  });
