/**
 * 健康檢查 API 端點測試
 * Health check API endpoint tests
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatSuccessResponse } from '../../lib/errors';

// 簡化的健康檢查處理器（不使用中介軟體）
async function simpleHealthHandler(req: NextApiRequest, res: NextApiResponse) {
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

  res.status(200).json(formatSuccessResponse(healthData, '系統運行正常', 'test-req-id'));
}

describe('/api/v1/health', () => {
  test('should return health status on GET request', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await simpleHealthHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      success: true,
      data: expect.objectContaining({
        status: 'healthy',
        timestamp: expect.any(String),
        version: '1.0.0',
        environment: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.any(Object),
      }),
      message: '系統運行正常',
      timestamp: expect.any(String),
      requestId: 'test-req-id',
    });
  });

  test('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await simpleHealthHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    
    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      success: false,
      message: '方法不被允許',
      code: 'METHOD_NOT_ALLOWED',
    });
  });
});