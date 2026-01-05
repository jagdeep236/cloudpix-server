/* eslint-disable */
// Legacy mock ORM, not used in production (CosmosUserRepo is used instead)
// This file uses legacy types that don't match the current IUser interface
import { IUser } from '@src/models/User';
import { getRandomInt } from '@src/common/util/misc';

import orm from './MockOrm';

// Legacy user type with old properties
interface LegacyUser extends IUser {
  id?: number;
  name?: string;
  created?: Date;
}

/**
 * Get one user.
 */
async function getOne(email: string): Promise<IUser | null> {
  const db = await orm.openDb();
  for (const user of db.users) {
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

/**
 * See if a user with the given id exists.
 */
async function persists(id: number): Promise<boolean> {
  const db = await orm.openDb();
  for (const user of db.users) {
    if ((user as LegacyUser).id === id) {
      return true;
    }
  }
  return false;
}

/**
 * Get all users.
 */
async function getAll(): Promise<IUser[]> {
  const db = await orm.openDb();
  return db.users;
}

/**
 * Add one user.
 */
async function add(user: IUser): Promise<void> {
  const db = await orm.openDb();
  (user as LegacyUser).id = getRandomInt();
  db.users.push(user);
  return orm.saveDb(db);
}

/**
 * Update a user.
 */
async function update(user: IUser): Promise<void> {
  const db = await orm.openDb();
  const legacyUser = user as LegacyUser;
  for (let i = 0; i < db.users.length; i++) {
    const dbUser = db.users[i] as LegacyUser;
    if (dbUser.id === legacyUser.id) {
      db.users[i] = {
        ...dbUser,
        email: user.email,
      } as IUser;
      return orm.saveDb(db);
    }
  }
}

/**
 * Delete one user.
 */
async function delete_(id: number): Promise<void> {
  const db = await orm.openDb();
  for (let i = 0; i < db.users.length; i++) {
    if ((db.users[i] as LegacyUser).id === id) {
      db.users.splice(i, 1);
      return orm.saveDb(db);
    }
  }
}

// **** Unit-Tests Only **** //

/**
 * Delete every user record.
 *
 * @internal
 * Test-only helper. Do not use in production code.
 */
async function deleteAllUsers(): Promise<void> {
  const db = await orm.openDb();
  db.users = [];
  return orm.saveDb(db);
}

/**
 * Insert multiple users. Can't do multiple at once cause using a plain file
 * for now.
 *
 * @internal
 * Test-only helper. Do not use in production code.
 */
async function insertMult(users: IUser[] | readonly IUser[]): Promise<IUser[]> {
  const db = await orm.openDb(),
    usersF = [...users] as LegacyUser[];
  for (const user of usersF) {
    user.id = getRandomInt();
    user.created = new Date();
  }
  db.users = [...db.users, ...users];
  await orm.saveDb(db);
  return usersF;
}

export default {
  getOne,
  persists,
  getAll,
  add,
  update,
  delete: delete_,
  deleteAllUsers,
  insertMult,
} as const;
