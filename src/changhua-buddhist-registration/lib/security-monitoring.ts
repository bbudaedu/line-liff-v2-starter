/**
 * Security monitoring and access logging system
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { maskSensitiveData } from './encryption';

// Log levels
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security',
  AUDIT = 'audit'
}

// Security event types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  PERMISSION_DENIED = 'permission_denied',
  MALICIOUS_INPUT = 'malicious_input',
  API_ABUSE = 'api_abuse',
  DDOS_ATTEMPT = 'ddos_attempt'
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  type: SecurityEventType;
  clientId: string;
  userId?: string;
  endpoint: string;
  method: string;
  userAgent: string;
  ip: string;
  message: string;
  details?: any;
  risk_score: number;
}

interface AccessLog {
  id: string;
  timestamp: string;
  clientId: string;
  userId?: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  userAgent: string;
  ip: string;
  requestSize: number;
  responseSize: number;
  referer?: string;
}

// In-memory storage (in production, use database or external logging service)
const securityEvents: SecurityEvent[] = [];
const accessLogs: AccessLog[] = [];
const alertThresholds = new Map<string, number>();

/**
 * Generate unique ID for logs
 */
function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client information from request
 */
function getClientInfo(req: NextApiRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 
             req.socket.remoteAddress || 'unknown';
  
  return {
    ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    referer: req.headers.referer,
    clientId: `${ip}:${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`
  };
}

/**
 * Calculate risk score based on event type and context
 */
function calculateRiskScore(type: SecurityEventType, details?: any): number {
  const baseScores = {
    [SecurityEventType.LOGIN_ATTEMPT]: 1,
    [SecurityEventType.LOGIN_SUCCESS]: 0,
    [SecurityEventType.LOGIN_FAILURE]: 3,
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: 5,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: 7,
    [SecurityEventType.DATA_ACCESS]: 2,
    [SecurityEventType.DATA_MODIFICATION]: 4,
    [SecurityEventType.PERMISSION_DENIED]: 6,
    [SecurityEventType.MALICIOUS_INPUT]: 8,
    [SecurityEventType.API_ABUSE]: 9,
    [SecurityEventType.DDOS_ATTEMPT]: 10
  };

  let score = baseScores[type] || 5;

  // Adjust score based on details
  if (details) {
    if (details.repeated_attempts > 5) score += 2;
    if (details.from_tor || details.from_proxy) score += 3;
    if (details.malicious_payload) score += 4;
  }

  return Math.min(score, 10);
}

/**
 * Log security event
 */
export function logSecurityEvent(
  req: NextApiRequest,
  type: SecurityEventType,
  message: string,
  details?: any,
  userId?: string
): void {
  const clientInfo = getClientInfo(req);
  const riskScore = calculateRiskScore(type, details);
  
  const event: SecurityEvent = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    level: riskScore >= 7 ? LogLevel.SECURITY : LogLevel.WARN,
    type,
    clientId: clientInfo.clientId,
    userId,
    endpoint: req.url || 'unknown',
    method: req.method || 'unknown',
    userAgent: clientInfo.userAgent,
    ip: clientInfo.ip,
    message,
    details: maskSensitiveData(details),
    risk_score: riskScore
  };

  securityEvents.push(event);
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SECURITY] ${event.level.toUpperCase()}: ${message}`, {
      type,
      clientId: clientInfo.clientId,
      riskScore,
      details: event.details
    });
  }

  // Check for alert conditions
  checkAlertConditions(event);
  
  // Clean up old events (keep last 1000)
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }
}

/**
 * Log API access
 */
export function logApiAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  startTime: number,
  userId?: string
): void {
  const clientInfo = getClientInfo(req);
  const responseTime = Date.now() - startTime;
  
  const log: AccessLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    clientId: clientInfo.clientId,
    userId,
    method: req.method || 'unknown',
    endpoint: req.url || 'unknown',
    statusCode: res.statusCode,
    responseTime,
    userAgent: clientInfo.userAgent,
    ip: clientInfo.ip,
    requestSize: JSON.stringify(req.body || {}).length,
    responseSize: 0, // Would need to capture response body size
    referer: clientInfo.referer
  };

  accessLogs.push(log);
  
  // Log slow requests
  if (responseTime > 5000) {
    logSecurityEvent(req, SecurityEventType.SUSPICIOUS_ACTIVITY, 
      `Slow API response: ${responseTime}ms`, { responseTime }, userId);
  }
  
  // Clean up old logs (keep last 5000)
  if (accessLogs.length > 5000) {
    accessLogs.splice(0, accessLogs.length - 5000);
  }
}

/**
 * Check for alert conditions
 */
function checkAlertConditions(event: SecurityEvent): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // Check for repeated high-risk events from same client
  const recentEvents = securityEvents.filter(e => 
    e.clientId === event.clientId &&
    e.risk_score >= 7 &&
    now - new Date(e.timestamp).getTime() < oneHour
  );

  if (recentEvents.length >= 5) {
    triggerAlert('HIGH_RISK_CLIENT', {
      clientId: event.clientId,
      eventCount: recentEvents.length,
      events: recentEvents.map(e => ({ type: e.type, timestamp: e.timestamp }))
    });
  }

  // Check for DDoS patterns
  const recentRequests = accessLogs.filter(log =>
    log.clientId === event.clientId &&
    now - new Date(log.timestamp).getTime() < 60000 // 1 minute
  );

  if (recentRequests.length > 100) {
    triggerAlert('POSSIBLE_DDOS', {
      clientId: event.clientId,
      requestCount: recentRequests.length,
      timeWindow: '1 minute'
    });
  }

  // Check for multiple failed login attempts
  if (event.type === SecurityEventType.LOGIN_FAILURE) {
    const failedLogins = securityEvents.filter(e =>
      e.type === SecurityEventType.LOGIN_FAILURE &&
      e.clientId === event.clientId &&
      now - new Date(e.timestamp).getTime() < oneHour
    );

    if (failedLogins.length >= 5) {
      triggerAlert('BRUTE_FORCE_ATTEMPT', {
        clientId: event.clientId,
        attemptCount: failedLogins.length
      });
    }
  }
}

/**
 * Trigger security alert
 */
function triggerAlert(alertType: string, details: any): void {
  const alertKey = `${alertType}:${details.clientId}`;
  const lastAlert = alertThresholds.get(alertKey) || 0;
  const now = Date.now();
  
  // Don't spam alerts - minimum 1 hour between same alert types
  if (now - lastAlert < 60 * 60 * 1000) {
    return;
  }
  
  alertThresholds.set(alertKey, now);
  
  console.error(`[SECURITY ALERT] ${alertType}:`, details);
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // sendToMonitoringService(alertType, details);
  }
}

/**
 * Security monitoring middleware
 */
export function securityMonitoring(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const startTime = Date.now();
  
  // Log the request
  const originalEnd = res.end;
  res.end = function(this: any, chunk?: any, encoding?: any, cb?: any) {
    logApiAccess(req, res, startTime);
    return originalEnd.call(this, chunk, encoding, cb);
  } as any;
  
  // Monitor for suspicious patterns
  const clientInfo = getClientInfo(req);
  
  // Check for rapid requests
  const recentRequests = accessLogs.filter(log =>
    log.clientId === clientInfo.clientId &&
    Date.now() - new Date(log.timestamp).getTime() < 10000 // 10 seconds
  );

  if (recentRequests.length > 20) {
    logSecurityEvent(req, SecurityEventType.SUSPICIOUS_ACTIVITY,
      'Rapid API requests detected', { requestCount: recentRequests.length });
  }

  // Check for unusual user agent
  if (!clientInfo.userAgent || clientInfo.userAgent.length < 10) {
    logSecurityEvent(req, SecurityEventType.SUSPICIOUS_ACTIVITY,
      'Suspicious user agent', { userAgent: clientInfo.userAgent });
  }

  next();
}

/**
 * Get security metrics for monitoring dashboard
 */
export function getSecurityMetrics() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  const recentEvents = securityEvents.filter(e =>
    now - new Date(e.timestamp).getTime() < oneHour
  );

  const dailyEvents = securityEvents.filter(e =>
    now - new Date(e.timestamp).getTime() < oneDay
  );

  const highRiskEvents = recentEvents.filter(e => e.risk_score >= 7);
  
  const topRiskyClients = Object.entries(
    recentEvents.reduce((acc, event) => {
      acc[event.clientId] = (acc[event.clientId] || 0) + event.risk_score;
      return acc;
    }, {} as Record<string, number>)
  )
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);

  return {
    summary: {
      totalEvents: securityEvents.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      highRiskEvents: highRiskEvents.length,
      uniqueClients: new Set(recentEvents.map(e => e.clientId)).size
    },
    eventsByType: Object.values(SecurityEventType).map(type => ({
      type,
      count: recentEvents.filter(e => e.type === type).length
    })),
    topRiskyClients,
    recentHighRiskEvents: highRiskEvents.slice(0, 20)
  };
}

/**
 * Get access logs for analysis
 */
export function getAccessLogs(limit: number = 100) {
  return accessLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Clear old logs and events
 */
export function cleanupLogs(daysToKeep: number = 7): void {
  const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  // Remove old security events
  const eventsToKeep = securityEvents.filter(e =>
    new Date(e.timestamp).getTime() > cutoff
  );
  securityEvents.splice(0, securityEvents.length, ...eventsToKeep);
  
  // Remove old access logs
  const logsToKeep = accessLogs.filter(log =>
    new Date(log.timestamp).getTime() > cutoff
  );
  accessLogs.splice(0, accessLogs.length, ...logsToKeep);
  
  console.log(`Cleaned up logs. Kept ${eventsToKeep.length} events and ${logsToKeep.length} access logs.`);
}