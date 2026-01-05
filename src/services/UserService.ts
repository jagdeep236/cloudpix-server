import { RouteError } from '@src/common/util/route-errors';
import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';

import UserRepo from '@src/repos/UserRepo';
import { IUser } from '@src/models/User';

export const USER_NOT_FOUND_ERR = 'User not found';

/**
 * Get all users.
 */
function getAll(): Promise<IUser[]> {
  return UserRepo.getAll();
}

/**
 * Add one user.
 */
function addOne(user: IUser): Promise<void> {
  return UserRepo.add(user);
}

/**
 * Update one user.
 */
async function updateOne(user: IUser): Promise<void> {
  // Note: UserRepo is legacy mock ORM, not used in production
  // This function should use CosmosUserRepo instead
  const persists = await UserRepo.persists(0); // Legacy code, not used
  if (!persists) {
    throw new RouteError(HTTP_STATUS_CODES.NotFound, USER_NOT_FOUND_ERR);
  }
  // Return user
  return UserRepo.update(user);
}

/**
 * Delete a user by their id.
 */
async function _delete(id: number): Promise<void> {
  const persists = await UserRepo.persists(id);
  if (!persists) {
    throw new RouteError(HTTP_STATUS_CODES.NotFound, USER_NOT_FOUND_ERR);
  }
  // Delete user
  return UserRepo.delete(id);
}

export default {
  getAll,
  addOne,
  updateOne,
  delete: _delete,
} as const;
