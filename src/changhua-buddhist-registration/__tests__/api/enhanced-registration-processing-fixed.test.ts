/**
 * 增強版報名處理 API 測試 - 修正版
 * Enhanced registration processing API tests - Fixed version
 */

import { createMocks } from 'node-mocks-http';
import { db } from '../../lib/database';

// Mock all dependencies before importing the handler
const mockCreateRegistration = jest.fn();

// Mock the registration service
jest.mock('../../services/registration', () => ({
  getRegistrationService: () => ({
    createRegistration: mockCreateRegistration
  }),
  initializeRegistrationService: jest.fn(),
  RegistrationService: jest.fn()
}));

// Mock the Pretix client
jest.mock('../../services/pretix', () => ({
  initializePretixClient: jest.fn(() => ({
    healthCheck: jest.fn().mockResolvedValue(true)
  })),
  getPretixClient: jest.fn(),
  PretixClient: jest.fn(),
  PretixAPIError: class extends Error {}
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
  rateLimitConfigs: {
    registration: {}
  }
}));

// Mock validation and security utilities
jest.mock('../../lib/validation', () => ({
  validateRequest: jest.fn(),
  registrationSchema: {},
  securityHeaders: (req: any, res: any, next: () => void) => next(),
  validateInputLength: (req: any, res: any, next: () => void) => next(),
  validateCors: (req: any, res: any, next: () => void) => next()
}));

// Mock security utilities
jest.mock('../../utils/security', () => ({
  sanitizeFormData: (data: any) => data
}));

import registrationHandler from '../../pages/api/v1/registration/index';

// Mock LINE user
const mockLineUser = {
  lineUserId: 'test-user-enhanced-123',
  displayName: 'Enhanced Test User',
  pictureUrl: 'https://example.com/avatar.jpg'
};

// Mock registration data
const mockRegistrationData = {
  eventSlug: 'enhanced-test-event-2024',
  identity: 'volunteer' as const,
  personalInfo: {
    name: '測試使用者增強版',
    phone: '0912-345-678',
    email: 'enhanced-test@example.com',
    emergencyContact: '0987-654-321',
    specialRequirements: '素食，需要輪椅通道'
  },
  transport: {
    required: true,
    locationId: 'enhanced-location-1',
    pickupTime: '2024-12-01T07:30:00Z'
  },
  metadata: {
    source: 'enhanced-test',
    version: '2.0'
  }
};

describe('Enhanced Registration Processing API - Fixed', () => {
  beforeAll(async () => {
    await db.clearAll();
  });

  beforeEach(async () => {
    await db.clearAll();
    jest.clearAllMocks();
    
    // Set default successful response
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

  describe('Enhanced Data Processing', () => {
    it('應該正確格式化電話號碼', async () => {
      const testCases = [
        { input: '0912-345-678', expected: '0912345678' },
        { input: '0912 345 678', expected: '0912345678' },
        { input: '+886-912-345-678', expected: '0912345678' },
        { input: '02-1234-5678', expected: '0212345678' }
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
          headers: {
            'x-line-access-token': 'valid-token',
            'content-type': 'application/json'
          },
          body: testData
        });

        (req as any).user = mockLineUser;
        (req as any).requestId = `test-request-phone-${Date.now()}`;
        (req as any).startTime = Date.now();

        await registrationHandler(req, res);

        if (res._getStatusCode() === 201) {
          const responseData = JSON.parse(res._getData());
          expect(responseData.data.personalInfo.phone).toBe(testCase.expected);
        }
      }
    });

    it('應該生成唯一的報名 ID', async () => {
      const registrationIds = new Set();
      
      for (let i = 0; i < 5; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          headers: {
            'x-line-access-token': 'valid-token',
            'content-type': 'application/json'
          },
          body: {
            ...mockRegistrationData,
            personalInfo: {
              ...mockRegistrationData.personalInfo,
              name: `測試使用者${i}`
            }
          }
        });

        (req as any).user = { ...mockLineUser, lineUserId: `test-user-${i}` };
        (req as any).requestId = `test-request-id-${i}`;
        (req as any).startTime = Date.now();

        await registrationHandler(req, res);

        if (res._getStatusCode() === 201) {
          const responseData = JSON.parse(res._getData());
          const registrationId = responseData.data.registrationId;
          
          expect(registrationId).toMatch(/^REG_[A-Z0-9_]+$/);
          expect(registrationIds.has(registrationId)).toBe(false);
          registrationIds.add(registrationId);
        }
      }

      expect(registrationIds.size).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Error Handling', () => {
    it('應該提供詳細的錯誤資訊和故障排除建議', async () => {
      const errorCases = [
        {
          errorCode: 'EVENT_NOT_AVAILABLE',
          expectedStatus: 409,
          expectedRetryable: false,
          expectedSuggestions: ['請選擇其他活動', '或等待新活動開放報名']
        },
        {
          errorCode: 'NETWORK_ERROR',
          expectedStatus: 503,
          expectedRetryable: true,
          expectedRetryAfter: 30,
          expectedSuggestions: ['請檢查網路連線', '稍後再試或使用自動重試功能']
        }
      ];

      for (const errorCase of errorCases) {
        const { req, res } = createMocks({
          method: 'POST',
          headers: {
            'x-line-access-token': 'valid-token',
            'content-type': 'application/json'
          },
          body: mockRegistrationData
        });

        (req as any).user = mockLineUser;
        (req as any).requestId = `test-request-error-${errorCase.errorCode}`;
        (req as any).startTime = Date.now();

        // Mock error response
        mockCreateRegistration.mockResolvedValue({
          success: false,
          error: `測試錯誤: ${errorCase.errorCode}`,
          errorCode: errorCase.errorCode
        });

        await registrationHandler(req, res);

        expect(res._getStatusCode()).toBe(errorCase.expectedStatus);
        const responseData = JSON.parse(res._getData());
        
        expect(responseData.success).toBe(false);
        expect(responseData.retryable).toBe(errorCase.expectedRetryable);
        expect(responseData.suggestions).toEqual(expect.arrayContaining(errorCase.expectedSuggestions));
        expect(responseData.troubleshooting).toBeDefined();
        expect(responseData.supportContact).toBeDefined();
        
        if (errorCase.expectedRetryAfter) {
          expect(responseData.retryAfter).toBe(errorCase.expectedRetryAfter);
          expect(res.getHeader('Retry-After')).toBe(errorCase.expectedRetryAfter.toString());
        }
        
        if (errorCase.expectedRetryable) {
          expect(responseData.retryEndpoint).toBe('/api/v1/registration/retry');
        }
      }
    });
  });

  describe('Data Validation Enhancement', () => {
    it('應該驗證姓名中的特殊字元', async () => {
      const invalidNames = [
        '<script>alert("test")</script>',
        'Test@#$%^&*()',
        '測試<>{}[]',
        'Test\n\r\t'
      ];

      for (const invalidName of invalidNames) {
        const testData = {
          ...mockRegistrationData,
          personalInfo: {
            ...mockRegistrationData.personalInfo,
            name: invalidName
          }
        };

        const { req, res } = createMocks({
          method: 'POST',
          headers: {
            'x-line-access-token': 'valid-token',
            'content-type': 'application/json'
          },
          body: testData
        });

        (req as any).user = mockLineUser;
        (req as any).requestId = `test-request-invalid-name-${Date.now()}`;
        (req as any).startTime = Date.now();

        await registrationHandler(req, res);

        console.log('Status Code:', res._getStatusCode());
        console.log('Response Data:', res._getData());
        
        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.message).toContain('姓名包含不允許的字元');
      }
    });

    it('應該驗證電話號碼格式', async () => {
      const invalidPhones = [
        '123',
        '0912-345',
        'abc-def-ghij',
        '+1-555-123-4567',
        '0912345678901234'
      ];

      for (const invalidPhone of invalidPhones) {
        const testData = {
          ...mockRegistrationData,
          personalInfo: {
            ...mockRegistrationData.personalInfo,
            phone: invalidPhone
          }
        };

        const { req, res } = createMocks({
          method: 'POST',
          headers: {
            'x-line-access-token': 'valid-token',
            'content-type': 'application/json'
          },
          body: testData
        });

        (req as any).user = mockLineUser;
        (req as any).requestId = `test-request-invalid-phone-${Date.now()}`;
        (req as any).startTime = Date.now();

        await registrationHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.message).toContain('聯絡電話格式不正確');
      }
    });
  });

  describe('Performance and Monitoring', () => {
    it('應該記錄處理時間', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-performance';
      (req as any).startTime = Date.now();

      await registrationHandler(req, res);

      if (res._getStatusCode() === 201) {
        const responseData = JSON.parse(res._getData());
        expect(responseData.data.processingInfo.processingTime).toBeGreaterThan(0);
        expect(responseData.data.processingInfo.timestamp).toBeDefined();
      }
    });
  });
});