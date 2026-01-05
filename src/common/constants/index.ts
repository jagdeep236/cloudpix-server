// NOTE: These need to match the names of your ".env" files
export const NODE_ENVS = {
  Dev: 'development',
  Test: 'test',
  Production: 'production',
} as const;

export const CONTAINER_NAMES = {
  USERS: 'Users',
  FILES: 'Files',
  SHARE_LINKS: 'ShareLinks',
} as const;
