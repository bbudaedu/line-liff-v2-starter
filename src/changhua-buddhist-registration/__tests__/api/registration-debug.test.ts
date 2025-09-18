/**
 * 報名 API 除錯測試
 * Registration API debug test
 */

import { createMocks } from 'node-mocks-http';

// Mock all dependencies
const mockCreateRegistration = jest.fn();

jest.mock('../../services/registration', () => ({
  getRegistrationService: () => ({
    createRegistration: mockCreateRegistration
  })
}));

jest.mock('../../lib/security-monitoring', () => ({
  securityMonitoring: (req: any, res: any, next: () => void) => next(),
  logSecurityEvent: jest.fn(),
  SecurityEventType: {
    DATA_ACCESS: 'data_access',
    DATA_CREATED: 'data_created',
    SYSTEM_ERROR: 'system_error',
    PERMISSION_DENIED: 'permission_denied'
  }
}));

jest.mock('../../lib/rate-limiting', () => ({
  rateLimit: () => (handler: any) => handler,
  rateLimitConfigs: { registration: {} }
}));

jest.mock('../../lib/validation', () => ({
  securityHeaders: (req: any, res: any, next: () => void) => next(),
  validateInputLength: (req: any, res: any, next: () => void) => next(),
  validateCors: (req: any, res: any, next: () => void) => next()
}));

jest.mock('../../utils/security', () => ({
  sanitizeFormData: (data: any) => data
}));

import registrationHandler from '../../pages/api/v1/registration/index';

describe('Registration API Debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRegistration.mockResolvedValue({
      success: true,
      order: {
        code: 'ORDER123',
        status: 'n',
        email: 'test@example.com',
        datetime: '2024-01-01T12:00:00Z',
        total: '0.00'
      }
    });
  });

  it('應該處理基本的 POST 請求', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-line-access-token': 'valid-token',
        'content-type': 'application/json'
      },
      body: {
        eventSlug: 'test-event',
        identity: 'volunteer',
        personalInfo: {
          name: '測試使用者',
          phone: '0912345678',
          email: 'test@example.com',
          emergencyContact: '0987654321'
        },
        transport: {
          required: false
        }
      }
    });

    (req as any).user = {
      lineUserId: 'test-user-123',
      displayName: 'Test User',
      pictureUrl: 'https://example.com/avatar.jpg'
    };
    (req as any).requestId = 'test-request-123';
    (req as any).startTime = Date.now();

    await registrationHandler(req, res);

    console.log('Status Code:', res._getStatusCode());
    console.log('Response Headers:', res.getHeaders());
    console.log('Response Data:', res._getData());

    // 基本檢查
    expect(res._getStatusCode()).toBeGreaterThanOrEqual(200);
    expect(res._getStatusCode()).toBeLessThan(500);
  });

  it('應該拒絕無效的姓名', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-line-access-token': 'valid-token',
        'content-type': 'application/json'
      },
      body: {
        eventSlug: 'test-event',
        identity: 'volunteer',
        personalInfo: {
          name: '<script>alert("test")</script>',
          phone: '0912345678',
          email: 'test@example.com',
          emergencyContact: '0987654321'
        },
        transport: {
          required: false
        }
      }
    });

    (req as any).user = {
      lineUserId: 'test-user-123',
      displayName: 'Test User',
      pictureUrl: 'https://example.com/avatar.jpg'
    };
    (req as any).requestId = 'test-request-123';
    (req as any).startTime = Date.now();

    await registrationHandler(req, res);

    console.log('Invalid Name Test:');
    console.log('Status Code:', res._getStatusCode());
    console.log('Response Data:', res._getData());

    // 應該返回錯誤
    expect(res._getStatusCode()).toBeGreaterThanOrEqual(400);
  });
});