import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';
import AuthService from '@src/services/AuthService';
import { IReq, IRes } from './common/types';
import { authenticate, AuthRequest } from '@src/middleware/auth';

/**
 * Register a new user
 */
async function register(req: IReq, res: IRes) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'Email and password are required',
      });
    }

    const result = await AuthService.register({
      email: email as string,
      password: password as string,
    });
    res.status(HTTP_STATUS_CODES.Created).json(result);
  } catch (error: any) {
    res.status(HTTP_STATUS_CODES.BadRequest).json({
      error: error.message || 'Failed to register user',
    });
  }
}

/**
 * Login user
 */
async function login(req: IReq, res: IRes) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'Email and password are required',
      });
    }

    const result = await AuthService.login({ email, password } as any);
    res.status(HTTP_STATUS_CODES.Ok).json(result);
  } catch (error: any) {
    res.status(HTTP_STATUS_CODES.Unauthorized).json({
      error: error.message || 'Invalid credentials',
    });
  }
}

/**
 * Get user profile
 */
async function getProfile(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const profile = await AuthService.getProfile(userId);
    res.status(HTTP_STATUS_CODES.Ok).json(profile);
  } catch (error: any) {
    res.status(HTTP_STATUS_CODES.NotFound).json({
      error: error.message || 'User not found',
    });
  }
}

export default {
  register,
  login,
  getProfile: [authenticate, getProfile],
} as const;
