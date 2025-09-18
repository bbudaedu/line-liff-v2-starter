/**
 * 報名流程整合測試
 * Registration flow integration tests
 */

import { createMocks } from 'node-mocks-http';
import { db, initializeTestData } from '../../lib/database';
import { initializePretixClient } from '../../services/pretix';
import { initializeRegistrationService } from '../../services/registration';
import { getRegistrationRetryService } from '../../services/registration-retry';
import registrationHandler from '../../pages/api/v1/registration/index';
import registrationDetailHandler from '../../pages/api/v1/registration/[id]';
import myRegistrationsHandler from '../../pages/api/v1/registration/my';
import { PretixConfig } from '../../services/pretix';

// Mock 配置
const mockPretixConfig: PretixConfig = {
  baseURL: 'https://test.pretix.eu/api/v1',
  apiToken: 'test-token',
  organizerSlug: 'test-organizer'
};

const mockLineUser = {
  lineUserId: 'integration-test-user',
  displayName: 'Integration Test User',
  pictureUrl: 'https://example.com/avatar.jpg'
};

describe('Registration Flow Integration Tests', () => {
  beforeAll(async () => {
    // 初始化服務
    const pretixClient = initializePretixClient(mockPretixConfig);
    initializeRegistrationService(pretixClient);
    
    // 初始化測試資料
    await db.clearAll();
    await initializeTestData();
  });

  beforeEach(async () => {
    // 清理使用者相關資料，但保留活動資料
    const registrations = await db.getRegistrationsByUserId(mockLineUser.lineUserId);
    for (const reg of registrations) {
      await db.updateRegistration(reg.id, { status: 'cancelled' });
    }
  });

  describe('完整報名流程', () => {
    it('應該完成志工報名的完整流程', async () => {
      // 1. 建立報名
      const registrationData = {
        eventSlug: 'changhua-buddhist-2024',
        identity: 'volunteer' as const,
        personalInfo: {
          name: '測試志工',
          phone: '0912345678',
          email: 'volunteer@test.com',
          emergencyContact: '0987654321',
          specialRequirements: '素食，需要輪椅通道'
        },
        transport: {
          required: true,
          locationId: 'transport_1',
          pickupTime: '2024-12-01T07:30:00Z'
        }
      };

      const { req: createReq, res: createRes } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: registrationData
      });

      (createReq as any).user = mockLineUser;
      (createReq as any).requestId = 'integration-test-1';

      await registrationHandler(createReq, createRes);

      expect(createRes._getStatusCode()).toBe(201);
      const createResponse = JSON.parse(createRes._getData());
      expect(createResponse.success).toBe(true);
      
      const registrationId = createResponse.data.registrationId;
      const orderCode = createResponse.data.orderCode;

      // 2. 查詢報名狀態
      const { req: queryReq, res: queryRes } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registrationId
        }
      });

      (queryReq as any).user = mockLineUser;
      (queryReq as any).requestId = 'integration-test-2';

      await registrationDetailHandler(queryReq, queryRes);

      expect(queryRes._getStatusCode()).toBe(200);
      const queryResponse = JSON.parse(queryRes._getData());
      expect(queryResponse.success).toBe(true);
      expect(queryResponse.data.registrationId).toBe(registrationId);
      expect(queryResponse.data.orderCode).toBe(orderCode);
      expect(queryResponse.data.identity).toBe('volunteer');
      expect(queryResponse.data.personalInfo.name).toBe('測試志工');
      expect(queryResponse.data.transport.required).toBe(true);

      // 3. 更新報名資料
      const updateData = {
        personalInfo: {
          specialRequirements: '素食，需要輪椅通道，晚到30分鐘'
        },
        transport: {
          required: false
        }
      };

      const { req: updateReq, res: updateRes } = createMocks({
        method: 'PUT',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        query: {
          id: registrationId
        },
        body: updateData
      });

      (updateReq as any).user = mockLineUser;
      (updateReq as any).requestId = 'integration-test-3';

      await registrationDetailHandler(updateReq, updateRes);

      expect(updateRes._getStatusCode()).toBe(200);
      const updateResponse = JSON.parse(updateRes._getData());
      expect(updateResponse.success).toBe(true);
      expect(updateResponse.data.personalInfo.specialRequirements).toBe('素食，需要輪椅通道，晚到30分鐘');
      expect(updateResponse.data.transport.required).toBe(false);

      // 4. 查詢使用者所有報名記錄
      const { req: listReq, res: listRes } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          limit: '10',
          offset: '0'
        }
      });

      (listReq as any).user = mockLineUser;
      (listReq as any).requestId = 'integration-test-4';

      await myRegistrationsHandler(listReq, listRes);

      expect(listRes._getStatusCode()).toBe(200);
      const listResponse = JSON.parse(listRes._getData());
      expect(listResponse.success).toBe(true);
      expect(listResponse.data.registrations).toHaveLength(1);
      expect(listResponse.data.registrations[0].registrationId).toBe(registrationId);

      // 5. 取消報名
      const { req: cancelReq, res: cancelRes } = createMocks({
        method: 'DELETE',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registrationId
        }
      });

      (cancelReq as any).user = mockLineUser;
      (cancelReq as any).requestId = 'integration-test-5';

      await registrationDetailHandler(cancelReq, cancelRes);

      expect(cancelRes._getStatusCode()).toBe(200);
      const cancelResponse = JSON.parse(cancelRes._getData());
      expect(cancelResponse.success).toBe(true);
      expect(cancelResponse.data.status).toBe('cancelled');

      // 6. 確認取消後的狀態
      const { req: finalQueryReq, res: finalQueryRes } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: registrationId
        }
      });

      (finalQueryReq as any).user = mockLineUser;
      (finalQueryReq as any).requestId = 'integration-test-6';

      await registrationDetailHandler(finalQueryReq, finalQueryRes);

      expect(finalQueryRes._getStatusCode()).toBe(200);
      const finalQueryResponse = JSON.parse(finalQueryRes._getData());
      expect(finalQueryResponse.success).toBe(true);
      expect(finalQueryResponse.data.status).toBe('cancelled');
    });

    it('應該完成法師報名的完整流程', async () => {
      const registrationData = {
        eventSlug: 'changhua-buddhist-2024',
        identity: 'monk' as const,
        personalInfo: {
          name: '釋測試',
          phone: '0912345678',
          email: 'monk@temple.org',
          templeName: '測試寺院',
          specialRequirements: '需要素食，不含蔥蒜'
        },
        transport: {
          required: false
        }
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: registrationData
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-monk-1';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const response = JSON.parse(res._getData());
      expect(response.success).toBe(true);
      expect(response.data.identity).toBe('monk');
      expect(response.data.personalInfo.templeName).toBe('測試寺院');
      expect(response.data.transport.required).toBe(false);
    });
  });

  describe('錯誤處理流程', () => {
    it('應該正確處理重複報名', async () => {
      const registrationData = {
        eventSlug: 'changhua-buddhist-2024',
        identity: 'volunteer' as const,
        personalInfo: {
          name: '測試使用者',
          phone: '0912345678',
          emergencyContact: '0987654321'
        }
      };

      // 第一次報名
      const { req: firstReq, res: firstRes } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: registrationData
      });

      (firstReq as any).user = mockLineUser;
      (firstReq as any).requestId = 'integration-test-duplicate-1';

      await registrationHandler(firstReq, firstRes);
      expect(firstRes._getStatusCode()).toBe(201);

      // 第二次報名（應該失敗）
      const { req: secondReq, res: secondRes } = createMocks({
        method: 'POST',
        headers: {
          'x-line-access-token': 'valid-token',
          'content-type': 'application/json'
        },
        body: registrationData
      });

      (secondReq as any).user = mockLineUser;
      (secondReq as any).requestId = 'integration-test-duplicate-2';

      await registrationHandler(secondReq, secondRes);
      expect(secondRes._getStatusCode()).toBe(409);
      
      const response = JSON.parse(secondRes._getData());
      expect(response.success).toBe(false);
      expect(response.code).toBe('ALREADY_REGISTERED');
    });

    it('應該正確處理無效的資料格式', async () => {
      const invalidData = {
        eventSlug: '', // 空的活動代碼
        identity: 'invalid' as any, // 無效的身份
        personalInfo: {
          name: '', // 空名稱
          phone: 'invalid-phone' // 無效電話
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
      (req as any).requestId = 'integration-test-invalid-1';

      await registrationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response.success).toBe(false);
      expect(response.code).toBe('VALIDATION_ERROR');
    });

    it('應該正確處理權限錯誤', async () => {
      // 建立其他使用者的報名記錄
      const otherUserRegistration = await db.createRegistration({
        userId: 'other-user-123',
        eventId: 'changhua-buddhist-2024',
        identity: 'volunteer',
        personalInfo: {
          name: '其他使用者',
          phone: '0912345678',
          emergencyContact: '0987654321'
        },
        status: 'confirmed'
      });

      // 嘗試查詢其他使用者的報名記錄
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          id: otherUserRegistration.id
        }
      });

      (req as any).user = mockLineUser;
      (req as any).requestId = 'integration-test-permission-1';

      await registrationDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      const response = JSON.parse(res._getData());
      expect(response.success).toBe(false);
      expect(response.code).toBe('FORBIDDEN');
    });
  });

  describe('重試機制流程', () => {
    it('應該正確處理重試流程', async () => {
      const retryService = getRegistrationRetryService();
      
      const registrationData = {
        eventSlug: 'changhua-buddhist-2024',
        identity: 'volunteer' as const,
        personalInfo: {
          name: '重試測試使用者',
          phone: '0912345678',
          email: 'retry@test.com',
          emergencyContact: '0987654321'
        },
        transport: {
          required: true,
          locationId: 'transport_1'
        },
        lineUserId: mockLineUser.lineUserId,
        metadata: {
          source: 'integration-test'
        }
      };

      // 建立重試記錄
      const { retryId } = await retryService.createRetryableRegistration(
        mockLineUser.lineUserId,
        registrationData
      );

      expect(retryId).toBeDefined();

      // 查詢重試記錄
      const retryRecord = await retryService.getRetryRecord(retryId);
      expect(retryRecord).toBeDefined();
      expect(retryRecord!.userId).toBe(mockLineUser.lineUserId);
      expect(retryRecord!.registrationData.eventSlug).toBe('changhua-buddhist-2024');

      // 查詢使用者的重試記錄
      const userRetryRecords = await retryService.getUserRetryRecords(mockLineUser.lineUserId);
      expect(userRetryRecords.length).toBeGreaterThan(0);
      expect(userRetryRecords.some(record => record.id === retryId)).toBe(true);
    });
  });

  describe('分頁和篩選功能', () => {
    beforeEach(async () => {
      // 建立多個測試報名記錄
      for (let i = 1; i <= 5; i++) {
        await db.createRegistration({
          userId: mockLineUser.lineUserId,
          eventId: `event-${i}`,
          identity: i % 2 === 0 ? 'monk' : 'volunteer',
          personalInfo: {
            name: `測試使用者 ${i}`,
            phone: '0912345678',
            emergencyContact: i % 2 === 1 ? '0987654321' : undefined,
            templeName: i % 2 === 0 ? `寺院 ${i}` : undefined
          },
          status: i <= 3 ? 'confirmed' : 'cancelled',
          pretixOrderId: `ORDER${i}`
        });
      }
    });

    it('應該支援分頁查詢', async () => {
      // 查詢第一頁
      const { req: page1Req, res: page1Res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          limit: '3',
          offset: '0'
        }
      });

      (page1Req as any).user = mockLineUser;
      (page1Req as any).requestId = 'integration-test-page-1';

      await myRegistrationsHandler(page1Req, page1Res);

      expect(page1Res._getStatusCode()).toBe(200);
      const page1Response = JSON.parse(page1Res._getData());
      expect(page1Response.success).toBe(true);
      expect(page1Response.data.registrations).toHaveLength(3);
      expect(page1Response.data.pagination.total).toBe(5);
      expect(page1Response.data.pagination.hasMore).toBe(true);

      // 查詢第二頁
      const { req: page2Req, res: page2Res } = createMocks({
        method: 'GET',
        headers: {
          'x-line-access-token': 'valid-token'
        },
        query: {
          limit: '3',
          offset: '3'
        }
      });

      (page2Req as any).user = mockLineUser;
      (page2Req as any).requestId = 'integration-test-page-2';

      await myRegistrationsHandler(page2Req, page2Res);

      expect(page2Res._getStatusCode()).toBe(200);
      const page2Response = JSON.parse(page2Res._getData());
      expect(page2Response.success).toBe(true);
      expect(page2Response.data.registrations).toHaveLength(2);
      expect(page2Response.data.pagination.hasMore).toBe(false);
    });

    it('應該支援狀態篩選', async () => {
      // 只查詢已確認的報名
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
      (req as any).requestId = 'integration-test-filter-1';

      await myRegistrationsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const response = JSON.parse(res._getData());
      expect(response.success).toBe(true);
      expect(response.data.registrations).toHaveLength(3);
      expect(response.data.registrations.every((reg: any) => reg.status === 'confirmed')).toBe(true);
    });
  });
});