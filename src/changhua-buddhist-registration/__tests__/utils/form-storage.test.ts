import {
  saveFormData,
  loadFormData,
  clearFormData,
  hasStoredFormData,
  getAllStoredFormKeys,
  clearExpiredFormData,
  getStorageStats,
  exportFormData,
  importFormData,
  checkStorageQuota,
  initializeStorage
} from '@/utils/form-storage';
import { PersonalInfoFormData } from '@/utils/form-validation';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Form Storage Utils', () => {
  const testFormData: PersonalInfoFormData = {
    name: '王小明',
    idNumber: 'A123456789',
    birthDate: '1990-01-01',
    phone: '0912345678',
    specialRequirements: '素食'
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('saveFormData', () => {
    it('should save form data to localStorage', async () => {
      await saveFormData('test-key', testFormData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'changhua-buddhist-registration-test-key',
        expect.stringContaining('"name":"王小明"')
      );
    });

    it('should include timestamp and version in saved data', async () => {
      await saveFormData('test-key', testFormData);
      
      const savedData = localStorageMock.setItem.mock.calls[0][1];
      const parsedData = JSON.parse(savedData);
      
      expect(parsedData).toHaveProperty('timestamp');
      expect(parsedData).toHaveProperty('version', '1.0.0');
      expect(parsedData).toHaveProperty('data');
    });

    it('should handle localStorage errors', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(saveFormData('test-key', testFormData)).rejects.toThrow('無法儲存表單資料');
    });
  });

  describe('loadFormData', () => {
    it('should load form data from localStorage', async () => {
      await saveFormData('test-key', testFormData);
      const loadedData = loadFormData('test-key');
      
      expect(loadedData).toEqual(testFormData);
    });

    it('should return null if no data exists', () => {
      const loadedData = loadFormData('non-existent-key');
      expect(loadedData).toBeNull();
    });

    it('should return null for expired data', async () => {
      // 手動設置過期資料
      const expiredData = {
        data: testFormData,
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8天前
        version: '1.0.0'
      };
      
      localStorageMock.setItem(
        'changhua-buddhist-registration-test-key',
        JSON.stringify(expiredData)
      );
      
      const loadedData = loadFormData('test-key');
      expect(loadedData).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'changhua-buddhist-registration-test-key'
      );
    });

    it('should handle JSON parse errors', () => {
      localStorageMock.setItem(
        'changhua-buddhist-registration-test-key',
        'invalid-json'
      );
      
      const loadedData = loadFormData('test-key');
      expect(loadedData).toBeNull();
    });
  });

  describe('clearFormData', () => {
    it('should clear form data from localStorage', async () => {
      await saveFormData('test-key', testFormData);
      clearFormData('test-key');
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'changhua-buddhist-registration-test-key'
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Remove failed');
      });

      expect(() => clearFormData('test-key')).not.toThrow();
    });
  });

  describe('hasStoredFormData', () => {
    it('should return true if data exists', async () => {
      await saveFormData('test-key', testFormData);
      expect(hasStoredFormData('test-key')).toBe(true);
    });

    it('should return false if data does not exist', () => {
      expect(hasStoredFormData('non-existent-key')).toBe(false);
    });

    it('should handle localStorage errors', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Access denied');
      });

      expect(hasStoredFormData('test-key')).toBe(false);
    });
  });

  describe('getAllStoredFormKeys', () => {
    it('should return all stored form keys', async () => {
      await saveFormData('key1', testFormData);
      await saveFormData('key2', testFormData);
      
      // 添加非表單相關的鍵值
      localStorageMock.setItem('other-key', 'other-value');
      
      const keys = getAllStoredFormKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('other-key');
    });

    it('should return empty array if no keys exist', () => {
      const keys = getAllStoredFormKeys();
      expect(keys).toEqual([]);
    });
  });

  describe('clearExpiredFormData', () => {
    it('should clear expired data', () => {
      // 設置過期資料
      const expiredData = {
        data: testFormData,
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8天前
        version: '1.0.0'
      };
      
      localStorageMock.setItem(
        'changhua-buddhist-registration-expired-key',
        JSON.stringify(expiredData)
      );
      
      // 設置未過期資料
      const validData = {
        data: testFormData,
        timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1天前
        version: '1.0.0'
      };
      
      localStorageMock.setItem(
        'changhua-buddhist-registration-valid-key',
        JSON.stringify(validData)
      );
      
      clearExpiredFormData();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'changhua-buddhist-registration-expired-key'
      );
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(
        'changhua-buddhist-registration-valid-key'
      );
    });

    it('should clear invalid JSON data', () => {
      localStorageMock.setItem(
        'changhua-buddhist-registration-invalid-key',
        'invalid-json'
      );
      
      clearExpiredFormData();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'changhua-buddhist-registration-invalid-key'
      );
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      await saveFormData('key1', testFormData);
      await saveFormData('key2', testFormData);
      
      const stats = getStorageStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(typeof stats.oldestEntry).toBe('number');
      expect(typeof stats.newestEntry).toBe('number');
    });

    it('should return zero stats for empty storage', () => {
      const stats = getStorageStats();
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('exportFormData', () => {
    it('should export all form data as JSON', async () => {
      await saveFormData('key1', testFormData);
      await saveFormData('key2', { ...testFormData, name: '李小華' });
      
      const exportedData = exportFormData();
      const parsedData = JSON.parse(exportedData);
      
      expect(parsedData).toHaveProperty('key1');
      expect(parsedData).toHaveProperty('key2');
      expect(parsedData.key1.data.name).toBe('王小明');
      expect(parsedData.key2.data.name).toBe('李小華');
    });

    it('should return empty object for no data', () => {
      const exportedData = exportFormData();
      const parsedData = JSON.parse(exportedData);
      
      expect(parsedData).toEqual({});
    });
  });

  describe('importFormData', () => {
    it('should import form data from JSON', () => {
      const importData = {
        'key1': {
          data: testFormData,
          timestamp: Date.now(),
          version: '1.0.0'
        }
      };
      
      importFormData(JSON.stringify(importData));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'changhua-buddhist-registration-key1',
        expect.stringContaining('"name":"王小明"')
      );
    });

    it('should handle invalid JSON', () => {
      expect(() => importFormData('invalid-json')).toThrow('無法匯入表單資料，請檢查資料格式');
    });
  });

  describe('checkStorageQuota', () => {
    it('should return storage quota information', () => {
      const quota = checkStorageQuota();
      
      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('available');
      expect(quota).toHaveProperty('percentage');
      expect(typeof quota.used).toBe('number');
      expect(typeof quota.available).toBe('number');
      expect(typeof quota.percentage).toBe('number');
    });
  });

  describe('initializeStorage', () => {
    it('should initialize storage system', () => {
      // Mock console methods
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      initializeStorage();
      
      expect(consoleSpy).toHaveBeenCalledWith('Form storage system initialized');
      
      consoleSpy.mockRestore();
    });
  });
});