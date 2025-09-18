/**
 * 報名重試服務測試
 * Registration retry service tests
 */

import { RegistrationRetryService, RetryConfig } from '../../services/registration-retry';
import { initializePretixClient } from '../../services/pretix';
import { initializeRegistrationService } from '../../services/registration';
import { db } from '../../lib/database';
import { RegistrationData } from '../../types/pretix';
import { PretixConfig } from '../../services/pretix';

// Mock 配置
const mockPretixConfig: PretixConfig = {
  baseURL: 'https://test.pretix.eu/api/v1',
  apiToken: 'test-token',
  organizerSlug: 'test-organizer'
};

const mockRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 100, // 縮短測試時間
  maxDelay: 1000,
  backoffMultiplier: 2
};

const mockRegistrationData: RegistrationData = {
  eventSlug: 'test-event-2024',
  identity: 'volunteer',
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
  lineUserId: 'test-user-123',
  metadata: {
    source: 'test'
  }
};

describe('RegistrationRetryService', () => {
  let retryService: RegistrationRetryService;

  beforeAll(async () => {
    // 初始化服務
    const pretixClient = initializePretixClient(mockPretixConfig);
    initializeRegistrationService(pretixClient);
    
    await db.clearAll();
  });

  beforeEach(async () => {
    retryService = new RegistrationRetryService(mockRetryConfig);
    await db.clearAll();
  });

  describe('createRetryableRegistration', () => {
    it('應該建立重試記錄', async () => {
      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      expect(retryId).toBeDefined();
      expect(typeof retryId).toBe('string');

      const record = await retryService.getRetryRecord(retryId);
      expect(record).toBeDefined();
      expect(record!.userId).toBe('test-user-123');
      expect(record!.registrationData.eventSlug).toBe('test-event-2024');
      expect(record!.status).toBe('pending');
      expect(record!.attempts).toHaveLength(1); // 第一次嘗試
    });

    it('應該記錄嘗試歷史', async () => {
      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.attempts).toHaveLength(1);
      
      const firstAttempt = record!.attempts[0];
      expect(firstAttempt.attemptNumber).toBe(1);
      expect(firstAttempt.timestamp).toBeInstanceOf(Date);
      expect(typeof firstAttempt.success).toBe('boolean');
    });
  });

  describe('attemptRegistration', () => {
    it('應該處理成功的報名嘗試', async () => {
      // Mock 成功的報名服務
      const originalCreateRegistration = require('../../services/registration').getRegistrationService().createRegistration;
      
      jest.spyOn(require('../../services/registration').getRegistrationService(), 'createRegistration')
        .mockResolvedValueOnce({
          success: true,
          order: {
            code: 'SUCCESS123',
            status: 'n',
            email: 'test@example.com',
            datetime: '2024-01-01T12:00:00Z',
            total: '0.00',
            positions: []
          }
        });

      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const result = await retryService.attemptRegistration(retryId);

      expect(result.success).toBe(true);
      expect(result.order?.code).toBe('SUCCESS123');

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.status).toBe('success');
      expect(record!.finalOrderId).toBe('SUCCESS123');
    });

    it('應該處理失敗的報名嘗試', async () => {
      jest.spyOn(require('../../services/registration').getRegistrationService(), 'createRegistration')
        .mockResolvedValueOnce({
          success: false,
          error: '活動已額滿',
          errorCode: 'ITEM_NOT_AVAILABLE'
        });

      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const result = await retryService.attemptRegistration(retryId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('活動已額滿');
      expect(result.errorCode).toBe('ITEM_NOT_AVAILABLE');

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.status).toBe('pending'); // 應該繼續重試
      expect(record!.attempts).toHaveLength(2); // 包含初始嘗試
    });

    it('應該在達到最大重試次數後停止', async () => {
      jest.spyOn(require('../../services/registration').getRegistrationService(), 'createRegistration')
        .mockResolvedValue({
          success: false,
          error: '網路錯誤',
          errorCode: 'NETWORK_ERROR'
        });

      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      // 執行多次重試直到達到上限
      for (let i = 1; i < mockRetryConfig.maxRetries; i++) {
        await retryService.attemptRegistration(retryId);
      }

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.status).toBe('failed');
      expect(record!.attempts).toHaveLength(mockRetryConfig.maxRetries);
    });

    it('應該正確處理不可重試的錯誤', async () => {
      jest.spyOn(require('../../services/registration').getRegistrationService(), 'createRegistration')
        .mockResolvedValueOnce({
          success: false,
          error: '已經報名過此活動',
          errorCode: 'ALREADY_REGISTERED'
        });

      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const result = await retryService.attemptRegistration(retryId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ALREADY_REGISTERED');

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.status).toBe('failed'); // 不應該重試
      expect(record!.attempts).toHaveLength(2); // 只有初始嘗試和一次重試
    });
  });

  describe('getUserRetryRecords', () => {
    it('應該返回使用者的重試記錄', async () => {
      const userId = 'test-user-123';

      // 建立多個重試記錄
      const { retryId: retryId1 } = await retryService.createRetryableRegistration(
        userId,
        { ...mockRegistrationData, eventSlug: 'event-1' }
      );

      const { retryId: retryId2 } = await retryService.createRetryableRegistration(
        userId,
        { ...mockRegistrationData, eventSlug: 'event-2' }
      );

      // 建立其他使用者的記錄
      await retryService.createRetryableRegistration(
        'other-user-456',
        { ...mockRegistrationData, eventSlug: 'event-3' }
      );

      const userRecords = await retryService.getUserRetryRecords(userId);

      expect(userRecords).toHaveLength(2);
      expect(userRecords.map(r => r.id)).toContain(retryId1);
      expect(userRecords.map(r => r.id)).toContain(retryId2);
      expect(userRecords.every(r => r.userId === userId)).toBe(true);
    });

    it('應該返回空陣列當使用者沒有重試記錄', async () => {
      const userRecords = await retryService.getUserRetryRecords('non-existent-user');
      expect(userRecords).toHaveLength(0);
    });
  });

  describe('abandonRetry', () => {
    it('應該成功放棄重試', async () => {
      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const result = await retryService.abandonRetry(retryId);
      expect(result).toBe(true);

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.status).toBe('abandoned');
    });

    it('應該處理不存在的重試記錄', async () => {
      const result = await retryService.abandonRetry('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredRetries', () => {
    it('應該清理過期的重試記錄', async () => {
      // 建立一個重試記錄
      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      // 模擬過期（修改建立時間）
      const record = await retryService.getRetryRecord(retryId);
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25小時前
      
      // 由於我們使用記憶體儲存，這裡需要直接修改記錄
      // 在實際實作中，這會是資料庫操作
      (record as any).createdAt = expiredTime;

      const cleanedCount = await retryService.cleanupExpiredRetries(24);
      expect(cleanedCount).toBe(1);

      const updatedRecord = await retryService.getRetryRecord(retryId);
      expect(updatedRecord!.status).toBe('abandoned');
    });

    it('應該保留未過期的重試記錄', async () => {
      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const cleanedCount = await retryService.cleanupExpiredRetries(24);
      expect(cleanedCount).toBe(0);

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.status).toBe('pending'); // 狀態不變
    });
  });

  describe('延遲計算', () => {
    it('應該正確計算指數退避延遲', async () => {
      const service = new RegistrationRetryService({
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      });

      // 測試延遲計算（通過檢查私有方法的行為）
      // 由於 calculateDelay 是私有方法，我們通過觀察重試行為來測試

      jest.spyOn(require('../../services/registration').getRegistrationService(), 'createRegistration')
        .mockResolvedValue({
          success: false,
          error: '網路錯誤',
          errorCode: 'NETWORK_ERROR'
        });

      const startTime = Date.now();
      const { retryId } = await service.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      // 等待一段時間讓重試執行
      await new Promise(resolve => setTimeout(resolve, 100));

      const record = await service.getRetryRecord(retryId);
      expect(record!.attempts.length).toBeGreaterThan(1);
    });
  });

  describe('錯誤處理', () => {
    it('應該處理服務異常', async () => {
      jest.spyOn(require('../../services/registration').getRegistrationService(), 'createRegistration')
        .mockRejectedValueOnce(new Error('服務異常'));

      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      const result = await retryService.attemptRegistration(retryId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('服務異常');
      expect(result.errorCode).toBe('RETRY_ATTEMPT_ERROR');

      const record = await retryService.getRetryRecord(retryId);
      expect(record!.attempts).toHaveLength(2);
      expect(record!.attempts[1].error).toBe('服務異常');
    });

    it('應該處理不存在的重試記錄', async () => {
      await expect(retryService.attemptRegistration('non-existent-id'))
        .rejects.toThrow('找不到重試記錄');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});