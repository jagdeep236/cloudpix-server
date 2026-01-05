import jetEnv, { num } from 'jet-env';
import { isValueOf } from 'jet-validators';

import { NODE_ENVS } from '.';

// Azure App Service sets PORT environment variable automatically
// Default to 3000 for local development, or use PORT from environment
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const ENV = jetEnv({
  NodeEnv: isValueOf(NODE_ENVS),
  Port: num,
});

// Ensure Port is always a number, use PORT from env or default
if (typeof ENV.Port !== 'number' || isNaN(ENV.Port)) {
  ENV.Port = DEFAULT_PORT;
}

export default ENV;
