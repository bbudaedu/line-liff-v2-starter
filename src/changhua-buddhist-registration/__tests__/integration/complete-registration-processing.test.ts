/**
 * 完整報名處理流程整合測試
 * Complete registration processing flow integration tests
 */

import { createMocks } from 'node-mocks-http';
import { db } from '../../lib/database';
import { initializePretixClient } from '../../services/pretix';
import { initializeRegistrationService } from '../../services/registration';
import { getRegistrationRetryService } from '../../services/registration-retry';
import registrationHandler from '../../pages/api/v1/registration/index';
import retryHandler from '../../pages/api/v1/registration/retry';

// Mock Pretix client
const mockPretixConfig = {
  baseURL: 'https://test.pretix.eu/api/v1',
  apiToken: 'test-token',
  organizerSlug: 'test-organizer'
};

// Mock LINE user
const mockLineUser = {
  lineUserId: 'test-user-123',
  displayName: 'Test User',
  pictureUrl: 'https://example.com/avatar.jpg'
};

// Mock registration data
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
  },
  metadata: {
    source: 'integration-test'
  }
};

describe('Complete Registration Processing Flow', () => {
  beforeAll(async () => {
    // 初始化服務
    const pretixClient = initializePretixClient(mockPretixConfig);
    initializeRegistrationService(pretixClient);
    
    // 清理資料庫
    await db.clearAll();
  });

  beforeEach(async () => {
    // 每個測試前清理資料庫
    await db.clearAll();
    jest.clearAllMocks();
  });

  describe('成功報名流程', () => {
    it('應該完成完整的報名流程', async () => {
      // Mock successful Pretix response
      const mockCreateRegistration = jest.fn().mockResolvedValue({
        success: true,
        order: {
          code: 'ORDER123',
          status: 'n',
          email: 'test@example.com',
          datetime: '2024-01-01T12:00:00Z',
          total: '0.00'
        }
      });

      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: mockCreateRegistration
        })
      }));

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-001';

      await registrationHandler(req, res);

      // 驗證回應
      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrationId).toBeDefined();
      expect(responseData.data.orderCode).toBe('ORDER123');
      expect(responseData.data.status).toBe('confirmed');
      expect(responseData.data.confirmationMessage).toContain('ORDER123');
      expect(responseData.data.nextSteps).toHaveLength(3);
      expect(responseData.data.pretixOrder.code).toBe('ORDER123');

      // 驗證資料庫記錄
      const registrations = await db.getRegistrationsByUserId(mockLineUser.lineUserId);
      expect(registrations).toHaveLength(1);
      
      const registration = registrations[0];
      expect(registration.eventId).toBe(mockRegistrationData.eventSlug);
      expect(registration.identity).toBe(mockRegistrationData.identity);
      expect(registration.personalInfo.name).toBe(mockRegistrationData.personalInfo.name);
      expect(registration.transport?.required).toBe(true);
      expect(registration.pretixOrderId).toBe('ORDER123');
      expect(registration.status).toBe('confirmed');
    });

    it('應該正確處理法師報名', async () => {
      const monkRegistrationData = {
        ...mockRegistrationData,
        identity: 'monk' as const,
        personalInfo: {
          name: '釋測試',
          phone: '0912345678',
          email: 'monk@temple.org',
          templeName: '測試寺院',
          specialRequirements: '需要素食'
        }
      };

      const mockCreateRegistration = jest.fn().mockResolvedValue({
        success: true,
        order: {
          code: 'MONK001',
          status: 'n',
          email: 'monk@temple.org',
          datetime: '2024-01-01T12:00:00Z',
          total: '0.00'
        }
      });

      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: mockCreateRegistration
        })
      }));

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: monkRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-002';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.identity).toBe('monk');

      // 驗證資料庫記錄
      const registrations = await db.getRegistrationsByUserId(mockLineUser.lineUserId);
      const registration = registrations[0];
      expect(registration.personalInfo.templeName).toBe('測試寺院');
      expect(registration.personalInfo.emergencyContact).toBeUndefined();
    });
  });

  describe('錯誤處理和重試機制', () => {
    it('應該處理 Pretix 服務暫時性錯誤', async () => {
      const mockCreateRegistration = jest.fn().mockResolvedValue({
        success: false,
        error: '服務暫時無法使用',
        errorCode: 'SERVER_ERROR'
      });

      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: mockCreateRegistration
        })
      }));

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-003';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(502);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.retryable).toBe(true);
      expect(responseData.retryAfter).toBe(60);
      expect(res.getHeader('Retry-After')).toBe('60');
    });

    it('應該處理活動額滿錯誤', async () => {
      const mockCreateRegistration = jest.fn().mockResolvedValue({
        success: false,
        error: '活動已額滿',
        errorCode: 'ITEM_NOT_AVAILABLE'
      });

      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: mockCreateRegistration
        })
      }));

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-004';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.retryable).toBe(false);
      expect(responseData.suggestions).toContain('請檢查報名資訊');
    });

    it('應該支援重試機制', async () => {
      // 第一次失敗，第二次成功的情境
      let attemptCount = 0;
      const mockCreateRegistration = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve({
            success: false,
            error: '網路連線失敗',
            errorCode: 'NETWORK_ERROR'
          });
        } else {
          return Promise.resolve({
            success: true,
            order: {
              code: 'RETRY001',
              status: 'n',
              email: 'test@example.com',
              datetime: '2024-01-01T12:00:00Z',
              total: '0.00'
            }
          });
        }
      });

      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: mockCreateRegistration
        })
      }));

      // 使用重試 API
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-005';

      await retryHandler(req, res);

      // 第一次嘗試應該返回 202（處理中）
      expect([201, 202]).toContain(res._getStatusCode());
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.retryId).toBeDefined();

      // 等待重試完成（在實際測試中可能需要 mock 時間）
      if (res._getStatusCode() === 202) {
        expect(responseData.data.status).toBe('retrying');
      } else {
        expect(responseData.data.status).toBe('success');
      }
    });
  });

  describe('資料驗證', () => {
    it('應該拒絕無效的事件代碼', async () => {
      const invalidEventData = {
        ...mockRegistrationData,
        eventSlug: 'invalid event slug!' // 包含無效字元
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: invalidEventData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-006';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('活動代碼格式不正確');
    });

    it('應該拒絕過長的特殊需求', async () => {
      const longRequirementsData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          specialRequirements: 'A'.repeat(501) // 超過 500 字元限制
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: longRequirementsData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-007';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('特殊需求說明不能超過 500 個字元');
    });
  });

  describe('重複報名檢查', () => {
    it('應該防止重複報名同一活動', async () => {
      // 先建立一個報名記錄
      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'EXISTING001',
        status: 'confirmed'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-008';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('ALREADY_REGISTERED');
      expect(responseData.message).toContain('您已經報名過此活動');
    });

    it('應該允許報名不同活動', async () => {
      // 先建立一個不同活動的報名記錄
      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: 'different-event-2024',
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'DIFFERENT001',
        status: 'confirmed'
      });

      const mockCreateRegistration = jest.fn().mockResolvedValue({
        success: true,
        order: {
          code: 'SECOND001',
          status: 'n',
          email: 'test@example.com',
          datetime: '2024-01-01T12:00:00Z',
          total: '0.00'
        }
      });

      jest.doMock('../../services/registration', () => ({
        getRegistrationService: () => ({
          createRegistration: mockCreateRegistration
        })
      }));

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-009';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.orderCode).toBe('SECOND001');

      // 驗證現在有兩個報名記錄
      const registrations = await db.getRegistrationsByUserId(mockLineUser.lineUserId);
      expect(registrations).toHaveLength(2);
    });
  });
});