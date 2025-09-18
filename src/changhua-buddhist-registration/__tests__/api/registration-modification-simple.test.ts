/**
 * 報名修改和取消 API 簡化測試
 * Registration modification and cancellation API simplified tests
 */

import { createMocks } from 'node-mocks-http';
import { db } from '../../lib/database';

// Mock all security and middleware dependencies
jest.mock('../../lib/middleware', () => ({
  withAuthMiddleware: (handler: any) => handler,
  ExtendedNextApiRequest: {}
}));

jest.mock('../../lib/rate-limiting', () => ({
  rateLimit: () => (handler: any) => handler,
  rateLimitConfigs: {
    registration: {},
    query: {}
  }
}));

jest.mock('../../lib/security-monitoring', () => ({
  securityMonitoring: (req: any, res: any, next: any) => next(),
  logSecurityEvent: jest.fn(),
  SecurityEventType: {
    PERMISSION_DENIED: 'permission_denied',
    DATA_ACCESS: 'data_access',
    DATA_UPDATED: 'data_updated',
    DATA_CREATED: 'data_created',
    SYSTEM_ERROR: 'system_error'
  }
}));

jest.mock('../../lib/validation', () => ({
  securityHeaders: (req: any, res: any, next: any) => next(),
  validateCors: (req: any, res: any, next: any) => next(),
  validateInputLength: (req: any, res: any, next: any) => next()
}));

jest.mock('../../utils/security', () => ({
  sanitizeFormData: (data: any) => data
}));

jest.mock('../../services/registration', () => ({
  getRegistrationService: () => ({
    cancelRegistration: jest.fn().mockResolvedValue({
      code: 'TEST-ORDER-123',
      status: 'c'
    })
  })
}));

jest.mock('../../lib/errors', () => ({
  ...jest.requireActual('../../lib/errors'),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import handlers after mocking
import modificationHandler from '../../pages/api/v1/registration/modify';
import historyHandler from '../../pages/api/v1/registration/[id]/history';

describe('報名修改和取消 API 簡化測試', () => {
  let mockUser: any;
  let mockRegistration: any;
  let mockEvent: any;

  beforeEach(async () => {
    // 清理資料庫
    await db.clearAll();

    // 建立測試使用者
    mockUser = await db.createUser({
      lineUserId: 'test-user-123',
      displayName: '測試使用者',
      identity: 'monk',
      phone: '0912345678'
    });

    // 建立測試活動
    mockEvent = await db.createEvent({
      name: '測試活動',
      description: '測試用活動',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天後
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      location: '測試地點',
      maxParticipants: 100,
      currentParticipants: 0,
      registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'open',
      pretixEventSlug: 'test-event',
      transportOptions: []
    });

    // 建立測試報名
    mockRegistration = await db.createRegistration({
      userId: mockUser.lineUserId,
      eventId: mockEvent.id,
      identity: 'monk',
      personalInfo: {
        name: '測試法師',
        phone: '0912345678',
        email: 'test@example.com',
        templeName: '測試寺院',
        specialRequirements: '素食'
      },
      transport: {
        required: true,
        locationId: 'location-1',
        pickupTime: new Date()
      },
      pretixOrderId: 'TEST-ORDER-123',
      status: 'confirmed'
    });
  });

  describe('修改報名資料', () => {
    it('應該成功修改個人資料', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: mockRegistration.id },
        body: {
          personalInfo: {
            name: '修改後的法師',
            specialRequirements: '素食，不吃蔥蒜'
          },
          reason: '更新個人資料'
        }
      });

      // 模擬認證使用者
      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-123';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.personalInfo.name).toBe('修改後的法師');
      expect(responseData.data.personalInfo.specialRequirements).toBe('素食，不吃蔥蒜');
      expect(responseData.data.modificationInfo.totalModifications).toBe(1);
      expect(responseData.data.modificationInfo.remainingModifications).toBe(4);
    });

    it('應該成功修改交通車資訊', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: mockRegistration.id },
        body: {
          transport: {
            required: false
          },
          reason: '不需要交通車'
        }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-124';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.transport.required).toBe(false);
    });

    it('應該拒絕無效的修改資料', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: mockRegistration.id },
        body: {
          personalInfo: {
            name: '', // 空名稱
            phone: 'invalid-phone' // 無效電話
          }
        }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-125';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('姓名不能為空');
    });

    it('應該拒絕非擁有者的修改請求', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: mockRegistration.id },
        body: {
          personalInfo: {
            name: '惡意修改'
          }
        }
      });

      // 使用不同的使用者
      (req as any).user = {
        lineUserId: 'other-user-456',
        displayName: '其他使用者',
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-126';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(403);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('您沒有權限修改此報名記錄');
    });
  });

  describe('取消報名', () => {
    it('應該成功取消報名', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { registrationId: mockRegistration.id },
        body: {
          reason: '臨時有事無法參加'
        }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-129';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe('cancelled');
      expect(responseData.data.cancellationInfo.reason).toBe('臨時有事無法參加');
    });

    it('應該拒絕重複取消', async () => {
      // 先取消報名
      await db.updateRegistration(mockRegistration.id, { status: 'cancelled' });

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { registrationId: mockRegistration.id },
        body: {
          reason: '重複取消'
        }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-130';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('報名已經取消');
    });
  });

  describe('查詢報名歷史', () => {
    it('應該成功獲取報名歷史', async () => {
      // 先進行一些修改以建立歷史記錄
      await db.updateRegistration(
        mockRegistration.id, 
        { 
          personalInfo: { 
            ...mockRegistration.personalInfo, 
            name: '修改後的名稱' 
          } 
        },
        { reason: '測試修改' }
      );

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockRegistration.id }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-131';
      (req as any).startTime = Date.now();

      await historyHandler(req as any, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.history).toHaveLength(1);
      expect(responseData.data.history[0].action).toBe('updated');
      expect(responseData.data.statistics.modificationCount).toBe(1);
      expect(responseData.data.timeline).toBeDefined();
    });

    it('應該拒絕非擁有者的歷史查詢', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockRegistration.id }
      });

      // 使用不同的使用者
      (req as any).user = {
        lineUserId: 'other-user-456',
        displayName: '其他使用者',
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-132';
      (req as any).startTime = Date.now();

      await historyHandler(req as any, res);

      expect(res._getStatusCode()).toBe(403);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('您沒有權限查詢此報名記錄的歷史');
    });
  });

  describe('修改次數限制', () => {
    it('應該限制修改次數', async () => {
      // 進行5次修改
      for (let i = 0; i < 5; i++) {
        await db.updateRegistration(
          mockRegistration.id, 
          { 
            personalInfo: { 
              ...mockRegistration.personalInfo, 
              name: `修改${i + 1}次` 
            } 
          },
          { reason: `第${i + 1}次修改` }
        );
      }

      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: mockRegistration.id },
        body: {
          personalInfo: {
            name: '第6次修改（應該被拒絕）'
          }
        }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-128';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('已達到最大修改次數限制（5次）');
    });
  });

  describe('時間限制', () => {
    it('應該在活動開始前3天內拒絕修改', async () => {
      // 建立一個即將開始的活動（2天後）
      const nearEvent = await db.createEvent({
        name: '即將開始的活動',
        description: '測試時間限制',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天後
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        location: '測試地點',
        maxParticipants: 100,
        currentParticipants: 0,
        registrationDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        status: 'open',
        pretixEventSlug: 'near-event',
        transportOptions: []
      });

      const nearRegistration = await db.createRegistration({
        userId: mockUser.lineUserId,
        eventId: nearEvent.id,
        identity: 'monk',
        personalInfo: {
          name: '測試法師',
          phone: '0912345678',
          email: 'test@example.com',
          templeName: '測試寺院'
        },
        status: 'confirmed'
      });

      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: nearRegistration.id },
        body: {
          personalInfo: {
            name: '嘗試在時間限制內修改'
          }
        }
      });

      (req as any).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as any).requestId = 'test-request-134';
      (req as any).startTime = Date.now();

      await modificationHandler(req as any, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('活動開始前3天內無法修改報名資料');
    });
  });
});