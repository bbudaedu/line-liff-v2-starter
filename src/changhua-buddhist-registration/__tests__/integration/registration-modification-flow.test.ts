/**
 * 報名修改流程整合測試
 * Registration modification flow integration tests
 */

import { createMocks } from 'node-mocks-http';
import registrationHandler from '../../pages/api/v1/registration/index';
import modificationHandler from '../../pages/api/v1/registration/modify';
import queryHandler from '../../pages/api/v1/registration/[id]';
import historyHandler from '../../pages/api/v1/registration/[id]/history';
import { db } from '../../lib/database';
import { ExtendedNextApiRequest } from '../../lib/middleware';

// Mock dependencies
jest.mock('../../services/registration', () => ({
  getRegistrationService: () => ({
    createRegistration: jest.fn().mockResolvedValue({
      success: true,
      order: {
        code: 'TEST-ORDER-123',
        status: 'n',
        email: 'test@example.com',
        datetime: new Date().toISOString(),
        total: '0.00'
      }
    }),
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

describe('報名修改完整流程測試', () => {
  let mockUser: any;
  let mockEvent: any;
  let registrationId: string;

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
      name: '測試供佛齋僧活動',
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
  });

  describe('完整的報名和修改流程', () => {
    it('應該能夠完成報名、修改、查詢歷史的完整流程', async () => {
      // 步驟 1: 建立報名
      const { req: createReq, res: createRes } = createMocks({
        method: 'POST',
        body: {
          eventSlug: mockEvent.pretixEventSlug,
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
            locationId: 'location-1'
          }
        }
      });

      (createReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (createReq as ExtendedNextApiRequest).requestId = 'test-create-123';
      (createReq as ExtendedNextApiRequest).startTime = Date.now();

      await registrationHandler(createReq as ExtendedNextApiRequest, createRes);

      expect(createRes._getStatusCode()).toBe(201);
      const createData = JSON.parse(createRes._getData());
      expect(createData.success).toBe(true);
      registrationId = createData.data.registrationId;

      // 步驟 2: 修改個人資料
      const { req: modifyReq1, res: modifyRes1 } = createMocks({
        method: 'PUT',
        query: { registrationId },
        body: {
          personalInfo: {
            name: '修改後的法師',
            specialRequirements: '素食，不吃蔥蒜'
          },
          reason: '更新個人資料'
        }
      });

      (modifyReq1 as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (modifyReq1 as ExtendedNextApiRequest).requestId = 'test-modify-123';
      (modifyReq1 as ExtendedNextApiRequest).startTime = Date.now();

      await modificationHandler(modifyReq1 as ExtendedNextApiRequest, modifyRes1);

      expect(modifyRes1._getStatusCode()).toBe(200);
      const modifyData1 = JSON.parse(modifyRes1._getData());
      expect(modifyData1.success).toBe(true);
      expect(modifyData1.data.personalInfo.name).toBe('修改後的法師');
      expect(modifyData1.data.modificationInfo.totalModifications).toBe(1);

      // 步驟 3: 修改交通車資訊
      const { req: modifyReq2, res: modifyRes2 } = createMocks({
        method: 'PUT',
        query: { registrationId },
        body: {
          transport: {
            required: false
          },
          reason: '不需要交通車'
        }
      });

      (modifyReq2 as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (modifyReq2 as ExtendedNextApiRequest).requestId = 'test-modify-124';
      (modifyReq2 as ExtendedNextApiRequest).startTime = Date.now();

      await modificationHandler(modifyReq2 as ExtendedNextApiRequest, modifyRes2);

      expect(modifyRes2._getStatusCode()).toBe(200);
      const modifyData2 = JSON.parse(modifyRes2._getData());
      expect(modifyData2.success).toBe(true);
      expect(modifyData2.data.transport.required).toBe(false);
      expect(modifyData2.data.modificationInfo.totalModifications).toBe(2);

      // 步驟 4: 查詢報名狀態
      const { req: queryReq, res: queryRes } = createMocks({
        method: 'GET',
        query: { id: registrationId }
      });

      (queryReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (queryReq as ExtendedNextApiRequest).requestId = 'test-query-123';
      (queryReq as ExtendedNextApiRequest).startTime = Date.now();

      await queryHandler(queryReq as ExtendedNextApiRequest, queryRes);

      expect(queryRes._getStatusCode()).toBe(200);
      const queryData = JSON.parse(queryRes._getData());
      expect(queryData.success).toBe(true);
      expect(queryData.data.personalInfo.name).toBe('修改後的法師');
      expect(queryData.data.transport.required).toBe(false);

      // 步驟 5: 查詢修改歷史
      const { req: historyReq, res: historyRes } = createMocks({
        method: 'GET',
        query: { id: registrationId }
      });

      (historyReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (historyReq as ExtendedNextApiRequest).requestId = 'test-history-123';
      (historyReq as ExtendedNextApiRequest).startTime = Date.now();

      await historyHandler(historyReq as ExtendedNextApiRequest, historyRes);

      expect(historyRes._getStatusCode()).toBe(200);
      const historyData = JSON.parse(historyRes._getData());
      expect(historyData.success).toBe(true);
      expect(historyData.data.history).toHaveLength(2); // 兩次修改
      expect(historyData.data.statistics.modificationCount).toBe(2);
      expect(historyData.data.timeline).toHaveLength(3); // 建立 + 兩次修改

      // 驗證歷史記錄內容
      const personalInfoChange = historyData.data.history.find(h => 
        h.changes.some(c => c.field === 'personalInfo')
      );
      expect(personalInfoChange).toBeDefined();
      expect(personalInfoChange.reason).toBe('更新個人資料');

      const transportChange = historyData.data.history.find(h => 
        h.changes.some(c => c.field === 'transport')
      );
      expect(transportChange).toBeDefined();
      expect(transportChange.reason).toBe('不需要交通車');
    });

    it('應該能夠完成報名和取消的完整流程', async () => {
      // 步驟 1: 建立報名
      const { req: createReq, res: createRes } = createMocks({
        method: 'POST',
        body: {
          eventSlug: mockEvent.pretixEventSlug,
          identity: 'volunteer',
          personalInfo: {
            name: '測試志工',
            phone: '0987654321',
            email: 'volunteer@example.com',
            emergencyContact: '緊急聯絡人',
            specialRequirements: '無'
          },
          transport: {
            required: false
          }
        }
      });

      (createReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (createReq as ExtendedNextApiRequest).requestId = 'test-create-124';
      (createReq as ExtendedNextApiRequest).startTime = Date.now();

      await registrationHandler(createReq as ExtendedNextApiRequest, createRes);

      expect(createRes._getStatusCode()).toBe(201);
      const createData = JSON.parse(createRes._getData());
      registrationId = createData.data.registrationId;

      // 步驟 2: 取消報名
      const { req: cancelReq, res: cancelRes } = createMocks({
        method: 'DELETE',
        query: { registrationId },
        body: {
          reason: '臨時有事無法參加'
        }
      });

      (cancelReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (cancelReq as ExtendedNextApiRequest).requestId = 'test-cancel-123';
      (cancelReq as ExtendedNextApiRequest).startTime = Date.now();

      await modificationHandler(cancelReq as ExtendedNextApiRequest, cancelRes);

      expect(cancelRes._getStatusCode()).toBe(200);
      const cancelData = JSON.parse(cancelRes._getData());
      expect(cancelData.success).toBe(true);
      expect(cancelData.data.status).toBe('cancelled');
      expect(cancelData.data.cancellationInfo.reason).toBe('臨時有事無法參加');

      // 步驟 3: 查詢取消後的狀態
      const { req: queryReq, res: queryRes } = createMocks({
        method: 'GET',
        query: { id: registrationId }
      });

      (queryReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (queryReq as ExtendedNextApiRequest).requestId = 'test-query-124';
      (queryReq as ExtendedNextApiRequest).startTime = Date.now();

      await queryHandler(queryReq as ExtendedNextApiRequest, queryRes);

      expect(queryRes._getStatusCode()).toBe(200);
      const queryData = JSON.parse(queryRes._getData());
      expect(queryData.success).toBe(true);
      expect(queryData.data.status).toBe('cancelled');

      // 步驟 4: 查詢取消歷史
      const { req: historyReq, res: historyRes } = createMocks({
        method: 'GET',
        query: { id: registrationId }
      });

      (historyReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (historyReq as ExtendedNextApiRequest).requestId = 'test-history-124';
      (historyReq as ExtendedNextApiRequest).startTime = Date.now();

      await historyHandler(historyReq as ExtendedNextApiRequest, historyRes);

      expect(historyRes._getStatusCode()).toBe(200);
      const historyData = JSON.parse(historyRes._getData());
      expect(historyData.success).toBe(true);
      expect(historyData.data.history).toHaveLength(1); // 一次取消
      expect(historyData.data.statistics.isCancelled).toBe(true);
      expect(historyData.data.statistics.cancelledAt).toBeDefined();

      // 驗證取消記錄
      const cancellationRecord = historyData.data.history[0];
      expect(cancellationRecord.action).toBe('cancelled');
      expect(cancellationRecord.reason).toBe('臨時有事無法參加');
    });

    it('應該正確處理修改次數限制', async () => {
      // 步驟 1: 建立報名
      const { req: createReq, res: createRes } = createMocks({
        method: 'POST',
        body: {
          eventSlug: mockEvent.pretixEventSlug,
          identity: 'monk',
          personalInfo: {
            name: '測試法師',
            phone: '0912345678',
            email: 'test@example.com',
            templeName: '測試寺院'
          }
        }
      });

      (createReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (createReq as ExtendedNextApiRequest).requestId = 'test-create-125';
      (createReq as ExtendedNextApiRequest).startTime = Date.now();

      await registrationHandler(createReq as ExtendedNextApiRequest, createRes);
      const createData = JSON.parse(createRes._getData());
      registrationId = createData.data.registrationId;

      // 步驟 2: 進行5次修改
      for (let i = 1; i <= 5; i++) {
        const { req: modifyReq, res: modifyRes } = createMocks({
          method: 'PUT',
          query: { registrationId },
          body: {
            personalInfo: {
              name: `修改第${i}次`
            },
            reason: `第${i}次修改`
          }
        });

        (modifyReq as ExtendedNextApiRequest).user = {
          lineUserId: mockUser.lineUserId,
          displayName: mockUser.displayName,
          pictureUrl: undefined
        };
        (modifyReq as ExtendedNextApiRequest).requestId = `test-modify-${125 + i}`;
        (modifyReq as ExtendedNextApiRequest).startTime = Date.now();

        await modificationHandler(modifyReq as ExtendedNextApiRequest, modifyRes);

        expect(modifyRes._getStatusCode()).toBe(200);
        const modifyData = JSON.parse(modifyRes._getData());
        expect(modifyData.data.modificationInfo.totalModifications).toBe(i);
        expect(modifyData.data.modificationInfo.remainingModifications).toBe(5 - i);
      }

      // 步驟 3: 嘗試第6次修改（應該被拒絕）
      const { req: modifyReq6, res: modifyRes6 } = createMocks({
        method: 'PUT',
        query: { registrationId },
        body: {
          personalInfo: {
            name: '第6次修改（應該被拒絕）'
          }
        }
      });

      (modifyReq6 as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (modifyReq6 as ExtendedNextApiRequest).requestId = 'test-modify-131';
      (modifyReq6 as ExtendedNextApiRequest).startTime = Date.now();

      await modificationHandler(modifyReq6 as ExtendedNextApiRequest, modifyRes6);

      expect(modifyRes6._getStatusCode()).toBe(400);
      const modifyData6 = JSON.parse(modifyRes6._getData());
      expect(modifyData6.success).toBe(false);
      expect(modifyData6.error.message).toBe('已達到最大修改次數限制（5次）');

      // 步驟 4: 驗證歷史記錄
      const { req: historyReq, res: historyRes } = createMocks({
        method: 'GET',
        query: { id: registrationId }
      });

      (historyReq as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (historyReq as ExtendedNextApiRequest).requestId = 'test-history-125';
      (historyReq as ExtendedNextApiRequest).startTime = Date.now();

      await historyHandler(historyReq as ExtendedNextApiRequest, historyRes);

      const historyData = JSON.parse(historyRes._getData());
      expect(historyData.data.statistics.modificationCount).toBe(5);
      expect(historyData.data.modificationInfo.canModify).toBe(false);
      expect(historyData.data.modificationInfo.remainingModifications).toBe(0);
    });
  });

  describe('錯誤處理和邊界情況', () => {
    it('應該正確處理不存在的報名ID', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { registrationId: 'non-existent-id' },
        body: {
          personalInfo: {
            name: '測試修改'
          }
        }
      });

      (req as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as ExtendedNextApiRequest).requestId = 'test-error-123';
      (req as ExtendedNextApiRequest).startTime = Date.now();

      await modificationHandler(req as ExtendedNextApiRequest, res);

      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('找不到指定的報名記錄');
    });

    it('應該正確處理空的修改資料', async () => {
      // 先建立報名
      const registration = await db.createRegistration({
        userId: mockUser.lineUserId,
        eventId: mockEvent.id,
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
        query: { registrationId: registration.id },
        body: {} // 空的修改資料
      });

      (req as ExtendedNextApiRequest).user = {
        lineUserId: mockUser.lineUserId,
        displayName: mockUser.displayName,
        pictureUrl: undefined
      };
      (req as ExtendedNextApiRequest).requestId = 'test-error-124';
      (req as ExtendedNextApiRequest).startTime = Date.now();

      await modificationHandler(req as ExtendedNextApiRequest, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('沒有提供要修改的資料');
    });
  });
});