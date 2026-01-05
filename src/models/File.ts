import { isString, isUnsignedInteger, isValueOf } from 'jet-validators';
import { parseObject, TParseOnError } from 'jet-validators/utils';

import { transformIsDate } from '@src/common/util/validators';

const DEFAULT_FILE_VALS: IFile = {
  fileId: '',
  userId: '',
  fileName: '',
  blobUrl: '',
  fileSize: 0,
  contentType: '',
  uploadDate: new Date(),
  status: 'active',
} as const;

export interface IFile {
  fileId: string; // GUID, partition key
  userId: string; // FK → Users.userId
  fileName: string;
  blobUrl: string;
  fileSize: number;
  contentType: string;
  uploadDate: Date;
  status: 'active' | 'deleted';
}

// Initialize the "parseFile" function
const parseFile = parseObject<IFile>({
  fileId: isString,
  userId: isString,
  fileName: isString,
  blobUrl: isString,
  fileSize: isUnsignedInteger,
  contentType: isString,
  uploadDate: transformIsDate,
  status: isValueOf({ active: 'active' as const, deleted: 'deleted' as const }),
});

/**
 * New file object.
 */
function __new__(file?: Partial<IFile>): IFile {
  const defaults: IFile = { ...DEFAULT_FILE_VALS };
  defaults.uploadDate = new Date();
  defaults.status = 'active';
  const merged = { ...defaults, ...file };
  return parseFile(merged, (errors) => {
    throw new Error('Setup new file failed ' + JSON.stringify(errors, null, 2));
  });
}

/**
 * Check is a file object. For the route validation.
 */
function test(arg: unknown, errCb?: TParseOnError): arg is IFile {
  return !!parseFile(arg, errCb);
}

export default {
  new: __new__,
  test,
} as const;
