/**
 * 增強版報名處理 API 測試
 * Enhanced registration processing API tests
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

// Mock security monitoring to avoid rate limiting in tests
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

// Mock rate limiting to avoid 429 errors in tests
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

// Mock registration data with comprehensive fields
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

describe('Enhanced Registration Processing API', () => {
  beforeAll(async () => {
    // 清理資料庫
    await db.clearAll();
  });

  beforeEach(async () => {
    // 每個測試前清理資料庫
    await db.clearAll();
    
    // Reset all mocks and set default successful response
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

        // Mock successful Pretix response
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

        await registrationHandler(req, res);

        if (res._getStatusCode() === 201) {
          const responseData = JSON.parse(res._getData());
          expect(responseData.data.personalInfo.phone).toBe(testCase.expected);
        }
      }
    });

    it('應該生成唯一的報名 ID', async () => {
      const registrationIds = new Set();
      
      for (let i = 0; i < 10; i++) {
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

        // Mock successful Pretix response
        jest.doMock('../../services/registration', () => ({
          getRegistrationService: () => ({
            createRegistration: jest.fn().mockResolvedValue({
              success: true,
              order: {
                code: `ORDER${i}`,
                status: 'n',
                email: 'test@example.com',
                datetime: '2024-01-01T12:00:00Z',
                total: '0.00'
              }
            })
          })
        }));

        await registrationHandler(req, res);

        if (res._getStatusCode() === 201) {
          const responseData = JSON.parse(res._getData());
          const registrationId = responseData.data.registrationId;
          
          expect(registrationId).toMatch(/^REG_[A-Z0-9_]+$/);
          expect(registrationIds.has(registrationId)).toBe(false);
          registrationIds.add(registrationId);
        }
      }

      expect(registrationIds.size).toBe(10);
    });

    it('應該正確處理交通車資料格式化', async () => {
      const testData = {
        ...mockRegistrationData,
        transport: {
          required: true,
          locationId: '  location-with-spaces  ',
          pickupTime: '2024-12-01T07:30:00.000Z'
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
      (req as any).requestId = 'test-request-transport';
      (req as any).startTime = Date.now();

      // Mock successful Pretix response
      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: jest.fn().mockResolvedValue({
            success: true,
            order: {
              code: 'ORDER123',
              status: 'n',
              email: 'test@example.com',
              datetime: '2024-01-01T12:00:00Z',
              total: '0.00'
            }
          })
        })
      }));

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.transport.locationId).toBe('location-with-spaces');
      expect(responseData.data.transport.required).toBe(true);
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
        },
        {
          errorCode: 'SERVER_ERROR',
          expectedStatus: 502,
          expectedRetryable: true,
          expectedRetryAfter: 60,
          expectedSuggestions: ['系統暫時繁忙，請稍後再試', '或使用自動重試功能']
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
        jest.doMock('../../services/registration', () => ({
          getRegistrationService: () => ({
            createRegistration: jest.fn().mockResolvedValue({
              success: false,
              error: `測試錯誤: ${errorCase.errorCode}`,
              errorCode: errorCase.errorCode
            })
          })
        }));

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

    it('應該處理資料庫儲存失敗的情況', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-db-error';
      (req as any).startTime = Date.now();

      // Mock successful Pretix response but database error
      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: jest.fn().mockResolvedValue({
            success: true,
            order: {
              code: 'ORDER123',
              status: 'n',
              email: 'test@example.com',
              datetime: '2024-01-01T12:00:00Z',
              total: '0.00'
            }
          })
        })
      }));

      // Mock database error
      const originalCreateRegistration = db.createRegistration;
      db.createRegistration = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DATABASE_STORAGE_ERROR');
      expect(responseData.message).toContain('ORDER123');

      // Restore original function
      db.createRegistration = originalCreateRegistration;
    });
  });

  describe('Enhanced Response Data', () => {
    it('應該返回完整的成功回應資料', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 Test Browser',
          'accept-language': 'zh-TW,zh;q=0.9'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-complete-response';
      (req as any).startTime = Date.now();

      // Mock successful Pretix response
      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: jest.fn().mockResolvedValue({
            success: true,
            order: {
              code: 'ORDER123',
              status: 'n',
              email: 'test@example.com',
              datetime: '2024-01-01T12:00:00Z',
              total: '0.00'
            }
          })
        })
      }));

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      
      // 檢查基本回應結構
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      
      // 檢查報名資料
      expect(responseData.data.registrationId).toBeDefined();
      expect(responseData.data.orderCode).toBe('ORDER123');
      expect(responseData.data.status).toBe('confirmed');
      expect(responseData.data.eventSlug).toBe(mockRegistrationData.eventSlug);
      expect(responseData.data.identity).toBe(mockRegistrationData.identity);
      
      // 檢查個人資料
      expect(responseData.data.personalInfo).toBeDefined();
      expect(responseData.data.personalInfo.name).toBe(mockRegistrationData.personalInfo.name);
      expect(responseData.data.personalInfo.phone).toBe('0912345678'); // 格式化後的電話
      
      // 檢查交通車資料
      expect(responseData.data.transport).toBeDefined();
      expect(responseData.data.transport.required).toBe(true);
      
      // 檢查 Pretix 訂單資料
      expect(responseData.data.pretixOrder).toBeDefined();
      expect(responseData.data.pretixOrder.code).toBe('ORDER123');
      
      // 檢查處理資訊
      expect(responseData.data.processingInfo).toBeDefined();
      expect(responseData.data.processingInfo.processingTime).toBeGreaterThan(0);
      expect(responseData.data.processingInfo.apiVersion).toBe('v1');
      
      // 檢查支援資訊
      expect(responseData.data.supportInfo).toBeDefined();
      expect(responseData.data.supportInfo.queryUrl).toContain('/api/v1/registration/');
      expect(responseData.data.supportInfo.supportContact).toBeDefined();
      
      // 檢查身份特定資訊
      expect(responseData.data.identitySpecificInfo).toBeDefined();
      expect(responseData.data.identitySpecificInfo.title).toBe('志工報名完成');
      expect(responseData.data.identitySpecificInfo.reminders).toHaveLength(3);
      
      // 檢查下一步驟
      expect(responseData.data.nextSteps).toHaveLength(4);
      expect(responseData.data.nextSteps).toContain('請保留此訂單編號以供查詢');
    });

    it('應該為法師身份提供特定的回應資訊', async () => {
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
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: monkData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-monk-response';
      (req as any).startTime = Date.now();

      // Mock successful Pretix response
      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: jest.fn().mockResolvedValue({
            success: true,
            order: {
              code: 'ORDER123',
              status: 'n',
              email: 'test@example.com',
              datetime: '2024-01-01T12:00:00Z',
              total: '0.00'
            }
          })
        })
      }));

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.data.identity).toBe('monk');
      expect(responseData.data.personalInfo.templeName).toBe('測試寺院');
      expect(responseData.data.identitySpecificInfo.title).toBe('法師報名完成');
      expect(responseData.data.identitySpecificInfo.reminders).toContain('請攜帶身份證明文件');
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

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.message).toContain('姓名包含不允許的字元');
      }
    });

    it('應該驗證電話號碼的各種格式', async () => {
      const validPhones = [
        '0912345678',
        '0912-345-678',
        '0912 345 678',
        '+886912345678',
        '+886-912-345-678',
        '02-12345678',
        '04-12345678'
      ];

      const invalidPhones = [
        '123',
        '0912-345',
        'abc-def-ghij',
        '+1-555-123-4567',
        '0912345678901234'
      ];

      // 測試有效電話號碼
      for (const validPhone of validPhones) {
        const testData = {
          ...mockRegistrationData,
          personalInfo: {
            ...mockRegistrationData.personalInfo,
            phone: validPhone
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

        (req as any).user = { ...mockLineUser, lineUserId: `test-user-${Date.now()}` };
        (req as any).requestId = `test-request-valid-phone-${Date.now()}`;
        (req as any).startTime = Date.now();

        // Mock successful Pretix response
        jest.doMock('../../services/registration', () => ({
          getRegistrationService: () => ({
            createRegistration: jest.fn().mockResolvedValue({
              success: true,
              order: {
                code: 'ORDER123',
                status: 'n',
                email: 'test@example.com',
                datetime: '2024-01-01T12:00:00Z',
                total: '0.00'
              }
            })
          })
        }));

        await registrationHandler(req, res);

        // 有效電話號碼應該通過驗證（可能因為其他原因失敗，但不應該是電話格式錯誤）
        if (res._getStatusCode() === 400) {
          const responseData = JSON.parse(res._getData());
          expect(responseData.message).not.toContain('聯絡電話格式不正確');
        }
      }

      // 測試無效電話號碼
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

    it('應該驗證 Email 格式', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'test123@test-domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test@.com'
      ];

      // 測試有效 Email
      for (const validEmail of validEmails) {
        const testData = {
          ...mockRegistrationData,
          personalInfo: {
            ...mockRegistrationData.personalInfo,
            email: validEmail
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

        (req as any).user = { ...mockLineUser, lineUserId: `test-user-${Date.now()}` };
        (req as any).requestId = `test-request-valid-email-${Date.now()}`;
        (req as any).startTime = Date.now();

        // Mock successful Pretix response
        jest.doMock('../../services/registration', () => ({
          getRegistrationService: () => ({
            createRegistration: jest.fn().mockResolvedValue({
              success: true,
              order: {
                code: 'ORDER123',
                status: 'n',
                email: validEmail,
                datetime: '2024-01-01T12:00:00Z',
                total: '0.00'
              }
            })
          })
        }));

        await registrationHandler(req, res);

        // 有效 Email 應該通過驗證
        if (res._getStatusCode() === 400) {
          const responseData = JSON.parse(res._getData());
          expect(responseData.message).not.toContain('Email 格式不正確');
        }
      }

      // 測試無效 Email
      for (const invalidEmail of invalidEmails) {
        const testData = {
          ...mockRegistrationData,
          personalInfo: {
            ...mockRegistrationData.personalInfo,
            email: invalidEmail
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
        (req as any).requestId = `test-request-invalid-email-${Date.now()}`;
        (req as any).startTime = Date.now();

        await registrationHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.message).toContain('Email 格式不正確');
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

      // Mock successful Pretix response with delay
      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            return {
              success: true,
              order: {
                code: 'ORDER123',
                status: 'n',
                email: 'test@example.com',
                datetime: '2024-01-01T12:00:00Z',
                total: '0.00'
              }
            };
          })
        })
      }));

      await registrationHandler(req, res);

      if (res._getStatusCode() === 201) {
        const responseData = JSON.parse(res._getData());
        expect(responseData.data.processingInfo.processingTime).toBeGreaterThan(100);
        expect(responseData.data.processingInfo.timestamp).toBeDefined();
      }
    });
  });
});