import path from 'path';
import dotenv from 'dotenv';
import moduleAlias from 'module-alias';
import { existsSync } from 'fs';

/**
 * Environment Configuration
 * 
 * In production (Azure App Service) and CI/CD, environment variables are already
 * available via process.env, so we don't need to load .env files.
 * 
 * We only load .env files in local development for convenience.
 * After loading, all variables are accessible via process.env throughout the app.
 */

const NODE_ENV = (process.env.NODE_ENV || 'development').trim();

// Detect if we're in Azure or CI/CD (where env vars are already set)
const isAzure = !!process.env.AZURE_WEBSITE_SITE_NAME || !!process.env.WEBSITE_SITE_NAME;
const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS;

// Only load .env files in local development
// In production/CI: environment variables are already in process.env
if (!isAzure && !isCI && NODE_ENV) {
  const envPath = path.join(__dirname, `./config/.env.${NODE_ENV}`);
  
  if (existsSync(envPath)) {
    // Load .env file - this populates process.env with values from the file
    dotenv.config({ path: envPath });
  } else if (NODE_ENV === 'development') {
    // Warn in local dev if .env file is missing
    console.warn(`Warning: .env file not found at ${envPath}. Using system environment variables.`);
  }
}

// Note: After this point, all environment variables are accessible via process.env
// Examples:
// - process.env.JWT_SECRET
// - process.env.AZURE_COSMOS_CONNECTION_STRING
// - process.env.PORT
// etc.

// Configure moduleAlias
if (__filename.endsWith('js')) {
  moduleAlias.addAlias('@src', __dirname + '/dist');
}
