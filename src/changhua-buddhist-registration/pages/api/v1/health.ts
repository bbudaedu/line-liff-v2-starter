/**
 * 健康檢查端點
 * Health check endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withBasicMiddleware } from '../../../lib/middleware';
import { formatSuccessResponse } from '../../../lib/errors';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '方法不被允許',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.status(200).json(formatSuccessResponse(healthData, '系統運行正常', req.requestId));
}

export default withBasicMiddleware(handler);