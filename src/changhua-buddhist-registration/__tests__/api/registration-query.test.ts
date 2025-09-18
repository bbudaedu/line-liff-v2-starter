/**
 * 報名狀態查詢功能測試
 * Registration Status Query Functionality Tests
 */

import { createMocks } from 'node-mocks-http';
import myRegistrationsHandler from '../../pages/api/v1/registration/my';
import registrationHandler from '../../pages/api/v1/registration/[id]';
import remindersHandler from '../../pages/api/v1/events/[id]/reminders';
import { db } from '../../lib/database';
import { apiClient } from '../../services/api';

// Mock dependencies
jest.mock('../../lib/database');
jest.mock('../../services/api');
jest.mock('../../services/registration');
jest.mock('../../lib/middleware', () => ({
  withAuthMiddleware: (handler: any) => handler,
  ExtendedNextApiRequest: {},
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('Registration Query API Tests', () => {
  const mockUser = {
    lineUserId: 'test-user-123',
    displayName: 'Test User',
    identity: 'volunteer' as const
  };

  const mockRegistration = {
    id: 'reg-123',
    userId: 'test-user-123',
    eventId: 'event-123',
    identity: 'volunteer' as const,
    personalInfo: {
      name: '測試使用者',
      phone: '0912345678',
      emergencyContact: '0987654321',
      specialRequirements: '素食'
    },
    transport: {
      required: true,
      locationId: '彰化火車站',
      pickupTime: new Date('2024-12-25T07:30:00Z')
    },
    pretixOrderId: 'ORDER-123',
    status: 'confirmed' as const,
    createdAt: new Date('2024-12-01T10:00:00Z'),
    updatedAt: new Date('2024-12-01T10:00:00Z')
  };

  const mockEvent = {
    id: 'event-123',
    name: '供佛齋僧活動',
    dateFrom: '2024-12-25T09:00:00Z',
    location: '彰化某寺院',
    dateAdmission: '2024-12-25T08:30:00Z',
    description: '年度供佛齋僧活動'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/registration/my', () => {
    it('應該成功返回使用者的報名記錄', async () => {
      // Arrange
      mockDb.getRegistrationsByUserId.mockResolvedValue([mockRegistration]);
      mockApi.get.mockResolvedValue({ 
        success: true,
        data: mockEvent,
        timestamp: new Date().toISOString()
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrations).toHaveLength(1);
      expect(responseData.data.registrations[0].registrationId).toBe('reg-123');
      expect(responseData.data.registrations[0].eventName).toBe('供佛齋僧活動');
    });

    it('應該支援狀態篩選', async () => {
      // Arrange
      const confirmedRegistration = { ...mockRegistration, status: 'confirmed' as const };
      const cancelledRegistration = { ...mockRegistration, id: 'reg-456', status: 'cancelled' as const };
      
      mockDb.getRegistrationsByUserId.mockResolvedValue([confirmedRegistration, cancelledRegistration]);
      mockApi.get.mockResolvedValue({ 
        success: true,
        data: mockEvent,
        timestamp: new Date().toISOString()
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'confirmed' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.registrations).toHaveLength(1);
      expect(responseData.data.registrations[0].status).toBe('confirmed');
    });

    it('應該支援分頁功能', async () => {
      // Arrange
      const registrations = Array.from({ length: 15 }, (_, i) => ({
        ...mockRegistration,
        id: `reg-${i}`,
        createdAt: new Date(`2024-12-${String(i + 1).padStart(2, '0')}T10:00:00Z`)
      }));

      mockDb.getRegistrationsByUserId.mockResolvedValue(registrations);
      mockApi.get.mockResolvedValue({ 
        success: true,
        data: mockEvent,
        timestamp: new Date().toISOString()
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { limit: '5', offset: '0' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.registrations).toHaveLength(5);
      expect(responseData.data.pagination.total).toBe(15);
      expect(responseData.data.pagination.hasMore).toBe(true);
    });

    it('應該處理無報名記錄的情況', async () => {
      // Arrange
      mockDb.getRegistrationsByUserId.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.registrations).toHaveLength(0);
      expect(responseData.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/v1/registration/[id]', () => {
    it('應該成功返回特定報名記錄', async () => {
      // Arrange
      mockDb.getRegistrationById.mockResolvedValue(mockRegistration);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'reg-123' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.registrationId).toBe('reg-123');
      expect(responseData.data.personalInfo.name).toBe('測試使用者');
    });

    it('應該拒絕查詢他人的報名記錄', async () => {
      // Arrange
      const otherUserRegistration = {
        ...mockRegistration,
        userId: 'other-user-456'
      };
      mockDb.getRegistrationById.mockResolvedValue(otherUserRegistration);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'reg-123' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(403);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('沒有權限');
    });

    it('應該處理不存在的報名記錄', async () => {
      // Arrange
      mockDb.getRegistrationById.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('找不到');
    });
  });

  describe('PUT /api/v1/registration/[id]', () => {
    it('應該成功更新報名資料', async () => {
      // Arrange
      const updatedRegistration = {
        ...mockRegistration,
        personalInfo: {
          ...mockRegistration.personalInfo,
          phone: '0911111111'
        },
        updatedAt: new Date()
      };

      mockDb.getRegistrationById.mockResolvedValue(mockRegistration);
      mockDb.updateRegistration.mockResolvedValue(updatedRegistration);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'reg-123' },
        body: {
          personalInfo: {
            phone: '0911111111'
          }
        }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.personalInfo.phone).toBe('0911111111');
    });

    it('應該拒絕更新已取消的報名', async () => {
      // Arrange
      const cancelledRegistration = {
        ...mockRegistration,
        status: 'cancelled' as const
      };
      mockDb.getRegistrationById.mockResolvedValue(cancelledRegistration);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'reg-123' },
        body: {
          personalInfo: {
            phone: '0911111111'
          }
        }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('已取消的報名無法修改');
    });
  });

  describe('DELETE /api/v1/registration/[id]', () => {
    it('應該成功取消報名', async () => {
      // Arrange
      const cancelledRegistration = {
        ...mockRegistration,
        status: 'cancelled' as const,
        updatedAt: new Date()
      };

      mockDb.getRegistrationById.mockResolvedValue(mockRegistration);
      mockDb.updateRegistration.mockResolvedValue(cancelledRegistration);

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: 'reg-123' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe('cancelled');
    });

    it('應該拒絕取消已取消的報名', async () => {
      // Arrange
      const cancelledRegistration = {
        ...mockRegistration,
        status: 'cancelled' as const
      };
      mockDb.getRegistrationById.mockResolvedValue(cancelledRegistration);

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: 'reg-123' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await registrationHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('報名已經取消');
    });
  });

  describe('GET /api/v1/events/[id]/reminders', () => {
    it('應該成功返回活動提醒資訊', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ 
        success: true,
        data: mockEvent,
        timestamp: new Date().toISOString()
      });
      mockDb.getRegistrationsByUserId.mockResolvedValue([mockRegistration]);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'event-123' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await remindersHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.eventId).toBe('event-123');
      expect(responseData.data.reminders).toBeDefined();
      expect(responseData.data.importantInfo).toBeDefined();
    });

    it('應該拒絕未報名活動的提醒查詢', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ 
        success: true,
        data: mockEvent,
        timestamp: new Date().toISOString()
      });
      mockDb.getRegistrationsByUserId.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'event-123' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await remindersHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('尚未報名此活動');
    });

    it('應該處理不存在的活動', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ 
        success: true,
        data: null,
        timestamp: new Date().toISOString()
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await remindersHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toContain('找不到指定的活動');
    });
  });

  describe('Error Handling', () => {
    it('應該處理資料庫錯誤', async () => {
      // Arrange
      mockDb.getRegistrationsByUserId.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('QUERY_REGISTRATIONS_ERROR');
    });

    it('應該處理無效的分頁參數', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'GET',
        query: { limit: 'invalid', offset: '-1' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_LIMIT');
    });

    it('應該處理無效的狀態參數', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'invalid_status' }
      });

      req.user = mockUser;
      req.requestId = 'test-request-123';

      // Act
      await myRegistrationsHandler(req as any, res as any);

      // Assert
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_STATUS');
    });
  });
});