/**
 * Security monitoring status API endpoint
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getSecurityMetrics, getAccessLogs } from '../../../../lib/security-monitoring';
import { getRateLimitStatus } from '../../../../lib/rate-limiting';
import { securityHeaders, validateCors } from '../../../../lib/validation';
import { rateLimit, rateLimitConfigs } from '../../../../lib/rate-limiting';

// Apply rate limiting for sensitive endpoint
const rateLimitedHandler = rateLimit(rateLimitConfigs.sensitive)(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支援的請求方法',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Check if request is from authorized source (in production, add proper auth)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '需要授權',
        code: 'UNAUTHORIZED'
      });
    }

    // Get security metrics
    const securityMetrics = getSecurityMetrics();
    const rateLimitStatus = getRateLimitStatus();
    const recentLogs = getAccessLogs(50);

    const response = {
      timestamp: new Date().toISOString(),
      security: securityMetrics,
      rateLimiting: rateLimitStatus,
      recentActivity: {
        totalRequests: recentLogs.length,
        averageResponseTime: recentLogs.reduce((sum, log) => sum + log.responseTime, 0) / recentLogs.length || 0,
        errorRate: recentLogs.filter(log => log.statusCode >= 400).length / recentLogs.length || 0,
        topEndpoints: getTopEndpoints(recentLogs),
        topClients: getTopClients(recentLogs)
      }
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Security status endpoint error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    });
  }
}

function getTopEndpoints(logs: any[]) {
  const endpointCounts = logs.reduce((acc, log) => {
    acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(endpointCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));
}

function getTopClients(logs: any[]) {
  const clientCounts = logs.reduce((acc, log) => {
    acc[log.clientId] = (acc[log.clientId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(clientCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([clientId, count]) => ({ 
      clientId: clientId.substring(0, 20) + '...', // Mask for privacy
      count 
    }));
}

// Apply security middleware
export default async function secureEndpoint(req: NextApiRequest, res: NextApiResponse) {
  securityHeaders(req, res, () => {
    validateCors(req, res, () => {
      rateLimitedHandler(req, res);
    });
  });
}