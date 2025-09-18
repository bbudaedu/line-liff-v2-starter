/**
 * 快取管理系統
 * 提供記憶體快取和 localStorage 持久化快取
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxMemoryItems: number;
  enablePersistence: boolean;
}

class CacheManager {
  private memoryCache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxMemoryItems: 100,
      enablePersistence: true,
      ...config
    };
  }

  /**
   * 設定快取項目
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    // 記憶體快取
    this.memoryCache.set(key, cacheItem);

    // 清理過期的記憶體快取
    this.cleanupMemoryCache();

    // 持久化快取
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      } catch (error) {
        console.warn('Failed to persist cache item:', error);
      }
    }
  }

  /**
   * 取得快取項目
   */
  get<T>(key: string): T | null {
    // 先檢查記憶體快取
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && this.isValid(memoryItem)) {
      return memoryItem.data;
    }

    // 檢查持久化快取
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      try {
        const persistedItem = localStorage.getItem(`cache_${key}`);
        if (persistedItem) {
          const cacheItem: CacheItem<T> = JSON.parse(persistedItem);
          if (this.isValid(cacheItem)) {
            // 恢復到記憶體快取
            this.memoryCache.set(key, cacheItem);
            return cacheItem.data;
          } else {
            // 清理過期的持久化快取
            localStorage.removeItem(`cache_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve persisted cache item:', error);
      }
    }

    return null;
  }

  /**
   * 檢查快取項目是否有效
   */
  private isValid<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  /**
   * 清理記憶體快取
   */
  private cleanupMemoryCache(): void {
    // 移除過期項目
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((item, key) => {
      if (!this.isValid(item)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // 如果超過最大項目數，移除最舊的項目
    if (this.memoryCache.size > this.config.maxMemoryItems) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const itemsToRemove = entries.slice(0, this.memoryCache.size - this.config.maxMemoryItems);
      itemsToRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * 清除特定快取項目
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache_${key}`);
    }
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * 取得快取統計資訊
   */
  getStats() {
    return {
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.config.maxMemoryItems,
      defaultTTL: this.config.defaultTTL,
      enablePersistence: this.config.enablePersistence
    };
  }
}

// 建立全域快取實例
export const cache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxMemoryItems: 50,
  enablePersistence: true
});

// API 快取裝飾器
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getCacheKey: (...args: T) => string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = getCacheKey(...args);
    
    // 嘗試從快取取得資料
    const cachedData = cache.get<R>(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }

    // 執行原始函數並快取結果
    const result = await fn(...args);
    cache.set(cacheKey, result, ttl);
    
    return result;
  };
}

export default CacheManager;