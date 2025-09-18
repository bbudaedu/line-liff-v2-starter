/**
 * 報名重試機制服務
 * Registration retry mechanism service
 */

import { logger } from '../lib/errors';
import { getRegistrationService } from './registration';
import { db } from '../lib/database';
import { RegistrationData, OrderCreationResult } from '../types/pretix';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // 基礎延遲時間（毫秒）
  maxDelay: number;  // 最大延遲時間（毫秒）
  backoffMultiplier: number; // 退避倍數
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error?: string;
  success: boolean;
}

export interface RegistrationRetryRecord {
  id: string;
  userId: string;
  registrationData: RegistrationData;
  attempts: RetryAttempt[];
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
  finalOrderId?: string;
}

// 預設重試配置
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 秒
  maxDelay: 30000,    // 30 秒
  backoffMultiplier: 2
};

// 記憶體儲存重試記錄（生產環境應使用持久化儲存）
class RetryStorage {
  private records: Map<string, RegistrationRetryRecord> = new Map();

  async createRetryRecord(userId: string, registrationData: RegistrationData): Promise<RegistrationRetryRecord> {
    const id = `retry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const record: RegistrationRetryRecord = {
      id,
      userId,
      registrationData,
      attempts: [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.records.set(id, record);
    return record;
  }

  async getRetryRecord(id: string): Promise<RegistrationRetryRecord | null> {
    return this.records.get(id) || null;
  }

  async updateRetryRecord(id: string, updates: Partial<RegistrationRetryRecord>): Promise<RegistrationRetryRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;

    const updatedRecord = {
      ...record,
      ...updates,
      updatedAt: new Date()
    };

    this.records.set(id, updatedRecord);
    return updatedRecord;
  }

  async getPendingRetries(): Promise<RegistrationRetryRecord[]> {
    return Array.from(this.records.values()).filter(record => record.status === 'pending');
  }

  async getUserRetryRecords(userId: string): Promise<RegistrationRetryRecord[]> {
    return Array.from(this.records.values()).filter(record => record.userId === userId);
  }
}

export class RegistrationRetryService {
  private storage = new RetryStorage();
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * 建立重試記錄並開始重試流程
   */
  async createRetryableRegistration(userId: string, registrationData: RegistrationData): Promise<{
    retryId: string;
    result?: OrderCreationResult;
  }> {
    const retryRecord = await this.storage.createRetryRecord(userId, registrationData);

    logger.info('建立重試記錄', {
      retryId: retryRecord.id,
      userId,
      eventSlug: registrationData.eventSlug
    });

    // 立即嘗試第一次
    const result = await this.attemptRegistration(retryRecord.id);
    
    if (result.success) {
      return { retryId: retryRecord.id, result };
    }

    // 如果第一次失敗，安排後續重試
    this.scheduleRetry(retryRecord.id, 1);
    
    return { retryId: retryRecord.id };
  }

  /**
   * 執行報名嘗試
   */
  async attemptRegistration(retryId: string): Promise<OrderCreationResult> {
    const record = await this.storage.getRetryRecord(retryId);
    if (!record) {
      throw new Error(`找不到重試記錄: ${retryId}`);
    }

    const attemptNumber = record.attempts.length + 1;
    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: new Date(),
      success: false
    };

    try {
      logger.info('開始報名嘗試', {
        retryId,
        attemptNumber,
        userId: record.userId,
        eventSlug: record.registrationData.eventSlug
      });

      const registrationService = getRegistrationService();
      const result = await registrationService.createRegistration(record.registrationData);

      if (result.success) {
        attempt.success = true;
        
        // 更新重試記錄
        await this.storage.updateRetryRecord(retryId, {
          status: 'success',
          attempts: [...record.attempts, attempt],
          finalOrderId: result.order!.code
        });

        // 儲存到資料庫
        await db.createRegistration({
          userId: record.userId,
          eventId: record.registrationData.eventSlug,
          identity: record.registrationData.identity,
          personalInfo: record.registrationData.personalInfo,
          transport: record.registrationData.transport,
          pretixOrderId: result.order!.code,
          status: 'confirmed'
        });

        logger.info('報名重試成功', {
          retryId,
          attemptNumber,
          userId: record.userId,
          orderCode: result.order!.code
        });

        return result;
      } else {
        attempt.error = result.error;
        
        // 檢查是否應該繼續重試
        const shouldRetry = this.shouldRetry(result.errorCode, attemptNumber);
        
        if (!shouldRetry || attemptNumber >= this.config.maxRetries) {
          await this.storage.updateRetryRecord(retryId, {
            status: 'failed',
            attempts: [...record.attempts, attempt]
          });

          logger.warn('報名重試失敗，不再重試', {
            retryId,
            attemptNumber,
            userId: record.userId,
            error: result.error,
            errorCode: result.errorCode
          });
        } else {
          await this.storage.updateRetryRecord(retryId, {
            attempts: [...record.attempts, attempt]
          });

          // 安排下次重試
          this.scheduleRetry(retryId, attemptNumber);
        }

        return result;
      }
    } catch (error) {
      attempt.error = (error as Error).message;
      
      await this.storage.updateRetryRecord(retryId, {
        status: attemptNumber >= this.config.maxRetries ? 'failed' : 'pending',
        attempts: [...record.attempts, attempt]
      });

      logger.error('報名嘗試發生錯誤', error as Error, {
        retryId,
        attemptNumber,
        userId: record.userId
      });

      if (attemptNumber < this.config.maxRetries) {
        this.scheduleRetry(retryId, attemptNumber);
      }

      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'RETRY_ATTEMPT_ERROR'
      };
    }
  }

  /**
   * 判斷是否應該重試
   */
  private shouldRetry(errorCode?: string, attemptNumber?: number): boolean {
    // 不重試的錯誤類型
    const nonRetryableErrors = [
      'ALREADY_REGISTERED',
      'EVENT_NOT_AVAILABLE',
      'ITEM_NOT_FOUND',
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN'
    ];

    if (errorCode && nonRetryableErrors.includes(errorCode)) {
      return false;
    }

    // 可重試的錯誤類型
    const retryableErrors = [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'TIMEOUT_ERROR',
      'ITEM_NOT_AVAILABLE', // 可能是暫時性的
      'EXTERNAL_SERVICE_ERROR'
    ];

    return !errorCode || retryableErrors.includes(errorCode);
  }

  /**
   * 安排重試
   */
  private scheduleRetry(retryId: string, attemptNumber: number): void {
    const delay = this.calculateDelay(attemptNumber);
    
    logger.info('安排報名重試', {
      retryId,
      attemptNumber: attemptNumber + 1,
      delayMs: delay
    });

    setTimeout(async () => {
      try {
        await this.attemptRegistration(retryId);
      } catch (error) {
        logger.error('重試執行失敗', error as Error, { retryId });
      }
    }, delay);
  }

  /**
   * 計算重試延遲時間（指數退避）
   */
  private calculateDelay(attemptNumber: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * 獲取重試記錄
   */
  async getRetryRecord(retryId: string): Promise<RegistrationRetryRecord | null> {
    return this.storage.getRetryRecord(retryId);
  }

  /**
   * 獲取使用者的重試記錄
   */
  async getUserRetryRecords(userId: string): Promise<RegistrationRetryRecord[]> {
    return this.storage.getUserRetryRecords(userId);
  }

  /**
   * 放棄重試
   */
  async abandonRetry(retryId: string): Promise<boolean> {
    const record = await this.storage.getRetryRecord(retryId);
    if (!record) return false;

    await this.storage.updateRetryRecord(retryId, {
      status: 'abandoned'
    });

    logger.info('重試已放棄', { retryId, userId: record.userId });
    return true;
  }

  /**
   * 清理過期的重試記錄
   */
  async cleanupExpiredRetries(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const allRecords = await this.storage.getPendingRetries();
    
    let cleanedCount = 0;
    for (const record of allRecords) {
      if (record.createdAt < cutoffTime) {
        await this.storage.updateRetryRecord(record.id, {
          status: 'abandoned'
        });
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('清理過期重試記錄', { cleanedCount, maxAgeHours });
    }

    return cleanedCount;
  }
}

// 預設的重試服務實例
let retryService: RegistrationRetryService | null = null;

export function getRegistrationRetryService(): RegistrationRetryService {
  if (!retryService) {
    retryService = new RegistrationRetryService();
  }
  return retryService;
}

export function initializeRegistrationRetryService(config?: Partial<RetryConfig>): RegistrationRetryService {
  retryService = new RegistrationRetryService(config);
  return retryService;
}

export default RegistrationRetryService;