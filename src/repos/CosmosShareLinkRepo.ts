import { getContainer } from '@src/services/azure/CosmosService';

import { IShareLink } from '@src/models/ShareLink';
import logger from 'jet-logger';
import { CONTAINER_NAMES } from '@src/common/constants';

/**
 * Create a new share link
 */
export const createShareLink = async (
  shareLink: IShareLink,
): Promise<IShareLink> => {
  try {
    const container = await getContainer(
      CONTAINER_NAMES.SHARE_LINKS,
      '/linkId',
    );
    const { resource } = await container.items.create(shareLink);

    if (!resource) {
      throw new Error('Failed to create share link');
    }

    return resource as IShareLink;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to create share link');
  }
};

/**
 * Get share link by linkId
 */
export const getShareLinkById = async (
  linkId: string,
): Promise<IShareLink | null> => {
  try {
    const container = await getContainer(
      CONTAINER_NAMES.SHARE_LINKS,
      '/linkId',
    );
    // Query by linkId (partition key) instead of using item(id, partitionKey)
    // because Cosmos DB auto-generates an 'id' field that differs from linkId
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.linkId = @linkId',
      parameters: [
        {
          name: '@linkId',
          value: linkId,
        },
      ],
    };

    const { resources } = await container.items
      .query<IShareLink>(querySpec)
      .fetchAll();
    return resources.length > 0 ? resources[0] : null;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    logger.err(error);
    throw new Error('Failed to get share link');
  }
};

/**
 * Get all share links for a file
 */
export const getShareLinksByFileId = async (
  fileId: string,
): Promise<IShareLink[]> => {
  try {
    const container = await getContainer(
      CONTAINER_NAMES.SHARE_LINKS,
      '/linkId',
    );
    const querySpec = {
      query:
        'SELECT * FROM c WHERE c.fileId = @fileId AND c.isRevoked = @isRevoked',
      parameters: [
        {
          name: '@fileId',
          value: fileId,
        },
        {
          name: '@isRevoked',
          value: false,
        },
      ],
    };

    const { resources } = await container.items
      .query<IShareLink>(querySpec)
      .fetchAll();
    return resources;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to get share links for file');
  }
};

/**
 * Update share link
 */
export const updateShareLink = async (
  shareLink: IShareLink,
): Promise<IShareLink> => {
  try {
    const container = await getContainer(
      CONTAINER_NAMES.SHARE_LINKS,
      '/linkId',
    );
    // First, get the share link to find the Cosmos DB 'id' field
    const existingLink = await getShareLinkById(shareLink.linkId);
    if (!existingLink) {
      throw new Error('Share link not found');
    }

    // Use the Cosmos DB 'id' field for the replace operation
    const cosmosId = (existingLink as any).id || shareLink.linkId;
    const { resource } = await container
      .item(cosmosId, shareLink.linkId)
      .replace(shareLink);

    if (!resource) {
      throw new Error('Failed to update share link');
    }

    return resource as IShareLink;
  } catch (error: any) {
    logger.err(error);
    throw new Error('Failed to update share link');
  }
};

/**
 * Revoke share link
 */
export const revokeShareLink = async (linkId: string): Promise<void> => {
  try {
    const shareLink = await getShareLinkById(linkId);
    if (!shareLink) {
      throw new Error('Share link not found');
    }

    shareLink.isRevoked = true;
    await updateShareLink(shareLink);
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to revoke share link');
  }
};

/**
 * Increment access count
 */
export const incrementAccessCount = async (linkId: string): Promise<void> => {
  try {
    const shareLink = await getShareLinkById(linkId);
    if (!shareLink) {
      throw new Error('Share link not found');
    }

    shareLink.accessCount = (shareLink.accessCount || 0) + 1;
    await updateShareLink(shareLink);
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to increment access count');
  }
};

/**
 * Delete all share links for a file (cascade delete)
 */
export const deleteShareLinksByFileId = async (
  fileId: string,
): Promise<void> => {
  try {
    const shareLinks = await getShareLinksByFileId(fileId);

    const container = await getContainer(
      CONTAINER_NAMES.SHARE_LINKS,
      '/linkId',
    );

    for (const link of shareLinks) {
      // Get the Cosmos DB 'id' field
      const existingLink = await getShareLinkById(link.linkId);
      if (existingLink) {
        const cosmosId = (existingLink as any).id || link.linkId;
        await container.item(cosmosId, link.linkId).delete();
      }
    }
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to delete share links for file');
  }
};

/**
 * Get all share links for a user
 */
export const getShareLinksByUserId = async (
  userId: string,
): Promise<IShareLink[]> => {
  try {
    const container = await getContainer(
      CONTAINER_NAMES.SHARE_LINKS,
      '/linkId',
    );
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId',
      parameters: [
        {
          name: '@userId',
          value: userId,
        },
      ],
    };

    const { resources } = await container.items
      .query<IShareLink>(querySpec)
      .fetchAll();
    return resources;
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to get share links for user');
  }
};

/**
 * Check if share link is valid (not expired, not revoked)
 */
export const isShareLinkValid = (shareLink: IShareLink): boolean => {
  if (shareLink.isRevoked) {
    return false;
  }

  if (shareLink.expiryDate && new Date(shareLink.expiryDate) < new Date()) {
    return false;
  }

  return true;
};

export default {
  createShareLink,
  getShareLinkById,
  getShareLinksByFileId,
  getShareLinksByUserId,
  updateShareLink,
  revokeShareLink,
  incrementAccessCount,
  deleteShareLinksByFileId,
  isShareLinkValid,
};
