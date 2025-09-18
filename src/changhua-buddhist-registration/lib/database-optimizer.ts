/**
 * 資料庫查詢優化系統
 * 提供查詢快取、索引管理和效能監控
 */

interface QueryCacheItem {
  query: string;
  params: any[];
  result: any;
  timestamp: number;
  ttl: number;
}

interface QueryStats {
  query: string;
  executionCount: number;
  totalTime: number;
  averageTime: number;
  lastExecuted: number;
}

interface IndexDefinition {
  table: string;
  columns: string[];
  unique?: boolean;
  name?: string;
}

class DatabaseOptimizer {
  private queryCache = new Map<string, QueryCacheItem>();
  private queryStats = new Map<string, QueryStats>();
  private maxCacheSize = 100;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * 執行優化的查詢
   */
  async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    options: {
      cache?: boolean;
      ttl?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { cache = true, ttl = this.defaultTTL, timeout = 30000 } = options;
    const cacheKey = this.generateCacheKey(query, params);
    
    // 檢查快取
    if (cache) {
      const cachedResult = this.getCachedResult<T>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    // 執行查詢並記錄效能
    const startTime = performance.now();
    
    try {
      // 這裡應該替換為實際的資料庫執行邏輯
      const result = await this.executeQuery<T>(query, params, timeout);
      
      const executionTime = performance.now() - startTime;
      this.recordQueryStats(query, executionTime);
      
      // 快取結果
      if (cache) {
        this.setCachedResult(cacheKey, query, params, result, ttl);
      }
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordQueryStats(query, executionTime, true);
      throw error;
    }
  }

  /**
   * 實際執行資料庫查詢（需要根據實際資料庫實作）
   */
  private async executeQuery<T>(
    query: string,
    params: any[],
    timeout: number
  ): Promise<T> {
    // 這是一個模擬實作，實際應該連接到真實資料庫
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Query timeout'));
      }, timeout);

      // 模擬資料庫查詢
      setTimeout(() => {
        clearTimeout(timer);
        resolve({} as T);
      }, Math.random() * 100);
    });
  }

  /**
   * 產生快取鍵值
   */
  private generateCacheKey(query: string, params: any[]): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const paramsStr = JSON.stringify(params);
    return `${normalizedQuery}:${paramsStr}`;
  }

  /**
   * 取得快取結果
   */
  private getCachedResult<T>(cacheKey: string): T | null {
    const cached = this.queryCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  /**
   * 設定快取結果
   */
  private setCachedResult(
    cacheKey: string,
    query: string,
    params: any[],
    result: any,
    ttl: number
  ): void {
    // 清理過期的快取項目
    this.cleanupExpiredCache();

    // 如果快取已滿，移除最舊的項目
    if (this.queryCache.size >= this.maxCacheSize) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }

    this.queryCache.set(cacheKey, {
      query,
      params,
      result,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 清理過期的快取項目
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.queryCache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }

  /**
   * 找到最舊的快取鍵值
   */
  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.queryCache.forEach((item, key) => {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  /**
   * 記錄查詢統計
   */
  private recordQueryStats(query: string, executionTime: number, isError = false): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existing = this.queryStats.get(normalizedQuery);

    if (existing) {
      existing.executionCount++;
      existing.totalTime += executionTime;
      existing.averageTime = existing.totalTime / existing.executionCount;
      existing.lastExecuted = Date.now();
    } else {
      this.queryStats.set(normalizedQuery, {
        query: normalizedQuery,
        executionCount: 1,
        totalTime: executionTime,
        averageTime: executionTime,
        lastExecuted: Date.now()
      });
    }

    // 記錄慢查詢
    if (executionTime > 1000) {
      console.warn(`Slow query detected (${executionTime.toFixed(2)}ms):`, normalizedQuery);
    }
  }

  /**
   * 正規化查詢字串
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?') // 替換參數佔位符
      .trim()
      .toLowerCase();
  }

  /**
   * 取得查詢統計
   */
  getQueryStats(): QueryStats[] {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * 取得慢查詢
   */
  getSlowQueries(threshold = 1000): QueryStats[] {
    return this.getQueryStats().filter(stat => stat.averageTime > threshold);
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * 清除統計
   */
  clearStats(): void {
    this.queryStats.clear();
  }

  /**
   * 取得快取統計
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * 計算快取命中率
   */
  private calculateCacheHitRate(): number {
    // 這是一個簡化的實作，實際應該追蹤命中和未命中次數
    return 0.75; // 假設 75% 命中率
  }
}

// 索引管理器
export class IndexManager {
  private recommendedIndexes: IndexDefinition[] = [
    // 使用者相關索引
    {
      table: 'users',
      columns: ['line_user_id'],
      unique: true,
      name: 'idx_users_line_user_id'
    },
    {
      table: 'users',
      columns: ['identity', 'created_at'],
      name: 'idx_users_identity_created'
    },

    // 活動相關索引
    {
      table: 'events',
      columns: ['status', 'start_date'],
      name: 'idx_events_status_start_date'
    },
    {
      table: 'events',
      columns: ['pretix_event_slug'],
      unique: true,
      name: 'idx_events_pretix_slug'
    },

    // 報名相關索引
    {
      table: 'registrations',
      columns: ['user_id', 'event_id'],
      unique: true,
      name: 'idx_registrations_user_event'
    },
    {
      table: 'registrations',
      columns: ['event_id', 'status'],
      name: 'idx_registrations_event_status'
    },
    {
      table: 'registrations',
      columns: ['pretix_order_id'],
      unique: true,
      name: 'idx_registrations_pretix_order'
    },
    {
      table: 'registrations',
      columns: ['created_at'],
      name: 'idx_registrations_created_at'
    },

    // 交通車相關索引
    {
      table: 'transport_options',
      columns: ['event_id', 'pickup_time'],
      name: 'idx_transport_event_pickup_time'
    },
    {
      table: 'transport_registrations',
      columns: ['registration_id', 'transport_option_id'],
      unique: true,
      name: 'idx_transport_reg_transport'
    }
  ];

  /**
   * 產生建立索引的 SQL
   */
  generateCreateIndexSQL(): string[] {
    return this.recommendedIndexes.map(index => {
      const indexName = index.name || `idx_${index.table}_${index.columns.join('_')}`;
      const unique = index.unique ? 'UNIQUE ' : '';
      const columns = index.columns.join(', ');
      
      return `CREATE ${unique}INDEX ${indexName} ON ${index.table} (${columns});`;
    });
  }

  /**
   * 分析查詢並建議索引
   */
  analyzeQueryAndSuggestIndex(query: string): IndexDefinition[] {
    const suggestions: IndexDefinition[] = [];
    const lowerQuery = query.toLowerCase();

    // 分析 WHERE 子句
    const whereMatch = lowerQuery.match(/where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      
      // 尋找常見的查詢模式
      const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
      if (columnMatches) {
        const columns = columnMatches.map(match => match.replace(/\s*[=<>].*/, ''));
        
        // 從查詢中推斷表名
        const tableMatch = lowerQuery.match(/from\s+(\w+)/);
        if (tableMatch) {
          const table = tableMatch[1];
          
          suggestions.push({
            table,
            columns,
            name: `idx_${table}_${columns.join('_')}_suggested`
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * 取得建議的索引
   */
  getRecommendedIndexes(): IndexDefinition[] {
    return this.recommendedIndexes;
  }
}

// 查詢優化建議
export class QueryOptimizationAdvisor {
  /**
   * 分析查詢並提供優化建議
   */
  analyzeQuery(query: string): string[] {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // 檢查是否使用了 SELECT *
    if (lowerQuery.includes('select *')) {
      suggestions.push('避免使用 SELECT *，只選擇需要的欄位');
    }

    // 檢查是否有 LIMIT
    if (lowerQuery.includes('select') && !lowerQuery.includes('limit')) {
      suggestions.push('考慮加入 LIMIT 子句以限制結果數量');
    }

    // 檢查是否有適當的 WHERE 條件
    if (lowerQuery.includes('select') && !lowerQuery.includes('where')) {
      suggestions.push('考慮加入 WHERE 條件以減少掃描的資料量');
    }

    // 檢查是否使用了函數在 WHERE 條件中
    if (lowerQuery.match(/where\s+\w+\s*\(\s*\w+\s*\)/)) {
      suggestions.push('避免在 WHERE 條件中使用函數，這會阻止索引的使用');
    }

    // 檢查是否有 ORDER BY 但沒有對應的索引
    const orderByMatch = lowerQuery.match(/order\s+by\s+(\w+)/);
    if (orderByMatch) {
      suggestions.push(`考慮為 ORDER BY 欄位 "${orderByMatch[1]}" 建立索引`);
    }

    return suggestions;
  }

  /**
   * 產生優化的查詢
   */
  optimizeQuery(query: string): string {
    let optimizedQuery = query;

    // 替換 SELECT * 為具體欄位（這需要根據實際需求調整）
    if (optimizedQuery.toLowerCase().includes('select *')) {
      console.warn('請手動替換 SELECT * 為具體需要的欄位');
    }

    // 加入適當的 LIMIT（如果沒有的話）
    if (!optimizedQuery.toLowerCase().includes('limit')) {
      optimizedQuery += ' LIMIT 100';
    }

    return optimizedQuery;
  }
}

// 建立全域實例
export const databaseOptimizer = new DatabaseOptimizer();
export const indexManager = new IndexManager();
export const queryOptimizationAdvisor = new QueryOptimizationAdvisor();

export default DatabaseOptimizer;