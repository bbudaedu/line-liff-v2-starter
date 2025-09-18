/**
 * Debug registration API test
 */

import { createMocks } from 'node-mocks-http';
import { db } from '../../lib/database';

// Mock the registration service
const mockCreateRegistration = jest.fn();
jest.mock('../../services/registration', () => ({
  getRegistrationService: () => ({
    createRegistration: mockCreateRegistration
  })
}));

// Mock security monitoring
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

// Mock rate limiting
jest.mock('../../lib/rate-limiting', () => ({
  rateLimit: () => (handler: any) => handler,
  rateLimitConfigs: { registration: {} }
}));

import registrationHandler from '../../pages/api/v1/registration/index';

describe('Debug Registration API', () => {
  beforeEach(async () => {
    await db.clearAll();
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

  it('應該顯示實際的回應', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'x-line-access-token': 'valid-token' },
      body: {
        eventSlug: 'test-event',
        identity: 'volunteer',
        personalInfo: {
          name: '測試使用者',
          phone: '0912345678',
          emergencyContact: '0987654321'
        }
      }
    });

    (req as any).user = {
      lineUserId: 'test-user-123',
      displayName: 'Test User'
    };
    (req as any).requestId = 'test-debug';
    (req as any).startTime = Date.now();

    await registrationHandler(req, res);

    console.log('Status Code:', res._getStatusCode());
    console.log('Headers:', res.getHeaders());
    console.log('Response Data:', res._getData());
    
    // Just check that we get some response
    expect(res._getStatusCode()).toBeGreaterThan(0);
  });
});