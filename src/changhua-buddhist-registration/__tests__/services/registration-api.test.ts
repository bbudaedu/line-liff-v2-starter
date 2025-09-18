/**
 * 報名 API 服務邏輯測試
 * Registration API service logic tests
 */

import { db } from '../../lib/database';
import { initializePretixClient } from '../../services/pretix';
import { initializeRegistrationService, getRegistrationService } from '../../services/registration';
import { getRegistrationRetryService } from '../../services/registration-retry';
import { PretixConfig } from '../../services/pretix';
import { RegistrationData } from '../../types/pretix';

// Mock 配置
const mockPretixConfig: PretixConfig = {
  baseURL: 'https://test.pretix.eu/api/v1',
  apiToken: 'test-token',
  organizerSlug: 'test-organizer'
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

describe('Registration API Service Logic', () => {
  beforeAll(async () => {
    // 初始化服務
    const pretixClient = initializePretixClient(mockPretixConfig);
    initializeRegistrationService(pretixClient);
    
    await db.clearAll();
  });

  beforeEach(async () => {
    await db.clearAll();
  });

  describe('資料驗證邏輯', () => {
    it('應該驗證必填欄位', () => {
      // 測試姓名驗證
      expect(() => {
        validatePersonalInfo({ phone: '0912345678' }, 'volunteer');
      }).toThrow('姓名為必填項目');

      // 測試電話驗證
      expect(() => {
        validatePersonalInfo({ name: '測試' }, 'volunteer');
      }).toThrow('聯絡電話為必填項目');
    });

    it('應該驗證電話格式', () => {
      expect(() => {
        validatePersonalInfo({
          name: '測試',
          phone: 'invalid-phone'
        }, 'volunteer');
      }).toThrow('聯絡電話格式不正確');

      // 有效的電話格式應該通過
      expect(() => {
        validatePersonalInfo({
          name: '測試',
          phone: '0912345678',
          emergencyContact: '0987654321'
        }, 'volunteer');
      }).not.toThrow();
    });

    it('應該驗證法師特定欄位', () => {
      expect(() => {
        validatePersonalInfo({
          name: '釋測試',
          phone: '0912345678'
          // 缺少 templeName
        }, 'monk');
      }).toThrow('法師必須填寫寺院名稱');

      // 完整的法師資料應該通過
      expect(() => {
        validatePersonalInfo({
          name: '釋測試',
          phone: '0912345678',
          templeName: '測試寺院'
        }, 'monk');
      }).not.toThrow();
    });

    it('應該驗證志工特定欄位', () => {
      expect(() => {
        validatePersonalInfo({
          name: '測試志工',
          phone: '0912345678'
          // 缺少 emergencyContact
        }, 'volunteer');
      }).toThrow('志工必須填寫緊急聯絡人');

      // 完整的志工資料應該通過
      expect(() => {
        validatePersonalInfo({
          name: '測試志工',
          phone: '0912345678',
          emergencyContact: '0987654321'
        }, 'volunteer');
      }).not.toThrow();
    });

    it('應該驗證 Email 格式', () => {
      expect(() => {
        validatePersonalInfo({
          name: '測試',
          phone: '0912345678',
          email: 'invalid-email',
          emergencyContact: '0987654321'
        }, 'volunteer');
      }).toThrow('Email 格式不正確');

      // 有效的 Email 應該通過
      expect(() => {
        validatePersonalInfo({
          name: '測試',
          phone: '0912345678',
          email: 'test@example.com',
          emergencyContact: '0987654321'
        }, 'volunteer');
      }).not.toThrow();
    });

    it('應該驗證交通車資料', () => {
      expect(() => {
        validateTransport({
          required: 'yes' // 應該是布林值
        });
      }).toThrow('交通車需求必須為布林值');

      expect(() => {
        validateTransport({
          required: true
          // 缺少 locationId
        });
      }).toThrow('需要交通車時必須選擇上車地點');

      // 有效的交通車資料應該通過
      expect(() => {
        validateTransport({
          required: true,
          locationId: 'location-1'
        });
      }).not.toThrow();

      // 不需要交通車應該通過
      expect(() => {
        validateTransport({
          required: false
        });
      }).not.toThrow();
    });
  });

  describe('資料庫操作', () => {
    it('應該成功建立報名記錄', async () => {
      const registration = await db.createRegistration({
        userId: 'test-user-123',
        eventId: 'test-event',
        identity: 'volunteer',
        personalInfo: {
          name: '測試使用者',
          phone: '0912345678',
          emergencyContact: '0987654321'
        },
        transport: {
          required: true,
          locationId: 'location-1'
        },
        pretixOrderId: 'ORDER123',
        status: 'confirmed'
      });

      expect(registration.id).toBeDefined();
      expect(registration.userId).toBe('test-user-123');
      expect(registration.status).toBe('confirmed');
      expect(registration.createdAt).toBeInstanceOf(Date);
    });

    it('應該查詢使用者的報名記錄', async () => {
      // 建立測試資料
      await db.createRegistration({
        userId: 'test-user-123',
        eventId: 'event-1',
        identity: 'volunteer',
        personalInfo: { name: '測試1', phone: '0912345678', emergencyContact: '0987654321' },
        status: 'confirmed'
      });

      await db.createRegistration({
        userId: 'test-user-123',
        eventId: 'event-2',
        identity: 'monk',
        personalInfo: { name: '測試2', phone: '0912345678', templeName: '測試寺院' },
        status: 'pending'
      });

      // 建立其他使用者的記錄
      await db.createRegistration({
        userId: 'other-user',
        eventId: 'event-3',
        identity: 'volunteer',
        personalInfo: { name: '其他', phone: '0912345678', emergencyContact: '0987654321' },
        status: 'confirmed'
      });

      const userRegistrations = await db.getRegistrationsByUserId('test-user-123');
      expect(userRegistrations).toHaveLength(2);
      expect(userRegistrations.every(reg => reg.userId === 'test-user-123')).toBe(true);
    });

    it('應該更新報名記錄', async () => {
      const registration = await db.createRegistration({
        userId: 'test-user-123',
        eventId: 'test-event',
        identity: 'volunteer',
        personalInfo: { name: '測試', phone: '0912345678', emergencyContact: '0987654321' },
        status: 'pending'
      });

      const updated = await db.updateRegistration(registration.id, {
        status: 'confirmed',
        personalInfo: {
          ...registration.personalInfo,
          specialRequirements: '素食'
        }
      });

      expect(updated!.status).toBe('confirmed');
      expect(updated!.personalInfo.specialRequirements).toBe('素食');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(registration.createdAt.getTime());
    });
  });

  describe('重試服務', () => {
    it('應該建立重試記錄', async () => {
      const retryService = getRegistrationRetryService();
      
      const { retryId } = await retryService.createRetryableRegistration(
        'test-user-123',
        mockRegistrationData
      );

      expect(retryId).toBeDefined();
      
      const record = await retryService.getRetryRecord(retryId);
      expect(record).toBeDefined();
      expect(record!.userId).toBe('test-user-123');
      expect(record!.registrationData.eventSlug).toBe('test-event-2024');
    });

    it('應該查詢使用者的重試記錄', async () => {
      const retryService = getRegistrationRetryService();
      
      await retryService.createRetryableRegistration('test-user-123', mockRegistrationData);
      await retryService.createRetryableRegistration('test-user-123', {
        ...mockRegistrationData,
        eventSlug: 'event-2'
      });
      
      // 其他使用者的記錄
      await retryService.createRetryableRegistration('other-user', mockRegistrationData);

      const userRecords = await retryService.getUserRetryRecords('test-user-123');
      expect(userRecords).toHaveLength(2);
      expect(userRecords.every(record => record.userId === 'test-user-123')).toBe(true);
    });
  });

  describe('業務邏輯', () => {
    it('應該檢查重複報名', async () => {
      // 建立現有報名
      await db.createRegistration({
        userId: 'test-user-123',
        eventId: 'test-event',
        identity: 'volunteer',
        personalInfo: { name: '測試', phone: '0912345678', emergencyContact: '0987654321' },
        status: 'confirmed'
      });

      // 檢查重複報名
      const existingRegistrations = await db.getRegistrationsByUserId('test-user-123');
      const duplicateRegistration = existingRegistrations.find(reg => 
        reg.eventId === 'test-event' && reg.status !== 'cancelled'
      );

      expect(duplicateRegistration).toBeDefined();
    });

    it('應該允許取消後重新報名', async () => {
      // 建立已取消的報名
      await db.createRegistration({
        userId: 'test-user-123',
        eventId: 'test-event',
        identity: 'volunteer',
        personalInfo: { name: '測試', phone: '0912345678', emergencyContact: '0987654321' },
        status: 'cancelled'
      });

      // 檢查是否可以重新報名
      const existingRegistrations = await db.getRegistrationsByUserId('test-user-123');
      const activeRegistration = existingRegistrations.find(reg => 
        reg.eventId === 'test-event' && reg.status !== 'cancelled'
      );

      expect(activeRegistration).toBeUndefined(); // 沒有活躍的報名，可以重新報名
    });

    it('應該正確格式化報名資料', () => {
      const rawData = {
        name: '  測試使用者  ',
        phone: ' 0912 345 678 ',
        email: '  test@example.com  ',
        specialRequirements: '  素食，不含蔥蒜  '
      };

      const formatted = formatPersonalInfo(rawData);

      expect(formatted.name).toBe('測試使用者');
      expect(formatted.phone).toBe('0912345678');
      expect(formatted.email).toBe('test@example.com');
      expect(formatted.specialRequirements).toBe('素食，不含蔥蒜');
    });
  });
});

// 輔助函數
function validatePersonalInfo(personalInfo: any, identity: 'monk' | 'volunteer'): void {
  if (!personalInfo || typeof personalInfo !== 'object') {
    throw new Error('個人資料格式錯誤');
  }

  if (!personalInfo.name || typeof personalInfo.name !== 'string' || personalInfo.name.trim().length === 0) {
    throw new Error('姓名為必填項目');
  }

  if (!personalInfo.phone || typeof personalInfo.phone !== 'string') {
    throw new Error('聯絡電話為必填項目');
  }

  const phonePattern = /^09\d{8}$|^\d{2,3}-\d{6,8}$/;
  if (!phonePattern.test(personalInfo.phone.replace(/\s/g, ''))) {
    throw new Error('聯絡電話格式不正確');
  }

  if (identity === 'monk') {
    if (!personalInfo.templeName || typeof personalInfo.templeName !== 'string' || personalInfo.templeName.trim().length === 0) {
      throw new Error('法師必須填寫寺院名稱');
    }
  } else if (identity === 'volunteer') {
    if (!personalInfo.emergencyContact || typeof personalInfo.emergencyContact !== 'string' || personalInfo.emergencyContact.trim().length === 0) {
      throw new Error('志工必須填寫緊急聯絡人');
    }
  }

  if (personalInfo.email && typeof personalInfo.email === 'string') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(personalInfo.email)) {
      throw new Error('Email 格式不正確');
    }
  }
}

function validateTransport(transport: any): void {
  if (!transport || typeof transport !== 'object') {
    return;
  }

  if (typeof transport.required !== 'boolean') {
    throw new Error('交通車需求必須為布林值');
  }

  if (transport.required) {
    if (!transport.locationId || typeof transport.locationId !== 'string') {
      throw new Error('需要交通車時必須選擇上車地點');
    }
  }
}

function formatPersonalInfo(rawData: any): any {
  return {
    name: rawData.name?.trim(),
    phone: rawData.phone?.replace(/\s/g, ''),
    email: rawData.email?.trim(),
    specialRequirements: rawData.specialRequirements?.trim()
  };
}