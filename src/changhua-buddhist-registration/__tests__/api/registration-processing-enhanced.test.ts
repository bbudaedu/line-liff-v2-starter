/**
 * 報名處理 API 增強功能測試
 * Registration processing API enhanced features tests
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

const mockLineUser = {
  lineUserId: 'test-user-123',
  displayName: 'Test User',
  pictureUrl: 'https://example.com/avatar.jpg'
};

const mockRegistrationData = {
  eventSlug: 'test-event-2024',
  identity: 'volunteer' as const,
  personalInfo: {
    name: '測試使用者',
    phone: '0912345678',
    email: 'test@example.com',
    emergencyContact: '0987654321',
    specialRequirements: '素食'
  },
  transport: {
    required: true,
    locationId: 'location-1',
    pickupTime: '2024-12-01T07:30:00Z'
  }
};

describe('Registration Processing Enhanced Features', () => {
  beforeEach(async () => {
    await db.clearAll();
    jest.clearAllMocks();
    
    // Default successful response
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

  describe('Data Formatting', () => {
    it('應該正確格式化電話號碼', async () => {
      const testCases = [
        { input: '0912-345-678', expected: '0912345678' },
        { input: '0912 345 678', expected: '0912345678' },
        { input: '+886912345678', expected: '0912345678' }
      ];

      for (const testCase of testCases) {
        const testData = {
          ...mockRegistrationData,
          personalInfo: {
            ...mockRegistrationData.personalInfo,
            phone: testCase.input
          }
        };

        const { req, res } = createMocks({
          method: 'POST',
          headers: { 'x-line-access-token': 'valid-token' },
          body: testData
        });

        (req as any).user = mockLineUser;
        (req as any).requestId = `test-${Date.now()}`;
        (req as any).startTime = Date.now();

        await registrationHandler(req, res);

        expect(res._getStatusCode()).toBe(201);
        const responseData = JSON.parse(res._getData());
        expect(responseData.data.personalInfo.phone).toBe(testCase.expected);
      }
    });

    it('應該生成唯一的報名 ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-unique-id';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.registrationId).toMatch(/^REG_[A-Z0-9_]+$/);
    });
  });

  describe('Enhanced Error Handling', () => {
    it('應該提供詳細的錯誤資訊', async () => {
      mockCreateRegistration.mockResolvedValue({
        success: false,
        error: '網路連線失敗',
        errorCode: 'NETWORK_ERROR'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-error-handling';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(503);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(false);
      expect(responseData.retryable).toBe(true);
      expect(responseData.retryAfter).toBe(30);
      expect(responseData.suggestions).toContain('請檢查網路連線');
      expect(responseData.troubleshooting).toBeDefined();
      expect(responseData.supportContact).toBeDefined();
      expect(res.getHeader('Retry-After')).toBe('30');
    });

    it('應該處理不可重試的錯誤', async () => {
      mockCreateRegistration.mockResolvedValue({
        success: false,
        error: '活動不可報名',
        errorCode: 'EVENT_NOT_AVAILABLE'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-non-retryable';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(false);
      expect(responseData.retryable).toBe(false);
      expect(responseData.retryEndpoint).toBeUndefined();
    });
  });

  describe('Enhanced Response Data', () => {
    it('應該返回完整的成功回應', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'x-line-access-token': 'valid-token',
          'user-agent': 'Test Browser'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-complete-response';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      
      // 基本結構
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrationId).toBeDefined();
      expect(responseData.data.orderCode).toBe('ORDER123');
      expect(responseData.data.status).toBe('confirmed');
      
      // 處理資訊
      expect(responseData.data.processingInfo).toBeDefined();
      expect(responseData.data.processingInfo.processingTime).toBeGreaterThan(0);
      expect(responseData.data.processingInfo.apiVersion).toBe('v1');
      
      // 支援資訊
      expect(responseData.data.supportInfo).toBeDefined();
      expect(responseData.data.supportInfo.supportContact).toBeDefined();
      
      // 身份特定資訊
      expect(responseData.data.identitySpecificInfo).toBeDefined();
      expect(responseData.data.identitySpecificInfo.title).toBe('志工報名完成');
      
      // 下一步驟
      expect(responseData.data.nextSteps).toHaveLength(4);
    });

    it('應該為法師提供特定資訊', async () => {
      const monkData = {
        ...mockRegistrationData,
        identity: 'monk' as const,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          templeName: '測試寺院',
          emergencyContact: undefined
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: monkData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-monk-response';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.data.identity).toBe('monk');
      expect(responseData.data.personalInfo.templeName).toBe('測試寺院');
      expect(responseData.data.identitySpecificInfo.title).toBe('法師報名完成');
    });
  });

  describe('Data Validation', () => {
    it('應該驗證姓名格式', async () => {
      const invalidData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          name: '<script>alert("test")</script>'
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: invalidData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-name-validation';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('姓名包含不允許的字元');
    });

    it('應該驗證電話格式', async () => {
      const invalidData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          phone: '123'
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: invalidData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-phone-validation';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('聯絡電話格式不正確');
    });

    it('應該驗證 Email 格式', async () => {
      const invalidData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          email: 'invalid-email'
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: invalidData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-email-validation';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('Email 格式不正確');
    });
  });

  describe('Database Integration', () => {
    it('應該處理資料庫儲存失敗', async () => {
      // Mock database error
      const originalCreateRegistration = db.createRegistration;
      db.createRegistration = jest.fn().mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-db-error';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DATABASE_STORAGE_ERROR');
      expect(responseData.message).toContain('ORDER123');

      // Restore original function
      db.createRegistration = originalCreateRegistration;
    });

    it('應該防止重複報名', async () => {
      // Create existing registration
      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        pretixOrderId: 'EXISTING123',
        status: 'confirmed'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-line-access-token': 'valid-token' },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-duplicate';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('ALREADY_REGISTERED');
    });
  });
});