/**
 * 報名處理 API 測試
 * Registration processing API tests
 */

import { createMocks } from 'node-mocks-http';
import { db } from '../../lib/database';
import { initializePretixClient } from '../../services/pretix';
import { initializeRegistrationService } from '../../services/registration';
import { PretixConfig } from '../../services/pretix';
import registrationHandler from '../../pages/api/v1/registration/index';
import registrationDetailHandler from '../../pages/api/v1/registration/[id]';
import myRegistrationsHandler from '../../pages/api/v1/registration/my';
import retryHandler from '../../pages/api/v1/registration/retry';

// Mock Pretix client
const mockPretixConfig: PretixConfig = {
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
    source: 'test'
  }
};

describe('Registration API', () => {
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
  });

  describe('POST /api/v1/registration', () => {
    it('應該成功建立報名', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      // Mock LINE 使用者驗證
      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-123';

      // Mock Pretix 服務回應
      const mockPretixOrder = {
        code: 'ORDER123',
        status: 'n' as const,
        email: 'test@example.com',
        datetime: '2024-01-01T12:00:00Z',
        total: '0.00',
        positions: []
      };

      // 這裡需要 mock getRegistrationService().createRegistration
      // 由於實際測試中 Pretix 服務可能不可用，我們需要 mock 它
      
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

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrationId).toBeDefined();
      expect(responseData.data.orderCode).toBe('ORDER123');
      expect(responseData.data.status).toBe('confirmed');
      expect(responseData.data.confirmationMessage).toContain('ORDER123');
      expect(responseData.data.nextSteps).toHaveLength(3);
    });

    it('應該拒絕無效的個人資料', async () => {
      const invalidData = {
        ...mockRegistrationData,
        personalInfo: {
          name: '', // 空名稱
          phone: 'invalid-phone',
          email: 'invalid-email'
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: invalidData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-124';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('VALIDATION_ERROR');
    });

    it('應該拒絕重複報名', async () => {
      // 先建立一個報名記錄
      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'EXISTING123',
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
      (req as any).requestId = 'test-request-125';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('ALREADY_REGISTERED');
    });

    it('應該驗證法師必填欄位', async () => {
      const monkData = {
        ...mockRegistrationData,
        identity: 'monk' as const,
        personalInfo: {
          name: '測試法師',
          phone: '0912345678',
          // 缺少 templeName
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
      (req as any).requestId = 'test-request-126';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('寺院名稱');
    });

    it('應該驗證志工必填欄位', async () => {
      const volunteerData = {
        ...mockRegistrationData,
        personalInfo: {
          name: '測試志工',
          phone: '0912345678',
          // 缺少 emergencyContact
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: volunteerData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-127';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('緊急聯絡人');
    });

    it('應該驗證姓名長度限制', async () => {
      const longNameData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          name: 'A'.repeat(51) // 超過 50 字元限制
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: longNameData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-128';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('姓名長度不能超過 50 個字元');
    });

    it('應該驗證電話格式', async () => {
      const invalidPhoneData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          phone: '123' // 無效電話格式
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: invalidPhoneData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-129';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('聯絡電話格式不正確');
    });

    it('應該驗證 Email 格式', async () => {
      const invalidEmailData = {
        ...mockRegistrationData,
        personalInfo: {
          ...mockRegistrationData.personalInfo,
          email: 'invalid-email' // 無效 Email 格式
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: invalidEmailData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-130';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('Email 格式不正確');
    });

    it('應該驗證交通車時間', async () => {
      const invalidTransportData = {
        ...mockRegistrationData,
        transport: {
          required: true,
          locationId: 'location-1',
          pickupTime: '2020-01-01T07:30:00Z' // 過去時間
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: invalidTransportData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-131';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('上車時間不能是過去時間');
    });

    it('應該處理 Pretix 服務錯誤並提供重試建議', async () => {
      const mockCreateRegistration = jest.fn().mockResolvedValue({
        success: false,
        error: '網路連線失敗',
        errorCode: 'NETWORK_ERROR'
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
      (req as any).requestId = 'test-request-132';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(503);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.retryable).toBe(true);
      expect(responseData.retryAfter).toBe(30);
      expect(responseData.suggestions).toContain('請稍後再試');
      expect(res.getHeader('Retry-After')).toBe('30');
    });
  });

  describe('GET /api/v1/registration/[id]', () => {
    it('應該成功查詢報名狀態', async () => {
      // 建立測試報名記錄
      const registration = await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER123',
        status: 'confirmed'
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registration.id
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-128';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrationId).toBe(registration.id);
      expect(responseData.data.status).toBe('confirmed');
    });

    it('應該拒絕查詢他人的報名記錄', async () => {
      // 建立其他使用者的報名記錄
      const registration = await db.createRegistration({
        userId: 'other-user-456',
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER123',
        status: 'confirmed'
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registration.id
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-129';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('FORBIDDEN');
    });

    it('應該返回 404 當報名記錄不存在', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: 'non-existent-id'
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-130';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/registration/[id]', () => {
    it('應該成功更新報名資料', async () => {
      const registration = await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER123',
        status: 'confirmed'
      });

      const updateData = {
        personalInfo: {
          specialRequirements: '更新的特殊需求'
        },
        transport: {
          required: false
        }
      };

      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        query: {
          id: registration.id
        },
        body: updateData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-131';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.personalInfo.specialRequirements).toBe('更新的特殊需求');
      expect(responseData.data.transport.required).toBe(false);
    });

    it('應該拒絕更新已取消的報名', async () => {
      const registration = await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER123',
        status: 'cancelled'
      });

      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        query: {
          id: registration.id
        },
        body: {
          personalInfo: {
            specialRequirements: '嘗試更新'
          }
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-132';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('REGISTRATION_CANCELLED');
    });
  });

  describe('DELETE /api/v1/registration/[id]', () => {
    it('應該成功取消報名', async () => {
      const registration = await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER123',
        status: 'confirmed'
      });

      const { req, res } = createMocks({
        method: 'DELETE',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registration.id
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-133';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe('cancelled');
    });

    it('應該拒絕取消已取消的報名', async () => {
      const registration = await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: mockRegistrationData.eventSlug,
        identity: mockRegistrationData.identity,
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER123',
        status: 'cancelled'
      });

      const { req, res } = createMocks({
        method: 'DELETE',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registration.id
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-134';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('ALREADY_CANCELLED');
    });
  });

  describe('GET /api/v1/registration/my', () => {
    it('應該成功查詢使用者的報名記錄', async () => {
      // 建立多個報名記錄
      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: 'event-1',
        identity: 'volunteer',
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER1',
        status: 'confirmed'
      });

      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: 'event-2',
        identity: 'monk',
        personalInfo: { ...mockRegistrationData.personalInfo, templeName: '測試寺院' },
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER2',
        status: 'pending'
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          limit: '10',
          offset: '0'
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-135';

      await myRegistrationsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrations).toHaveLength(2);
      expect(responseData.data.pagination.total).toBe(2);
    });

    it('應該支援狀態篩選', async () => {
      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: 'event-1',
        identity: 'volunteer',
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER1',
        status: 'confirmed'
      });

      await db.createRegistration({
        userId: mockLineUser.lineUserId,
        eventId: 'event-2',
        identity: 'volunteer',
        personalInfo: mockRegistrationData.personalInfo,
        transport: mockRegistrationData.transport,
        pretixOrderId: 'ORDER2',
        status: 'cancelled'
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          status: 'confirmed',
          limit: '10',
          offset: '0'
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-136';

      await myRegistrationsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrations).toHaveLength(1);
      expect(responseData.data.registrations[0].status).toBe('confirmed');
    });
  });
});

describe('Registration Retry API', () => {
  beforeEach(async () => {
    await db.clearAll();
  });

  describe('POST /api/v1/registration/retry', () => {
    it('應該建立可重試的報名', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: mockRegistrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-137';

      await retryHandler(req, res);

      // 由於重試機制可能立即成功或需要重試，我們檢查狀態碼
      expect([201, 202]).toContain(res._getStatusCode());
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.retryId).toBeDefined();
    });
  });

  describe('GET /api/v1/registration/retry', () => {
    it('應該查詢使用者的重試記錄', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'test-request-138';

      await retryHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.retryRecords).toBeDefined();
      expect(Array.isArray(responseData.data.retryRecords)).toBe(true);
    });
  });
});