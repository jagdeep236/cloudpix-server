import { isString, isUnsignedInteger } from 'jet-validators';
import { parseObject, TParseOnError } from 'jet-validators/utils';

import { transformIsDate } from '@src/common/util/validators';

const DEFAULT_SHARE_LINK_VALS: IShareLink = {
  linkId: '',
  fileId: '',
  userId: '', // File owner
  expiryDate: new Date(),
  accessCount: 0,
  createdDate: new Date(),
  isRevoked: false,
} as const;

export interface IShareLink {
  linkId: string; // GUID, partition key
  fileId: string; // FK → Files.fileId
  userId: string; // File owner (FK → Users.userId)
  expiryDate: Date;
  accessCount: number;
  createdDate: Date;
  isRevoked: boolean;
  ttl?: number; // Time to live in seconds for Cosmos DB TTL
}

// Initialize the "parseShareLink" function
const parseShareLink = parseObject<IShareLink>({
  linkId: isString,
  fileId: isString,
  userId: isString,
  expiryDate: transformIsDate,
  accessCount: isUnsignedInteger,
  createdDate: transformIsDate,
  isRevoked: (arg: unknown) => typeof arg === 'boolean',
  ttl: (arg: unknown) => arg === undefined || typeof arg === 'number',
});

/**
 * New share link object.
 */
function __new__(shareLink?: Partial<IShareLink>): IShareLink {
  const defaults = { ...DEFAULT_SHARE_LINK_VALS };
  defaults.createdDate = new Date();
  defaults.isRevoked = false;
  defaults.accessCount = 0;
  return parseShareLink({ ...defaults, ...shareLink }, (errors) => {
    throw new Error(
      'Setup new share link failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

/**
 * Check is a share link object. For the route validation.
 */
function test(arg: unknown, errCb?: TParseOnError): arg is IShareLink {
  return !!parseShareLink(arg, errCb);
}

export default {
  new: __new__,
  test,
} as const;
