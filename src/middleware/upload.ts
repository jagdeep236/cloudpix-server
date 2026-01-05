import multer from 'multer';
import { Request } from 'express';
import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';
import { RouteError } from '@src/common/util/route-errors';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
];

/**
 * File filter for multer
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new RouteError(
        HTTP_STATUS_CODES.BadRequest,
        `File type not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(
          ', ',
        )}`,
      ),
    );
  }
};

/**
 * Multer configuration
 */
const storage = multer.memoryStorage();

/**
 * Multer upload middleware
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Validate file size
 */
export const validateFileSize = (file: Express.Multer.File): void => {
  if (file.size > MAX_FILE_SIZE) {
    throw new RouteError(
      HTTP_STATUS_CODES.BadRequest,
      `File size exceeds maximum allowed size of ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`,
    );
  }
};

/**
 * Validate file type
 */
export const validateFileType = (file: Express.Multer.File): void => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new RouteError(
      HTTP_STATUS_CODES.BadRequest,
      `File type not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(
        ', ',
      )}`,
    );
  }
};

export default {
  upload,
  validateFileSize,
  validateFileType,
};
