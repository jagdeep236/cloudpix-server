import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';
import { IReq, IRes } from './common/types';
import {
  trackEvent,
  isAppInsightsReady,
} from '@src/services/azure/AppInsightsService';

/**
 * Metrics endpoint (Application Insights hook)
 */
function metrics(_: IReq, res: IRes) {
  try {
    // This endpoint can be used to manually trigger metrics or events
    // In production, Application Insights will automatically collect metrics
    trackEvent('metrics_endpoint_called');

    const hasConnectionString =
      !!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    const isReady = isAppInsightsReady();

    res.status(HTTP_STATUS_CODES.Ok).json({
      message: 'Metrics endpoint active',
      timestamp: new Date().toISOString(),
      appInsights: {
        connectionStringConfigured: hasConnectionString,
        initialized: isReady,
        status: isReady
          ? 'active'
          : hasConnectionString
          ? 'failed to initialize'
          : 'not configured',
      },
      telemetry: {
        autoCollected: {
          requests: 'All HTTP requests are automatically tracked',
          dependencies:
            'External service calls (Cosmos DB, Blob Storage) are tracked',
          exceptions: 'All exceptions are automatically tracked',
          performance: 'Performance metrics are collected',
          console: 'Console logs are collected',
        },
        customEvents: {
          auth: [
            'auth_register_success',
            'auth_register_failed',
            'auth_login_success',
            'auth_login_failed',
          ],
          files: [
            'file_upload_success',
            'file_update_success',
            'file_delete_success',
          ],
          share: [
            'share_link_created',
            'share_link_accessed',
            'share_link_revoked',
            'share_links_listed',
            'user_share_links_listed',
          ],
          metrics: ['metrics_endpoint_called'],
        },
        customMetrics: {
          files: ['file_upload_size'],
        },
        note: 'View all telemetry data in Azure Portal > Application Insights > Logs',
      },
    });
  } catch {
    res.status(HTTP_STATUS_CODES.InternalServerError).json({
      error: 'Failed to process metrics',
    });
  }
}

export default {
  metrics,
} as const;
