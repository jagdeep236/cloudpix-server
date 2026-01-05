import { isString } from 'jet-validators';
import { parseObject, TParseOnError } from 'jet-validators/utils';

import { transformIsDate } from '@src/common/util/validators';

const DEFAULT_USER_VALS: IUser = {
  userId: '',
  email: '',
  passwordHash: '',
  createdDate: new Date(),
  lastLogin: undefined,
} as const;

export interface IUser {
  userId: string; // GUID, partition key
  email: string; // unique, indexed
  passwordHash: string;
  createdDate: Date;
  lastLogin?: Date;
}

// Initialize the "parseUser" function
const parseUser = parseObject<IUser>({
  userId: isString,
  email: isString,
  passwordHash: isString,
  createdDate: transformIsDate,
  lastLogin: (arg: unknown) => arg === undefined || transformIsDate(arg),
});

/**
 * New user object.
 */
function __new__(user?: Partial<IUser>): IUser {
  const defaults = { ...DEFAULT_USER_VALS };
  defaults.createdDate = new Date();
  return parseUser({ ...defaults, ...user }, (errors) => {
    throw new Error('Setup new user failed ' + JSON.stringify(errors, null, 2));
  });
}

/**
 * Check is a user object. For the route validation.
 */
function test(arg: unknown, errCb?: TParseOnError): arg is IUser {
  return !!parseUser(arg, errCb);
}

export default {
  new: __new__,
  test,
} as const;
