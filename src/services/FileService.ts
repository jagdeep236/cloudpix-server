import { v4 as uuidv4 } from 'uuid';
import FileRepo from '@src/repos/CosmosFileRepo';
import ShareLinkRepo from '@src/repos/CosmosShareLinkRepo';
import { uploadBlob, deleteBlob } from '@src/services/azure/BlobService';
import { IFile } from '@src/models/File';
import {
  trackEvent,
  trackException,
  trackMetric,
} from '@src/services/azure/AppInsightsService';
import logger from 'jet-logger';

export interface UploadFileData {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  buffer: Buffer;
}

/**
 * Upload a file
 */
export const uploadFile = async (data: UploadFileData): Promise<IFile> => {
  try {
    // Generate fileId
    const fileId = uuidv4();

    // Create blob name: {userId}/{fileId}/{fileName}
    const blobName = `${data.userId}/${fileId}/${data.fileName}`;

    // Upload to blob storage
    const blobUrl = await uploadBlob(blobName, data.buffer, data.contentType);

    // Create file record
    const file: IFile = {
      fileId,
      userId: data.userId,
      fileName: data.fileName,
      blobUrl,
      fileSize: data.fileSize,
      contentType: data.contentType,
      uploadDate: new Date(),
      status: 'active',
    };

    const createdFile = await FileRepo.createFile(file);

    trackEvent('file_upload_success', {
      userId: data.userId,
      fileId,
      contentType: data.contentType,
    });
    trackMetric('file_upload_size', data.fileSize);

    return createdFile;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'upload_file',
      userId: data.userId,
    });
    logger.err(error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Get user files
 */
export const getUserFiles = async (userId: string): Promise<IFile[]> => {
  try {
    const files = await FileRepo.getFilesByUserId(userId);
    return files;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'get_user_files',
      userId,
    });
    logger.err(error);
    throw new Error('Failed to get user files');
  }
};

/**
 * Get file by ID
 */
export const getFileById = async (
  fileId: string,
  userId: string,
): Promise<IFile> => {
  try {
    const file = await FileRepo.getFileById(fileId);

    if (!file) {
      throw new Error('File not found');
    }

    // Verify ownership
    if (file.userId !== userId) {
      throw new Error('Unauthorized access to file');
    }

    return file;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'get_file',
      fileId,
      userId,
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Update a file (rename)
 */
export const updateFile = async (
  fileId: string,
  userId: string,
  fileName: string,
): Promise<IFile> => {
  try {
    // Get file
    const file = await FileRepo.getFileById(fileId);

    if (!file) {
      throw new Error('File not found');
    }

    // Verify ownership
    if (file.userId !== userId) {
      throw new Error('Unauthorized access to file');
    }

    // Validate new fileName
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('File name cannot be empty');
    }

    // Update fileName
    const updatedFile: IFile = {
      ...file,
      fileName: fileName.trim(),
    };

    const result = await FileRepo.updateFile(updatedFile);

    trackEvent('file_update_success', {
      userId,
      fileId,
      newFileName: fileName,
    });

    return result;
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'update_file',
      fileId,
      userId,
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (
  fileId: string,
  userId: string,
): Promise<void> => {
  try {
    // Get file
    const file = await FileRepo.getFileById(fileId);

    if (!file) {
      throw new Error('File not found');
    }

    // Verify ownership
    if (file.userId !== userId) {
      throw new Error('Unauthorized access to file');
    }

    // Extract blob name from URL
    const blobName = file.blobUrl.split('/').slice(-3).join('/'); // Get last 3 parts: userId/fileId/fileName

    // Delete from blob storage
    try {
      await deleteBlob(blobName);
    } catch {
      logger.warn(
        `Failed to delete blob ${blobName}, continuing with metadata deletion`,
      );
    }

    // Delete all share links for this file (cascade delete)
    await ShareLinkRepo.deleteShareLinksByFileId(fileId);

    // Delete file record
    await FileRepo.hardDeleteFile(fileId);

    trackEvent('file_delete_success', {
      userId,
      fileId,
    });
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'delete_file',
      fileId,
      userId,
    });
    logger.err(error);
    throw error;
  }
};

export default {
  uploadFile,
  getUserFiles,
  getFileById,
  updateFile,
  deleteFile,
};
