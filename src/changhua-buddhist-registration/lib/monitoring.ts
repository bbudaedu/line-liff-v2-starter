/**
 * Monitoring and Error Tracking Integration
 * Centralized monitoring setup for error tracking and performance monitoring
 */

import { env, isProduction } from '../config/environment';

export interface ErrorContext {
  userId?: string;
  eventId?: string;
  registrationId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  tags?: Record<string, string>;
  timestamp?: Date;
}

class MonitoringService {
  private static instance: MonitoringService;
  private initialized = false;

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Sentry for error tracking
      if (env.SENTRY_DSN && isProduction) {
        await this.initializeSentry();
      }

      // Initialize performance monitoring
      await this.initializePerformanceMonitoring();

      this.initialized = true;
      console.log('Monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  private async initializeSentry() {
    try {
      // In a real implementation, you would import and configure Sentry
      // const Sentry = require('@sentry/nextjs');
      // 
      // Sentry.init({
      //   dsn: env.SENTRY_DSN,
      //   environment: env.NODE_ENV,
      //   tracesSampleRate: isProduction ? 0.1 : 1.0,
      //   beforeSend(event) {
      //     // Filter out sensitive information
      //     if (event.request?.headers) {
      //       delete event.request.headers['authorization'];
      //       delete event.request.headers['cookie'];
      //     }
      //     return event;
      //   }
      // });

      console.log('Sentry initialized');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  private async initializePerformanceMonitoring() {
    // Set up performance observers
    if (typeof window !== 'undefined') {
      this.setupWebVitals();
    } else {
      this.setupServerMetrics();
    }
  }

  private setupWebVitals() {
    // Web Vitals monitoring for client-side
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'web_vitals_lcp',
            value: entry.startTime,
            unit: 'ms',
            tags: { type: 'lcp' }
          });
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'web_vitals_fid',
            value: (entry as any).processingStart - entry.startTime,
            unit: 'ms',
            tags: { type: 'fid' }
          });
        }
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric({
          name: 'web_vitals_cls',
          value: clsValue,
          unit: 'count',
          tags: { type: 'cls' }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  private setupServerMetrics() {
    // Server-side performance monitoring
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      
      this.recordMetric({
        name: 'server_memory_heap_used',
        value: memoryUsage.heapUsed,
        unit: 'bytes'
      });

      this.recordMetric({
        name: 'server_memory_heap_total',
        value: memoryUsage.heapTotal,
        unit: 'bytes'
      });

      this.recordMetric({
        name: 'server_uptime',
        value: process.uptime(),
        unit: 'ms'
      });
    }, 30000); // Every 30 seconds
  }

  captureError(error: Error, context?: ErrorContext) {
    try {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
        context: context || {},
        environment: env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      };

      // Log to console in development
      if (!isProduction) {
        console.error('Error captured:', errorInfo);
      }

      // Send to Sentry in production
      if (env.SENTRY_DSN && isProduction) {
        // Sentry.captureException(error, {
        //   tags: context?.metadata,
        //   user: context?.userId ? { id: context.userId } : undefined,
        //   extra: context
        // });
      }

      // Store in local error log
      this.logError(errorInfo);
    } catch (loggingError) {
      console.error('Failed to capture error:', loggingError);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    try {
      const messageInfo = {
        message,
        level,
        timestamp: new Date().toISOString(),
        context: context || {},
        environment: env.NODE_ENV
      };

      if (!isProduction) {
        console.log(`[${level.toUpperCase()}] ${message}`, context);
      }

      if (env.SENTRY_DSN && isProduction) {
        // Sentry.captureMessage(message, level as any);
      }
    } catch (error) {
      console.error('Failed to capture message:', error);
    }
  }

  recordMetric(metric: PerformanceMetric) {
    try {
      const metricData = {
        ...metric,
        timestamp: metric.timestamp || new Date()
      };

      if (!isProduction) {
        console.log('Metric recorded:', metricData);
      }

      // In production, send to monitoring service
      if (isProduction) {
        this.sendMetricToService(metricData);
      }
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  startTransaction(name: string, operation: string = 'http') {
    const startTime = Date.now();
    
    return {
      name,
      operation,
      startTime,
      finish: (status?: string) => {
        const duration = Date.now() - startTime;
        
        this.recordMetric({
          name: `transaction_duration`,
          value: duration,
          unit: 'ms',
          tags: {
            transaction: name,
            operation,
            status: status || 'success'
          }
        });
      }
    };
  }

  private logError(errorInfo: any) {
    // In production, you might want to store errors in a database
    // or send them to a logging service
    if (env.LOG_LEVEL === 'debug' || !isProduction) {
      console.error('Error logged:', errorInfo);
    }
  }

  private async sendMetricToService(metric: PerformanceMetric) {
    // Implementation would depend on your monitoring service
    // Examples: DataDog, New Relic, Prometheus, etc.
    try {
      // await fetch('/api/metrics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric)
      // });
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();

// Convenience functions
export const captureError = (error: Error, context?: ErrorContext) => 
  monitoring.captureError(error, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: ErrorContext) => 
  monitoring.captureMessage(message, level, context);

export const recordMetric = (metric: PerformanceMetric) => 
  monitoring.recordMetric(metric);

export const startTransaction = (name: string, operation?: string) => 
  monitoring.startTransaction(name, operation);

// Initialize monitoring on import
if (typeof window === 'undefined') {
  // Server-side initialization
  monitoring.initialize().catch(console.error);
} else {
  // Client-side initialization after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitoring.initialize().catch(console.error);
    });
  } else {
    monitoring.initialize().catch(console.error);
  }
}