import { v4 as uuidv4 } from 'uuid';
import UserRepo from '@src/repos/CosmosUserRepo';
import { generateToken } from '@src/utils/jwt';
import { hashPassword, comparePassword } from '@src/utils/password';
import { IUser } from '@src/models/User';
import {
  trackEvent,
  trackException,
} from '@src/services/azure/AppInsightsService';
import logger from 'jet-logger';

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    userId: string;
    email: string;
  };
}

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<AuthResult> => {
  try {
    // Check if user already exists
    // If getUserByEmail returns null, user doesn't exist (or query failed)
    // We'll try to create the user and let Cosmos DB handle duplicates
    const existingUser = await UserRepo.getUserByEmail(data.email);
    if (existingUser) {
      trackEvent('auth_register_failed', { reason: 'user_exists' });
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Generate userId (GUID)
    const userId = uuidv4();

    // Create user
    const user: IUser = {
      userId,
      email: data.email,
      passwordHash,
      createdDate: new Date(),
    };

    await UserRepo.createUser(user);

    // Generate token
    const token = generateToken({
      userId: user.userId,
      email: user.email,
    });

    trackEvent('auth_register_success', { userId });

    return {
      token,
      user: {
        userId: user.userId,
        email: user.email,
      },
    };
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'register',
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Login user
 */
export const login = async (data: LoginData): Promise<AuthResult> => {
  try {
    // Get user by email
    const user = await UserRepo.getUserByEmail(data.email);
    if (!user) {
      trackEvent('auth_login_failed', { reason: 'user_not_found' });
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await comparePassword(
      data.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      trackEvent('auth_login_failed', { reason: 'invalid_password' });
      throw new Error('Invalid email or password');
    }

    // Update last login
    await UserRepo.updateLastLogin(user.userId);

    // Generate token
    const token = generateToken({
      userId: user.userId,
      email: user.email,
    });

    trackEvent('auth_login_success', { userId: user.userId });

    return {
      token,
      user: {
        userId: user.userId,
        email: user.email,
      },
    };
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'login',
    });
    logger.err(error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getProfile = async (
  userId: string,
): Promise<{ userId: string; email: string }> => {
  try {
    const user = await UserRepo.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.userId,
      email: user.email,
    };
  } catch (error: any) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      operation: 'get_profile',
    });
    logger.err(error);
    throw error;
  }
};

export default {
  register,
  login,
  getProfile,
};
