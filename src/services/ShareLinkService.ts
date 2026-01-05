import { v4 as uuidv4 } from 'uuid';
import ShareLinkRepo from '@src/repos/CosmosShareLinkRepo';
import FileRepo from '@src/repos/CosmosFileRepo';
import { getBlobUrl } from '@src/services/azure/BlobService';
import { IShareLink } from '@src/models/ShareLink';
import {
  trackEvent,
  trackException,
} from '@src/services/azure/AppInsightsService';
import logger from 'jet-logger';

export interface CreateShareLinkData {
  fileId: string;
  userId: string;
  expirationDays?: number; // Optional: 1, 7, 30, or never (undefined)
}

/**
 * Calculate expiry date based on expiration days
 */
const calculateExpiryDate = (expirationDays?: number): Date | undefined => {
  if (!expirationDays) {
    return undefined; // Never expire
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expirationDays);
  return expiryDate;
};

/**
 * Calculate TTL in seconds for Cosmos DB
 */
const calculateTTL = (expiryDate?: Date): number | undefined => {
  if (!expiryDate) {
    return undefined; // No TTL
  }

  const now = new Date();
  const diffInSeconds = Math.floor(
    (expiryDate.getTime() - now.getTime()) / 1000,
  );
  return diffInSeconds > 0 ? diffInSeconds : undefined;
};

/**
 * Create a share link
 */
export const createShareLink = async (
  data: CreateShareLinkData,
): Promise<IShareLink> => {
  try {
    // Verify file exists and user owns it
    const file = await FileRepo.getFileById(data.fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.userId !== data.userId) {
      throw new Error('Unauthorized access to file');
    }

    if (file.status !== 'active') {
      throw new Error('Cannot share deleted file');
    }

    // Calculate expiry
    const expiryDate = calculateExpiryDate(data.expirationDays);
    const ttl = calculateTTL(expiryDate);

    // Create share link
    const shareLink: IShareLink = {
      linkId: uuidv4(),
      fileId: data.fileId,
      userId: data.userId, // Store file owner
      expiryDate: expiryDate || new Date(), // Set to future date or current if never expires
      accessCount: 0,
      createdDate: new Date(),
      isRevoked: false,
      ttl,
    };

    const createdLink = await ShareLinkRepo.createShareLink(shareLink);

    trackEvent('share_link_created', {
      userId: data.userId,
      fileId: data.fileId,
      linkId: createdLink.linkId,
    });

    return createdLink;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'create_share_link',
      fileId: data.fileId,
      userId: data.userId,
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Get file via share link and generate SAS URL for blob access
 */
export const getFileByShareLink = async (
  linkId: string,
): Promise<{
  file: any;
  shareLink: IShareLink;
  downloadUrl: string; // SAS URL for blob access
}> => {
  try {
    const shareLink = await ShareLinkRepo.getShareLinkById(linkId);

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    // Check if link is valid
    if (!ShareLinkRepo.isShareLinkValid(shareLink)) {
      throw new Error('Share link is expired or revoked');
    }

    // Get file
    const file = await FileRepo.getFileById(shareLink.fileId);
    if (!file || file.status !== 'active') {
      throw new Error('File not found or deleted');
    }

    // Extract blob name from blobUrl
    // blobUrl format: https://account.blob.core.windows.net/container/userId/fileId/fileName?sv=...&sig=...
    // Remove query parameters first, then extract path
    const urlWithoutQuery = file.blobUrl.split('?')[0];
    const blobUrlParts = urlWithoutQuery.split('/');
    // Get last 3 parts: userId/fileId/fileName (skip container name)
    const containerIndex = blobUrlParts.findIndex((part) =>
      part.includes('.blob.core.windows.net'),
    );
    const blobName = blobUrlParts.slice(containerIndex + 2).join('/'); // Skip account and container

    // Generate SAS URL with expiration matching share link expiry or 24 hours, whichever is shorter
    const now = new Date();
    const expiryDate = new Date(shareLink.expiryDate);
    const hoursUntilExpiry = Math.max(
      1,
      Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)),
    );
    const sasExpirationHours = Math.min(hoursUntilExpiry, 24); // Max 24 hours, or until share link expires
    const sasUrl = getBlobUrl(blobName, sasExpirationHours);

    // Increment access count
    await ShareLinkRepo.incrementAccessCount(linkId);

    trackEvent('share_link_accessed', {
      linkId,
      fileId: shareLink.fileId,
    });

    return {
      file,
      shareLink,
      downloadUrl: sasUrl,
    };
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'get_file_by_share_link',
      linkId,
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Revoke a share link
 */
export const revokeShareLink = async (
  linkId: string,
  userId: string,
): Promise<void> => {
  try {
    const shareLink = await ShareLinkRepo.getShareLinkById(linkId);

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    // Verify file ownership using userId stored in share link
    if (shareLink.userId !== userId) {
      throw new Error('Unauthorized access');
    }

    await ShareLinkRepo.revokeShareLink(linkId);

    trackEvent('share_link_revoked', {
      userId,
      linkId,
      fileId: shareLink.fileId,
    });
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'revoke_share_link',
      linkId,
      userId,
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Get all share links for a file
 */
export const getShareLinksByFileId = async (
  fileId: string,
  userId: string,
): Promise<IShareLink[]> => {
  try {
    // Verify file exists and user owns it
    const file = await FileRepo.getFileById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.userId !== userId) {
      throw new Error('Unauthorized access to file');
    }

    const shareLinks = await ShareLinkRepo.getShareLinksByFileId(fileId);

    trackEvent('share_links_listed', {
      userId,
      fileId,
      count: String(shareLinks.length),
    });

    return shareLinks;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'get_share_links_by_file_id',
      fileId,
      userId,
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Get all share links for a user
 */
export const getUserShareLinks = async (
  userId: string,
): Promise<IShareLink[]> => {
  try {
    const shareLinks = await ShareLinkRepo.getShareLinksByUserId(userId);

    trackEvent('user_share_links_listed', {
      userId,
      count: String(shareLinks.length),
    });

    return shareLinks;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'get_user_share_links',
      userId,
    });
    logger.err(error);
    throw error;
  }
};

export default {
  createShareLink,
  getFileByShareLink,
  revokeShareLink,
  getShareLinksByFileId,
  getUserShareLinks,
};
