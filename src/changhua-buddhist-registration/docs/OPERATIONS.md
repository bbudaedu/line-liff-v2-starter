# 維運手冊

本文件提供彰化供佛齋僧活動報名系統的日常維運指南。

## 系統概覽

### 服務架構
```
Frontend (Netlify) ──► Backend API (Heroku/Railway) ──► External APIs
                                    │
                                    ├── PostgreSQL Database
                                    ├── Redis Cache
                                    ├── LINE Messaging API
                                    └── Pretix Ticketing API
```

### 關鍵指標
- **可用性目標**: 99.5% (每月停機時間 < 3.6 小時)
- **回應時間目標**: API < 2 秒，頁面載入 < 3 秒
- **錯誤率目標**: < 1%
- **同時使用者**: 支援 500 人同時報名

## 日常監控

### 1. 系統健康檢查

#### 自動監控端點
```bash
# 基本健康檢查
curl https://your-api-domain.herokuapp.com/api/health

# 詳細系統指標
curl https://your-api-domain.herokuapp.com/api/monitoring/metrics

# 服務狀態頁面
curl https://your-api-domain.herokuapp.com/api/monitoring/status
```

#### 監控儀表板
- **Heroku Metrics**: 應用程式效能和資源使用
- **Netlify Analytics**: 前端效能和流量
- **Sentry**: 錯誤追蹤和效能監控
- **Papertrail**: 集中化日誌管理

### 2. 關鍵指標監控

#### 應用程式指標
```javascript
// 每日檢查項目
const dailyChecks = {
  // 效能指標
  apiResponseTime: '< 2000ms',
  pageLoadTime: '< 3000ms',
  databaseQueryTime: '< 500ms',
  
  // 可用性指標
  uptime: '> 99%',
  errorRate: '< 1%',
  successfulRegistrations: '> 95%',
  
  // 資源使用
  memoryUsage: '< 80%',
  cpuUsage: '< 70%',
  diskSpace: '> 20% free',
  
  // 外部服務
  lineApiStatus: 'operational',
  pretixApiStatus: 'operational'
};
```

#### 業務指標
```javascript
// 每週業務報告
const weeklyMetrics = {
  totalRegistrations: 0,
  successfulRegistrations: 0,
  failedRegistrations: 0,
  averageRegistrationTime: 0,
  peakConcurrentUsers: 0,
  mostUsedTransportOptions: [],
  userFeedback: []
};
```

### 3. 告警設定

#### 緊急告警 (立即處理)
- API 回應時間 > 5 秒
- 錯誤率 > 5%
- 系統停機
- 資料庫連線失敗
- 記憶體使用率 > 90%

#### 警告告警 (24小時內處理)
- API 回應時間 > 3 秒
- 錯誤率 > 2%
- 記憶體使用率 > 80%
- 磁碟空間 < 30%
- 外部 API 回應緩慢

#### 資訊告警 (定期檢查)
- 新使用者註冊
- 大量報名活動
- 系統更新完成
- 備份完成

## 故障處理程序

### 1. 緊急事件回應

#### 第一階段：評估和隔離 (0-15 分鐘)
1. **確認問題範圍**
   ```bash
   # 檢查系統狀態
   heroku ps
   heroku logs --tail
   
   # 檢查外部服務
   curl -I https://api.line.me/v2/bot/info
   curl -I https://your-pretix-instance.com/api/v1/
   ```

2. **隔離問題**
   - 如果是程式碼問題，考慮回滾
   - 如果是資源問題，擴展伺服器資源
   - 如果是外部服務問題，啟用降級模式

#### 第二階段：修復 (15-60 分鐘)
1. **應用程式問題**
   ```bash
   # 回滾到上一個穩定版本
   heroku rollback v123
   
   # 或重新啟動應用程式
   heroku restart
   ```

2. **資料庫問題**
   ```bash
   # 檢查資料庫狀態
   heroku pg:info
   
   # 重新啟動資料庫連線
   heroku restart
   
   # 如需要，從備份復原
   heroku pg:backups:restore b001 DATABASE_URL
   ```

3. **外部服務問題**
   - 啟用快取模式
   - 顯示維護頁面
   - 通知使用者服務暫時不可用

#### 第三階段：驗證和監控 (60-120 分鐘)
1. **功能驗證**
   - 執行健康檢查
   - 測試關鍵功能
   - 確認資料完整性

2. **持續監控**
   - 觀察系統指標
   - 檢查錯誤日誌
   - 監控使用者回饋

### 2. 常見問題解決方案

#### LIFF 初始化失敗
```javascript
// 問題診斷
const liffDiagnostics = {
  checkLiffId: () => console.log('LIFF ID:', process.env.NEXT_PUBLIC_LIFF_ID),
  checkDomain: () => console.log('Current domain:', window.location.hostname),
  checkHttps: () => console.log('HTTPS:', window.location.protocol === 'https:'),
  checkLineApp: () => console.log('In LINE app:', liff.isInClient())
};

// 解決方案
1. 確認 LIFF ID 正確
2. 檢查網域白名單設定
3. 確保使用 HTTPS
4. 檢查 LINE 應用程式版本
```

#### Pretix API 連線問題
```bash
# 診斷步驟
1. 檢查 API Token 有效性
curl -H "Authorization: Token YOUR_TOKEN" https://your-pretix-instance.com/api/v1/organizers/

2. 檢查網路連線
ping your-pretix-instance.com

3. 檢查 API 速率限制
# 查看回應標頭中的 X-RateLimit-* 欄位

# 解決方案
- 更新 API Token
- 實作重試機制
- 增加請求間隔
- 聯絡 Pretix 支援團隊
```

#### 資料庫效能問題
```sql
-- 診斷查詢
-- 檢查慢查詢
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 檢查資料庫大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 檢查索引使用情況
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';
```

#### 記憶體洩漏問題
```javascript
// 記憶體監控
const memoryMonitor = {
  logMemoryUsage: () => {
    const usage = process.memoryUsage();
    console.log('Memory Usage:', {
      rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(usage.external / 1024 / 1024) + ' MB'
    });
  },
  
  startMonitoring: () => {
    setInterval(() => {
      memoryMonitor.logMemoryUsage();
      
      // 如果記憶體使用超過閾值，觸發垃圾回收
      if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
        global.gc && global.gc();
      }
    }, 60000); // 每分鐘檢查一次
  }
};
```

## 維護作業

### 1. 定期維護任務

#### 每日任務
```bash
#!/bin/bash
# scripts/daily-maintenance.sh

echo "=== 每日維護檢查 $(date) ==="

# 檢查系統健康狀態
echo "1. 檢查系統健康狀態"
curl -s https://your-api-domain.herokuapp.com/api/health | jq .

# 檢查錯誤日誌
echo "2. 檢查錯誤日誌"
heroku logs --grep="ERROR" --num=100

# 檢查資料庫狀態
echo "3. 檢查資料庫狀態"
heroku pg:info

# 檢查備份狀態
echo "4. 檢查備份狀態"
heroku pg:backups

# 檢查應用程式指標
echo "5. 檢查應用程式指標"
heroku ps:scale
```

#### 每週任務
```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

echo "=== 每週維護檢查 $(date) ==="

# 更新相依套件
echo "1. 檢查套件更新"
npm outdated

# 檢查安全性漏洞
echo "2. 安全性掃描"
npm audit

# 清理舊日誌
echo "3. 清理舊日誌"
# 清理超過 7 天的日誌檔案

# 效能分析
echo "4. 效能分析"
# 分析過去一週的效能指標

# 備份驗證
echo "5. 備份驗證"
# 測試最新備份的完整性
```

#### 每月任務
```bash
#!/bin/bash
# scripts/monthly-maintenance.sh

echo "=== 每月維護檢查 $(date) ==="

# 更新系統套件
echo "1. 更新系統套件"
npm update

# 安全性更新
echo "2. 安全性更新"
npm audit fix

# 資料庫維護
echo "3. 資料庫維護"
heroku pg:psql -c "VACUUM ANALYZE;"

# 效能優化
echo "4. 效能優化"
# 分析和優化慢查詢

# 容量規劃
echo "5. 容量規劃"
# 分析資源使用趨勢
```

### 2. 資料管理

#### 資料備份策略
```bash
#!/bin/bash
# scripts/backup-strategy.sh

# 每日自動備份
heroku pg:backups:schedule DATABASE_URL --at '02:00 Asia/Taipei'

# 每週完整備份
if [ $(date +%u) -eq 7 ]; then
  echo "執行每週完整備份"
  heroku pg:backups:capture
  
  # 下載並上傳到外部儲存
  BACKUP_FILE="weekly_backup_$(date +%Y%m%d).dump"
  heroku pg:backups:download --output=$BACKUP_FILE
  
  # 上傳到 AWS S3 (需要設定 AWS CLI)
  aws s3 cp $BACKUP_FILE s3://your-backup-bucket/weekly/
  
  # 清理本地檔案
  rm $BACKUP_FILE
fi
```

#### 資料清理
```sql
-- scripts/data-cleanup.sql

-- 清理過期的暫存資料
DELETE FROM temp_registrations 
WHERE created_at < NOW() - INTERVAL '24 hours';

-- 清理舊的日誌記錄
DELETE FROM system_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理取消的報名記錄 (保留 90 天)
DELETE FROM registrations 
WHERE status = 'cancelled' 
AND updated_at < NOW() - INTERVAL '90 days';

-- 更新統計資料
ANALYZE;
```

### 3. 安全性維護

#### 安全性檢查清單
```bash
#!/bin/bash
# scripts/security-check.sh

echo "=== 安全性檢查 $(date) ==="

# 1. 檢查套件漏洞
echo "1. 檢查套件安全性漏洞"
npm audit --audit-level=moderate

# 2. 檢查環境變數
echo "2. 檢查敏感環境變數"
heroku config | grep -E "(TOKEN|SECRET|KEY)" | wc -l

# 3. 檢查 SSL 憑證
echo "3. 檢查 SSL 憑證有效期"
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# 4. 檢查存取日誌
echo "4. 檢查異常存取"
heroku logs --grep="401\|403\|429" --num=100

# 5. 檢查資料庫連線
echo "5. 檢查資料庫安全設定"
heroku pg:info | grep -E "(SSL|Version)"
```

#### 存取控制檢查
```javascript
// scripts/access-control-check.js

const accessControlChecks = {
  // 檢查 API 端點權限
  checkApiEndpoints: async () => {
    const endpoints = [
      '/api/registration',
      '/api/events',
      '/api/user/profile',
      '/api/admin/dashboard'
    ];
    
    for (const endpoint of endpoints) {
      // 測試未授權存取
      const response = await fetch(`https://your-api-domain.herokuapp.com${endpoint}`);
      console.log(`${endpoint}: ${response.status}`);
    }
  },
  
  // 檢查 CORS 設定
  checkCorsSettings: async () => {
    const response = await fetch('https://your-api-domain.herokuapp.com/api/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.com'
      }
    });
    
    console.log('CORS check:', response.headers.get('Access-Control-Allow-Origin'));
  },
  
  // 檢查速率限制
  checkRateLimit: async () => {
    const promises = Array(20).fill().map(() => 
      fetch('https://your-api-domain.herokuapp.com/api/health')
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429).length;
    console.log(`Rate limited requests: ${rateLimited}/20`);
  }
};
```

## 效能優化

### 1. 資料庫優化

#### 查詢優化
```sql
-- 建立必要索引
CREATE INDEX CONCURRENTLY idx_registrations_user_event 
ON registrations(user_id, event_id);

CREATE INDEX CONCURRENTLY idx_registrations_status_created 
ON registrations(status, created_at);

CREATE INDEX CONCURRENTLY idx_events_status_date 
ON events(status, start_date);

-- 分析查詢計畫
EXPLAIN ANALYZE 
SELECT r.*, u.display_name, e.name 
FROM registrations r
JOIN users u ON r.user_id = u.id
JOIN events e ON r.event_id = e.id
WHERE r.status = 'confirmed'
AND e.start_date > NOW();
```

#### 連線池優化
```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // 連線池設定
  max: 20,                    // 最大連線數
  idleTimeoutMillis: 30000,   // 閒置連線超時
  connectionTimeoutMillis: 2000, // 連線超時
  
  // 效能優化
  statement_timeout: 10000,   // 查詢超時
  query_timeout: 10000,       // 查詢超時
  application_name: 'changhua-buddhist-registration'
});

// 監控連線池狀態
setInterval(() => {
  console.log('Pool status:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
}, 60000);
```

### 2. 快取策略

#### Redis 快取實作
```javascript
// lib/cache.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

class CacheManager {
  static async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  static async set(key, value, ttl = 3600) {
    try {
      await client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  static async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  // 快取事件資料
  static async cacheEvents() {
    const events = await getEventsFromDatabase();
    await this.set('events:active', events, 1800); // 30 分鐘
    return events;
  }
  
  // 快取使用者資料
  static async cacheUser(userId, userData) {
    await this.set(`user:${userId}`, userData, 3600); // 1 小時
  }
}
```

### 3. 前端效能優化

#### 程式碼分割
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  },
  
  // 程式碼分割設定
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
};
```

#### 圖片優化
```javascript
// components/OptimizedImage.js
import Image from 'next/image';

const OptimizedImage = ({ src, alt, ...props }) => {
  return (
    <Image
      src={src}
      alt={alt}
      loading="lazy"
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      {...props}
    />
  );
};
```

## 災難復原

### 1. 復原計畫

#### RTO/RPO 目標
- **Recovery Time Objective (RTO)**: 4 小時
- **Recovery Point Objective (RPO)**: 1 小時

#### 復原程序
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

echo "=== 災難復原程序 $(date) ==="

# 1. 評估損害範圍
echo "1. 評估系統狀態"
heroku ps
heroku pg:info

# 2. 復原資料庫
echo "2. 復原資料庫"
LATEST_BACKUP=$(heroku pg:backups | head -n 1 | awk '{print $1}')
heroku pg:backups:restore $LATEST_BACKUP DATABASE_URL --confirm your-app-name

# 3. 復原應用程式
echo "3. 復原應用程式"
git checkout main
heroku releases:rollback v$(heroku releases | head -n 2 | tail -n 1 | awk '{print $1}' | sed 's/v//')

# 4. 驗證系統功能
echo "4. 驗證系統功能"
curl -f https://your-api-domain.herokuapp.com/api/health

# 5. 通知相關人員
echo "5. 發送復原通知"
# 發送通知給相關人員
```

### 2. 備用方案

#### 降級模式
```javascript
// lib/degraded-mode.js
class DegradedModeManager {
  static isEnabled = false;
  
  static enable(reason) {
    this.isEnabled = true;
    console.log(`Degraded mode enabled: ${reason}`);
    
    // 通知監控系統
    this.notifyMonitoring('degraded_mode_enabled', { reason });
  }
  
  static disable() {
    this.isEnabled = false;
    console.log('Degraded mode disabled');
    
    // 通知監控系統
    this.notifyMonitoring('degraded_mode_disabled');
  }
  
  static handleRequest(req, res, next) {
    if (this.isEnabled) {
      // 在降級模式下的處理邏輯
      if (req.path.includes('/registration')) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: '系統維護中，請稍後再試',
          retryAfter: 300
        });
      }
    }
    
    next();
  }
}
```

## 聯絡資訊和升級程序

### 緊急聯絡清單
```
第一級支援 (24/7)
- 系統管理員: [電話] / [Email]
- 技術負責人: [電話] / [Email]

第二級支援 (工作時間)
- 開發團隊: [Email]
- 產品負責人: [Email]

第三級支援 (供應商)
- Heroku 支援: https://help.heroku.com
- LINE 開發者支援: https://developers.line.biz/support/
- Pretix 支援: [聯絡資訊]
```

### 升級程序
1. **第一級 (0-30 分鐘)**: 系統管理員處理
2. **第二級 (30-120 分鐘)**: 技術負責人介入
3. **第三級 (2+ 小時)**: 供應商支援和管理層決策

### 事件記錄
每次事件都應記錄：
- 事件開始時間
- 問題描述和影響範圍
- 採取的行動
- 解決時間
- 根本原因分析
- 預防措施

這些記錄將用於改善系統可靠性和更新維運程序。