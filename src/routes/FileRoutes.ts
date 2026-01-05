import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';
import FileService from '@src/services/FileService';
import { IRes } from './common/types';
import { authenticate, AuthRequest } from '@src/middleware/auth';
import {
  upload,
  validateFileSize,
  validateFileType,
} from '@src/middleware/upload';
import logger from 'jet-logger';

/**
 * Upload a file
 */
async function uploadFile(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const file = req.file;

    if (!file) {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'No file provided',
      });
    }

    // Validate file
    validateFileSize(file);
    validateFileType(file);

    const result = await FileService.uploadFile({
      userId,
      fileName: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
      buffer: file.buffer,
    });

    res.status(HTTP_STATUS_CODES.Created).json(result);
  } catch (error: any) {
    res.status(HTTP_STATUS_CODES.BadRequest).json({
      error: error.message || 'Failed to upload file',
    });
  }
}

/**
 * Get all user files
 */
async function getUserFiles(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const files = await FileService.getUserFiles(userId);
    res.status(HTTP_STATUS_CODES.Ok).json({ files });
  } catch (error: any) {
    res.status(HTTP_STATUS_CODES.InternalServerError).json({
      error: error.message || 'Failed to get files',
    });
  }
}

/**
 * Get file by ID
 */
async function getFileById(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const { id } = req.params;
    const file = await FileService.getFileById(id, userId);
    res.status(HTTP_STATUS_CODES.Ok).json(file);
  } catch (error: any) {
    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : HTTP_STATUS_CODES.Unauthorized;
    res.status(status).json({
      error: error.message || 'Failed to get file',
    });
  }
}

/**
 * Update a file (rename)
 */
async function updateFile(req: AuthRequest, res: IRes) {
  try {
    // Log request details for debugging
    logger.info(
      `[updateFile] Request received - method: ${req.method}, url: ${
        req.url
      }, params: ${JSON.stringify(req.params)}`,
    );

    const userId = req.userId;
    if (!userId) {
      logger.warn('[updateFile] Unauthorized: userId is missing');
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
        details: 'User ID is missing from request',
      });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      logger.warn(
        `[updateFile] Bad Request: Invalid file ID - id: ${id}, type: ${typeof id}`,
      );
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'File ID is required',
        details: `File ID is missing or invalid. Received: ${id} (type: ${typeof id})`,
      });
    }

    // Check if body exists and is parsed
    if (!req.body) {
      const contentType = req.headers['content-type'];
      logger.warn(
        `[updateFile] Bad Request: Request body is missing - contentType: ${contentType}`,
      );
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'Request body is missing',
        details:
          'The request body was not parsed. Make sure Content-Type is application/json',
      });
    }

    const { fileName } = req.body as { fileName: string };

    if (!fileName || typeof fileName !== 'string') {
      logger.warn(
        `[updateFile] Bad Request: Invalid fileName - fileName: ${JSON.stringify(
          fileName,
        )}, type: ${typeof fileName}`,
      );
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'File name is required',
        details: `File name is missing or invalid. Received: ${JSON.stringify(
          fileName,
        )} (type: ${typeof fileName})`,
        receivedBody: req.body,
      });
    }

    logger.info(
      `[updateFile] Calling FileService.updateFile - fileId: ${id}, userId: ${userId}, fileName: ${fileName}`,
    );
    const updatedFile = await FileService.updateFile(id, userId, fileName);
    logger.info(
      `[updateFile] Success - fileId: ${id}, newFileName: ${updatedFile.fileName}`,
    );

    res.status(HTTP_STATUS_CODES.Ok).json(updatedFile);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(errorMessage);
    logger.err(errorObj);
    logger.warn(
      `[updateFile] Error details - fileId: ${req.params?.id}, userId: ${req.userId}, message: ${errorMessage}`,
    );

    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : error.message.includes('Unauthorized')
      ? HTTP_STATUS_CODES.Unauthorized
      : HTTP_STATUS_CODES.InternalServerError;

    res.status(status).json({
      error: error.message || 'Failed to update file',
      details: error.stack || 'No additional details available',
      code: error.code || 'UNKNOWN_ERROR',
    });
  }
}

/**
 * Delete a file
 */
async function deleteFile(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'File ID is required',
      });
    }
    await FileService.deleteFile(id, userId);
    res
      .status(HTTP_STATUS_CODES.Ok)
      .json({ message: 'File deleted successfully' });
  } catch (error: any) {
    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : error.message.includes('Unauthorized')
      ? HTTP_STATUS_CODES.Unauthorized
      : HTTP_STATUS_CODES.InternalServerError;
    res.status(status).json({
      error: error.message || 'Failed to delete file',
    });
  }
}

export default {
  upload: [authenticate, upload.single('file'), uploadFile],
  getAll: [authenticate, getUserFiles],
  getById: [authenticate, getFileById],
  update: [authenticate, updateFile],
  delete: [authenticate, deleteFile],
} as const;
