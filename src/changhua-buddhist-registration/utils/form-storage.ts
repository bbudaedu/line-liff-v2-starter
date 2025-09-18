import { PersonalInfoFormData } from './form-validation';

// 本地儲存鍵值前綴
const STORAGE_PREFIX = 'changhua-buddhist-registration';

// 表單資料儲存介面
export interface StoredFormData {
  data: PersonalInfoFormData;
  timestamp: number;
  version: string;
}

// 儲存表單資料
export async function saveFormData(key: string, data: PersonalInfoFormData): Promise<void> {
  try {
    const storageKey = `${STORAGE_PREFIX}-${key}`;
    const storedData: StoredFormData = {
      data,
      timestamp: Date.now(),
      version: '1.0.0'
    };
    
    localStorage.setItem(storageKey, JSON.stringify(storedData));
  } catch (error) {
    console.error('Failed to save form data:', error);
    throw new Error('無法儲存表單資料');
  }
}

// 載入表單資料
export function loadFormData(key: string): PersonalInfoFormData | null {
  try {
    const storageKey = `${STORAGE_PREFIX}-${key}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      return null;
    }
    
    const parsedData: StoredFormData = JSON.parse(stored);
    
    // 檢查資料是否過期（7天）
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天的毫秒數
    if (Date.now() - parsedData.timestamp > maxAge) {
      clearFormData(key);
      return null;
    }
    
    return parsedData.data;
  } catch (error) {
    console.error('Failed to load form data:', error);
    return null;
  }
}

// 清除表單資料
export function clearFormData(key: string): void {
  try {
    const storageKey = `${STORAGE_PREFIX}-${key}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear form data:', error);
  }
}

// 檢查是否有儲存的表單資料
export function hasStoredFormData(key: string): boolean {
  try {
    const storageKey = `${STORAGE_PREFIX}-${key}`;
    return localStorage.getItem(storageKey) !== null;
  } catch (error) {
    console.error('Failed to check stored form data:', error);
    return false;
  }
}

// 獲取所有儲存的表單鍵值
export function getAllStoredFormKeys(): string[] {
  try {
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key.replace(`${STORAGE_PREFIX}-`, ''));
      }
    }
    
    return keys;
  } catch (error) {
    console.error('Failed to get stored form keys:', error);
    return [];
  }
}

// 清除所有過期的表單資料
export function clearExpiredFormData(): void {
  try {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天的毫秒數
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsedData: StoredFormData = JSON.parse(stored);
            if (Date.now() - parsedData.timestamp > maxAge) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // 如果解析失敗，也標記為需要清除
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired form data entries`);
    }
  } catch (error) {
    console.error('Failed to clear expired form data:', error);
  }
}

// 獲取儲存資料的統計資訊
export function getStorageStats(): {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  try {
    let totalEntries = 0;
    let totalSize = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          totalEntries++;
          totalSize += stored.length;
          
          try {
            const parsedData: StoredFormData = JSON.parse(stored);
            const timestamp = parsedData.timestamp;
            
            if (oldestEntry === null || timestamp < oldestEntry) {
              oldestEntry = timestamp;
            }
            
            if (newestEntry === null || timestamp > newestEntry) {
              newestEntry = timestamp;
            }
          } catch (parseError) {
            // 忽略解析錯誤
          }
        }
      }
    }
    
    return {
      totalEntries,
      totalSize,
      oldestEntry,
      newestEntry
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {
      totalEntries: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }
}

// 匯出表單資料（用於備份）
export function exportFormData(): string {
  try {
    const exportData: { [key: string]: StoredFormData } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsedData: StoredFormData = JSON.parse(stored);
            const cleanKey = key.replace(`${STORAGE_PREFIX}-`, '');
            exportData[cleanKey] = parsedData;
          } catch (parseError) {
            console.warn(`Failed to parse stored data for key: ${key}`);
          }
        }
      }
    }
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export form data:', error);
    throw new Error('無法匯出表單資料');
  }
}

// 匯入表單資料（用於還原備份）
export function importFormData(jsonData: string): void {
  try {
    const importData: { [key: string]: StoredFormData } = JSON.parse(jsonData);
    
    Object.entries(importData).forEach(([key, data]) => {
      const storageKey = `${STORAGE_PREFIX}-${key}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    });
    
    console.log(`Imported ${Object.keys(importData).length} form data entries`);
  } catch (error) {
    console.error('Failed to import form data:', error);
    throw new Error('無法匯入表單資料，請檢查資料格式');
  }
}

// 檢查本地儲存空間使用情況
export function checkStorageQuota(): {
  used: number;
  available: number;
  percentage: number;
} {
  try {
    // 估算已使用的儲存空間
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }
    
    // 嘗試寫入測試資料來估算可用空間
    const testKey = 'storage-test';
    const testData = 'x'.repeat(1024); // 1KB 測試資料
    let available = 0;
    
    try {
      let testSize = 1024;
      while (testSize < 10 * 1024 * 1024) { // 最多測試到 10MB
        try {
          localStorage.setItem(testKey, 'x'.repeat(testSize));
          localStorage.removeItem(testKey);
          available = testSize;
          testSize *= 2;
        } catch {
          break;
        }
      }
    } catch (error) {
      // 如果測試失敗，使用預設值
      available = 5 * 1024 * 1024; // 5MB
    }
    
    const total = used + available;
    const percentage = total > 0 ? (used / total) * 100 : 0;
    
    return {
      used,
      available,
      percentage
    };
  } catch (error) {
    console.error('Failed to check storage quota:', error);
    return {
      used: 0,
      available: 0,
      percentage: 0
    };
  }
}

// 初始化儲存系統（清理過期資料）
export function initializeStorage(): void {
  try {
    // 清理過期的表單資料
    clearExpiredFormData();
    
    // 檢查儲存空間使用情況
    const quota = checkStorageQuota();
    if (quota.percentage > 80) {
      console.warn('Local storage usage is high:', quota);
    }
    
    console.log('Form storage system initialized');
  } catch (error) {
    console.error('Failed to initialize storage system:', error);
  }
}

// 在應用程式啟動時自動初始化
if (typeof window !== 'undefined') {
  // 延遲初始化，避免阻塞應用程式啟動
  setTimeout(initializeStorage, 1000);
}