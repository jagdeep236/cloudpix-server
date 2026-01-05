import jwt from 'jsonwebtoken';
import logger from 'jet-logger';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Set to maximum expiration: 10 years (3650 days)
const JWT_EXPIRY = process.env.JWT_EXPIRY || '3650d';

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Generate a JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  try {
    // JWT_EXPIRY is a string like '3650d', which is valid for expiresIn
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    } as jwt.SignOptions);
  } catch (error) {
    logger.err(error);
    throw new Error('Failed to generate token');
  }
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    logger.err(error);
    throw new Error('Failed to verify token');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (
  authHeader: string | undefined,
): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

export default {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
};
