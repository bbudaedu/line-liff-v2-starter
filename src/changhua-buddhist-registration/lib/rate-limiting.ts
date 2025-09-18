/**
 * API rate limiting and DDoS protection middleware
 */
import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RequestRecord {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

// In-memory store for rate limiting (in production, use Redis)
const requestStore = new Map<string, RequestRecord>();

// Suspicious activity tracking
const suspiciousActivity = new Map<string, {
  violations: number;
  lastViolation: number;
  blocked: boolean;
  blockUntil?: number;
}>();

/**
 * Get client identifier from request
 */
function getClientId(req: NextApiRequest): string {
  // Try to get real IP from various headers
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const clientIp = req.headers['x-client-ip'];
  
  let ip = '';
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (typeof realIp === 'string') {
    ip = realIp;
  } else if (typeof clientIp === 'string') {
    ip = clientIp;
  } else {
    ip = req.socket.remoteAddress || 'unknown';
  }
  
  // Include User-Agent for more specific identification
  const userAgent = req.headers['user-agent'] || '';
  return `${ip}:${userAgent.substring(0, 50)}`;
}

/**
 * Check if request is suspicious
 */
function isSuspiciousRequest(req: NextApiRequest): boolean {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';
  
  // Check for bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /postman/i, /insomnia/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // Check for missing or suspicious headers
  if (!userAgent || userAgent.length < 10) {
    return true;
  }
  
  // Check for suspicious request patterns
  const path = req.url || '';
  const suspiciousPaths = [
    /\/admin/i, /\/wp-admin/i, /\/phpmyadmin/i,
    /\.php$/i, /\.asp$/i, /\.jsp$/i,
    /\/api\/.*\/.*\/.*\//  // Too many nested API paths
  ];
  
  if (suspiciousPaths.some(pattern => pattern.test(path))) {
    return true;
  }
  
  return false;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = '請求過於頻繁，請稍後再試',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const clientId = getClientId(req);
      const now = Date.now();
      
      // Check if client is blocked due to suspicious activity
      const suspicious = suspiciousActivity.get(clientId);
      if (suspicious?.blocked && suspicious.blockUntil && now < suspicious.blockUntil) {
        return res.status(429).json({
          success: false,
          message: '由於可疑活動，您的請求已被暫時封鎖',
          code: 'BLOCKED_SUSPICIOUS_ACTIVITY',
          retryAfter: Math.ceil((suspicious.blockUntil - now) / 1000)
        });
      }
      
      // Get or create request record
      let record = requestStore.get(clientId);
      if (!record || now > record.resetTime) {
        record = {
          count: 0,
          resetTime: now + windowMs,
          blocked: false
        };
      }
      
      // Check if client is currently rate limited
      if (record.blocked && record.blockUntil && now < record.blockUntil) {
        return res.status(429).json({
          success: false,
          message,
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((record.blockUntil - now) / 1000)
        });
      }
      
      // Check for suspicious request
      if (isSuspiciousRequest(req)) {
        const suspiciousRecord = suspiciousActivity.get(clientId) || {
          violations: 0,
          lastViolation: 0,
          blocked: false
        };
        
        suspiciousRecord.violations++;
        suspiciousRecord.lastViolation = now;
        
        // Block after 3 suspicious requests
        if (suspiciousRecord.violations >= 3) {
          suspiciousRecord.blocked = true;
          suspiciousRecord.blockUntil = now + (60 * 60 * 1000); // 1 hour block
          suspiciousActivity.set(clientId, suspiciousRecord);
          
          return res.status(429).json({
            success: false,
            message: '檢測到可疑活動，請求已被封鎖',
            code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
          });
        }
        
        suspiciousActivity.set(clientId, suspiciousRecord);
      }
      
      // Increment request count
      record.count++;
      
      // Check if limit exceeded
      if (record.count > maxRequests) {
        record.blocked = true;
        record.blockUntil = now + windowMs;
        requestStore.set(clientId, record);
        
        return res.status(429).json({
          success: false,
          message,
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      requestStore.set(clientId, record);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      
      try {
        await handler(req, res);
        
        // Don't count successful requests if configured
        if (skipSuccessfulRequests && res.statusCode < 400) {
          record.count--;
          requestStore.set(clientId, record);
        }
      } catch (error) {
        // Don't count failed requests if configured
        if (skipFailedRequests && res.statusCode >= 400) {
          record.count--;
          requestStore.set(clientId, record);
        }
        throw error;
      }
    };
  };
}

/**
 * Cleanup old records periodically
 */
function cleanupOldRecords() {
  const now = Date.now();
  
  // Clean up rate limit records
  const clientsToDelete: string[] = [];
  requestStore.forEach((record, clientId) => {
    if (now > record.resetTime && (!record.blockUntil || now > record.blockUntil)) {
      clientsToDelete.push(clientId);
    }
  });
  clientsToDelete.forEach(clientId => requestStore.delete(clientId));
  
  // Clean up suspicious activity records
  const suspiciousToDelete: string[] = [];
  suspiciousActivity.forEach((record, clientId) => {
    if (record.blockUntil && now > record.blockUntil) {
      suspiciousToDelete.push(clientId);
    } else if (now - record.lastViolation > 24 * 60 * 60 * 1000) { // 24 hours
      suspiciousToDelete.push(clientId);
    }
  });
  suspiciousToDelete.forEach(clientId => suspiciousActivity.delete(clientId));
}

// Run cleanup every 5 minutes
setInterval(cleanupOldRecords, 5 * 60 * 1000);

/**
 * Different rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: '登入嘗試過於頻繁，請15分鐘後再試'
  },
  
  // Moderate limits for registration endpoints
  registration: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
    message: '報名請求過於頻繁，請稍後再試'
  },
  
  // Lenient limits for general API endpoints
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'API請求過於頻繁，請稍後再試'
  },
  
  // Very strict limits for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1,
    message: '此操作每小時只能執行一次'
  },
  
  // Moderate limits for query endpoints
  query: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: '查詢請求過於頻繁，請稍後再試'
  }
};

/**
 * DDoS protection middleware
 */
export function ddosProtection(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const clientId = getClientId(req);
  const now = Date.now();
  
  // Check for rapid-fire requests (more than 10 requests in 1 second)
  const rapidFireKey = `${clientId}:rapid`;
  const rapidFireRecord = requestStore.get(rapidFireKey) || { count: 0, resetTime: now + 1000, blocked: false };
  
  if (now > rapidFireRecord.resetTime) {
    rapidFireRecord.count = 0;
    rapidFireRecord.resetTime = now + 1000;
    rapidFireRecord.blocked = false;
  }
  
  rapidFireRecord.count++;
  
  if (rapidFireRecord.count > 10) {
    rapidFireRecord.blocked = true;
    rapidFireRecord.blockUntil = now + (5 * 60 * 1000); // 5 minute block
    requestStore.set(rapidFireKey, rapidFireRecord);
    
    return res.status(429).json({
      success: false,
      message: '檢測到DDoS攻擊模式，請求已被封鎖',
      code: 'DDOS_PROTECTION_TRIGGERED'
    });
  }
  
  requestStore.set(rapidFireKey, rapidFireRecord);
  next();
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStatus() {
  return {
    activeClients: requestStore.size,
    suspiciousClients: suspiciousActivity.size,
    blockedClients: Array.from(suspiciousActivity.values()).filter(r => r.blocked).length
  };
}