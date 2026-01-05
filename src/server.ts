import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import logger from 'jet-logger';

import BaseRouter from '@src/routes';

import Paths from '@src/common/constants/PATHS';
import ENV from '@src/common/constants/ENV';
import HTTP_STATUS_CODES, {
  HttpStatusCodes,
} from '@src/common/constants/HTTP_STATUS_CODES';
import { RouteError } from '@src/common/util/route-errors';
import { NODE_ENVS } from '@src/common/constants';
import { initializeAppInsights, trackException } from '@src/services/azure/AppInsightsService';

const app = express();

// Initialize Application Insights
initializeAppInsights();

// **** Middleware **** //

// CORS configuration - allow all origins
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to normalize URLs (trim trailing spaces and decode %20)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Trim trailing spaces and decode %20 at the end of URL
  if (req.url.endsWith('%20') || req.url.endsWith(' ')) {
    req.url = req.url.trim().replace(/%20$/, '');
    // Also update the originalUrl if it exists
    if (req.originalUrl) {
      req.originalUrl = req.originalUrl.trim().replace(/%20$/, '');
    }
  }
  next();
});

// Show routes called in console during development
if (ENV.NodeEnv === NODE_ENVS.Dev) {
  app.use(morgan('dev'));
}

// Security
if (ENV.NodeEnv === NODE_ENVS.Production) {
  if (!process.env.DISABLE_HELMET) {
    app.use(helmet());
  }
}

// Health check at root level (for convenience)
app.get('/health', (req: Request, res: Response) => {
  res.status(HTTP_STATUS_CODES.Ok).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CloudPix API',
  });
});

// Add APIs, must be after middleware
app.use(Paths._, BaseRouter);

// Add error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (ENV.NodeEnv !== NODE_ENVS.Test.valueOf()) {
    logger.err(err, true);
  }
  
  // Track exception in Application Insights
  trackException(err, {
    url: req.url,
    method: req.method,
    statusCode: err instanceof RouteError ? String(err.status) : '400',
    route: req.route?.path || req.path,
  });
  
  let status: HttpStatusCodes = HTTP_STATUS_CODES.BadRequest;
  if (err instanceof RouteError) {
    status = err.status;
    res.status(status).json({ error: err.message });
  } else {
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
  return next(err);
});

// Root endpoint - API info
app.get('/', (_: Request, res: Response) => {
  return res.json({
    message: 'CloudPix API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      files: '/api/files',
      share: '/api/share',
    },
  });
});

export default app;
