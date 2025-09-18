/**
 * Monitoring Middleware
 * Automatically tracks API requests, errors, and performance metrics
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { monitoring, captureError, recordMetric, startTransaction } from '../lib/monitoring';

export interface MonitoringOptions {
  trackPerformance?: boolean;
  trackErrors?: boolean;
  trackRequests?: boolean;
  sensitiveHeaders?: string[];
}

const defaultOptions: MonitoringOptions = {
  trackPerformance: true,
  trackErrors: true,
  trackRequests: true,
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key']
};

export function withMonitoring(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: MonitoringOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const transaction = config.trackPerformance ? 
      startTransaction(`${req.method} ${req.url}`, 'http.server') : null;

    // Track request metrics
    if (config.trackRequests) {
      recordMetric({
        name: 'http_requests_total',
        value: 1,
        unit: 'count',
        tags: {
          method: req.method || 'unknown',
          endpoint: req.url || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });
    }

    // Override res.json to capture response metrics
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      
      if (config.trackPerformance) {
        recordMetric({
          name: 'http_request_duration',
          value: duration,
          unit: 'ms',
          tags: {
            method: req.method || 'unknown',
            endpoint: req.url || 'unknown',
            status: res.statusCode.toString()
          }
        });

        transaction?.finish(res.statusCode >= 400 ? 'error' : 'success');
      }

      if (config.trackRequests) {
        recordMetric({
          name: 'http_responses_total',
          value: 1,
          unit: 'count',
          tags: {
            method: req.method || 'unknown',
            endpoint: req.url || 'unknown',
            status: res.statusCode.toString(),
            statusClass: `${Math.floor(res.statusCode / 100)}xx`
          }
        });
      }

      return originalJson.call(this, body);
    };

    // Override res.status to capture error responses
    const originalStatus = res.status;
    res.status = function(code: number) {
      if (code >= 400 && config.trackErrors) {
        recordMetric({
          name: 'http_errors_total',
          value: 1,
          unit: 'count',
          tags: {
            method: req.method || 'unknown',
            endpoint: req.url || 'unknown',
            status: code.toString(),
            statusClass: `${Math.floor(code / 100)}xx`
          }
        });
      }
      
      return originalStatus.call(this, code);
    };

    try {
      await handler(req, res);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (config.trackErrors) {
        captureError(error as Error, {
          action: `${req.method} ${req.url}`,
          metadata: {
            method: req.method,
            url: req.url,
            headers: sanitizeHeaders(req.headers, config.sensitiveHeaders),
            query: req.query,
            duration,
            userAgent: req.headers['user-agent']
          }
        });

        recordMetric({
          name: 'http_errors_total',
          value: 1,
          unit: 'count',
          tags: {
            method: req.method || 'unknown',
            endpoint: req.url || 'unknown',
            error: (error as Error)?.constructor?.name || 'UnknownError',
            status: '500'
          }
        });
      }

      transaction?.finish('error');

      // Re-throw the error to be handled by the application
      throw error;
    }
  };
}

function sanitizeHeaders(headers: any, sensitiveHeaders: string[] = []): any {
  const sanitized = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Middleware for tracking specific business metrics
export function trackBusinessMetric(metricName: string, value: number = 1, tags?: Record<string, string>) {
  recordMetric({
    name: `business_${metricName}`,
    value,
    unit: 'count',
    tags
  });
}

// Middleware for tracking user actions
export function trackUserAction(action: string, userId?: string, metadata?: Record<string, any>) {
  recordMetric({
    name: 'user_actions_total',
    value: 1,
    unit: 'count',
    tags: {
      action,
      userId: userId || 'anonymous',
      ...metadata
    }
  });
}

// Database query performance tracking
export function trackDatabaseQuery(operation: string, table: string, duration: number, success: boolean = true) {
  recordMetric({
    name: 'database_query_duration',
    value: duration,
    unit: 'ms',
    tags: {
      operation,
      table,
      status: success ? 'success' : 'error'
    }
  });

  recordMetric({
    name: 'database_queries_total',
    value: 1,
    unit: 'count',
    tags: {
      operation,
      table,
      status: success ? 'success' : 'error'
    }
  });
}

// External API call tracking
export function trackExternalApiCall(service: string, endpoint: string, duration: number, statusCode: number) {
  recordMetric({
    name: 'external_api_duration',
    value: duration,
    unit: 'ms',
    tags: {
      service,
      endpoint,
      status: statusCode.toString(),
      statusClass: `${Math.floor(statusCode / 100)}xx`
    }
  });

  recordMetric({
    name: 'external_api_calls_total',
    value: 1,
    unit: 'count',
    tags: {
      service,
      endpoint,
      status: statusCode.toString(),
      success: statusCode < 400 ? 'true' : 'false'
    }
  });
}