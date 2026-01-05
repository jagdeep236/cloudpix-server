import { getContainer } from '@src/services/azure/CosmosService';

import { IFile } from '@src/models/File';
import logger from 'jet-logger';
import { CONTAINER_NAMES } from '@src/common/constants';

/**
 * Create a new file record
 */
export const createFile = async (file: IFile): Promise<IFile> => {
  try {
    const container = await getContainer(CONTAINER_NAMES.FILES, '/fileId');
    const { resource } = await container.items.create(file);

    if (!resource) {
      throw new Error('Failed to create file');
    }

    return resource as IFile;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to create file');
  }
};

/**
 * Get file by fileId
 */
export const getFileById = async (fileId: string): Promise<IFile | null> => {
  try {
    const container = await getContainer(CONTAINER_NAMES.FILES, '/fileId');
    // Query by fileId since Cosmos DB auto-generates 'id' field
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.fileId = @fileId',
      parameters: [
        {
          name: '@fileId',
          value: fileId,
        },
      ],
    };

    const { resources } = await container.items
      .query<IFile>(querySpec)
      .fetchAll();
    return resources.length > 0 ? resources[0] : null;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    logger.err(error);
    throw new Error('Failed to get file');
  }
};

/**
 * Get all files for a user
 */
export const getFilesByUserId = async (userId: string): Promise<IFile[]> => {
  try {
    const container = await getContainer(CONTAINER_NAMES.FILES, '/fileId');
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.status = @status',
      parameters: [
        {
          name: '@userId',
          value: userId,
        },
        {
          name: '@status',
          value: 'active',
        },
      ],
    };

    const { resources } = await container.items
      .query<IFile>(querySpec)
      .fetchAll();
    return resources;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to get user files');
  }
};

/**
 * Update file
 */
export const updateFile = async (file: IFile): Promise<IFile> => {
  try {
    const container = await getContainer(CONTAINER_NAMES.FILES, '/fileId');
    // Fetch existing file to get its Cosmos DB 'id'
    const existingFile = await getFileById(file.fileId);
    if (!existingFile) {
      throw new Error('File not found for update');
    }

    // Use the existing Cosmos DB 'id' for the replace operation
    const cosmosId = (existingFile as any).id || file.fileId;
    const { resource } = await container
      .item(cosmosId, file.fileId) // Use cosmosId for item ID, file.fileId for partition key
      .replace(file);

    if (!resource) {
      throw new Error('Failed to update file');
    }

    return resource as IFile;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to update file');
  }
};

/**
 * Delete file (soft delete by setting status to deleted)
 */
export const deleteFile = async (fileId: string): Promise<void> => {
  try {
    const file = await getFileById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    file.status = 'deleted';
    await updateFile(file);
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Hard delete file from Cosmos DB
 */
export const hardDeleteFile = async (fileId: string): Promise<void> => {
  try {
    const container = await getContainer(CONTAINER_NAMES.FILES, '/fileId');
    // Fetch existing file to get its Cosmos DB 'id'
    const existingFile = await getFileById(fileId);
    if (!existingFile) {
      return; // File doesn't exist, nothing to delete
    }

    // Use the existing Cosmos DB 'id' for the delete operation
    const cosmosId = (existingFile as any).id || fileId;
    await container.item(cosmosId, fileId).delete();
  } catch (error: any) {
    if (error.code !== 404) {
      logger.err(error);
      throw new Error('Failed to hard delete file');
    }
  }
};

export default {
  createFile,
  getFileById,
  getFilesByUserId,
  updateFile,
  deleteFile,
  hardDeleteFile,
};
