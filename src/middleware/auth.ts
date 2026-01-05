import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '@src/utils/jwt';
import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';
import { RouteError } from '@src/common/util/route-errors';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * JWT authentication middleware
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new RouteError(
        HTTP_STATUS_CODES.Unauthorized,
        'Authentication required',
      );
    }

    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    if (error instanceof RouteError) {
      throw error;
    }
    throw new RouteError(
      HTTP_STATUS_CODES.Unauthorized,
      'Invalid or expired token',
    );
  }
};

export default {
  authenticate,
};
