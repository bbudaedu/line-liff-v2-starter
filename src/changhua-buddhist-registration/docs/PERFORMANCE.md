# 效能優化系統文件

## 概述

彰化供佛齋僧活動報名系統實作了全面的效能優化機制，包含快取、預載入、程式碼分割、資料庫優化、CDN 配置和效能監控等功能。

## 核心功能

### 1. 快取系統 (Cache System)

#### 功能特色
- 記憶體快取和 localStorage 持久化快取
- 自動過期機制 (TTL)
- 快取統計和監控
- 裝飾器模式支援

#### 使用方式
```typescript
import { cache, withCache } from '../lib/cache';

// 直接使用快取
cache.set('user-data', userData, 5 * 60 * 1000); // 5 分鐘 TTL
const cachedData = cache.get('user-data');

// 使用快取裝飾器
const cachedApiCall = withCache(
  apiClient.getEvents,
  (params) => `events-${JSON.stringify(params)}`,
  10 * 60 * 1000 // 10 分鐘 TTL
);
```

#### 配置選項
- `defaultTTL`: 預設過期時間 (預設: 5 分鐘)
- `maxMemoryItems`: 最大記憶體快取項目數 (預設: 50)
- `enablePersistence`: 啟用持久化快取 (預設: true)

### 2. 資料預載入系統 (Data Preloader)

#### 功能特色
- 優先級管理 (high/medium/low)
- 智慧預載入策略
- 條件式預載入
- 使用者行為分析

#### 使用方式
```typescript
import { preloader, smartPreloader } from '../lib/preloader';

// 註冊預載入任務
preloader.register(
  'events_list',
  () => apiClient.get('/api/v1/events'),
  { priority: 'high' }
);

// 執行預載入
await preloader.preload(['events_list']);

// 記錄使用者行為
smartPreloader.recordBehavior('view_events');
```

#### 預載入策略
- **高優先級**: 立即執行 (關鍵資料)
- **中優先級**: 100ms 延遲執行
- **低優先級**: 500ms 延遲執行

### 3. 程式碼分割和懶載入 (Code Splitting)

#### 功能特色
- React 元件懶載入
- 智慧預載入策略
- 錯誤重試機制
- 載入統計追蹤

#### 使用方式
```typescript
import { LazyComponents, smartPreloadStrategy } from '../lib/code-splitting';

// 使用懶載入元件
const EventList = LazyComponents.EventList;

// 設定路由預載入
smartPreloadStrategy.setCurrentRoute('/events');
```

#### 預定義懶載入元件
- `IdentitySelection`: 身份選擇元件
- `EventList`: 活動列表元件
- `PersonalInfoForm`: 個人資料表單
- `TransportSelection`: 交通車選擇
- `RegistrationStatus`: 報名狀態查詢

### 4. 圖片優化系統 (Image Optimizer)

#### 功能特色
- 圖片壓縮和格式轉換
- 懶載入支援
- 響應式圖片 srcset 產生
- 關鍵圖片預載入

#### 使用方式
```typescript
import { imageOptimizer, useImageOptimization } from '../lib/image-optimizer';

// React Hook 使用
const { optimizeImage, enableLazyLoading } = useImageOptimization();

// 優化圖片
const optimized = await optimizeImage(file, {
  quality: 0.8,
  maxWidth: 1200,
  format: 'webp'
});

// 啟用懶載入
enableLazyLoading('img[data-src]');
```

#### 優化選項
- `quality`: 圖片品質 (0-1, 預設: 0.8)
- `maxWidth`: 最大寬度 (預設: 1200px)
- `maxHeight`: 最大高度 (預設: 800px)
- `format`: 輸出格式 ('webp' | 'jpeg' | 'png')

### 5. 資料庫查詢優化 (Database Optimizer)

#### 功能特色
- 查詢結果快取
- 效能統計追蹤
- 慢查詢識別
- 索引建議

#### 使用方式
```typescript
import { databaseOptimizer } from '../lib/database-optimizer';

// 執行優化查詢
const result = await databaseOptimizer.executeOptimizedQuery(
  'SELECT * FROM events WHERE status = ?',
  ['active'],
  { cache: true, ttl: 5 * 60 * 1000 }
);

// 取得查詢統計
const stats = databaseOptimizer.getQueryStats();
const slowQueries = databaseOptimizer.getSlowQueries(1000);
```

#### 建議索引
```sql
-- 使用者相關索引
CREATE UNIQUE INDEX idx_users_line_user_id ON users (line_user_id);
CREATE INDEX idx_users_identity_created ON users (identity, created_at);

-- 活動相關索引
CREATE INDEX idx_events_status_start_date ON events (status, start_date);
CREATE UNIQUE INDEX idx_events_pretix_slug ON events (pretix_event_slug);

-- 報名相關索引
CREATE UNIQUE INDEX idx_registrations_user_event ON registrations (user_id, event_id);
CREATE INDEX idx_registrations_event_status ON registrations (event_id, status);
```

### 6. CDN 優化 (CDN Optimizer)

#### 功能特色
- 響應式圖片 URL 產生
- 資源快取策略
- Service Worker 快取配置
- 效能指標收集

#### 使用方式
```typescript
import { cdnOptimizer } from '../lib/cdn-optimizer';

// 產生 CDN URL
const imageUrl = cdnOptimizer.getCDNUrl('/images/hero.jpg', {
  width: 800,
  quality: 85,
  format: 'webp'
});

// 產生響應式圖片 srcset
const srcSet = cdnOptimizer.generateResponsiveImageSrcSet(
  '/images/hero.jpg',
  [320, 640, 1024, 1920]
);
```

#### 快取策略
- **靜態資源**: 1 年快取，immutable
- **圖片**: 30 天快取
- **API 回應**: 5 分鐘快取
- **HTML**: 5 分鐘快取

### 7. 效能監控系統 (Performance Monitor)

#### 功能特色
- Core Web Vitals 監控
- 資源載入時間追蹤
- 長任務檢測
- 效能預算檢查

#### 監控指標
- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms

#### 使用方式
```typescript
import { performanceMonitor, usePerformanceMonitoring } from '../lib/performance-monitor';

// React Hook 使用
const { getReport, exportData, checkBudget } = usePerformanceMonitoring();

// 取得效能報告
const report = getReport();
console.log('效能問題:', report.issues);
console.log('優化建議:', report.recommendations);

// 檢查效能預算
const budgetCheck = await checkBudget();
if (!budgetCheck.passed) {
  console.warn('效能預算違規:', budgetCheck.violations);
}
```

## 整合使用

### 自動初始化
```typescript
import { performanceIntegration } from '../lib/performance-integration';

// 系統會自動初始化，也可手動初始化
await performanceIntegration.initialize();

// 優化特定頁面
await performanceIntegration.optimizePage('/events');

// 取得綜合報告
const report = performanceIntegration.getComprehensiveReport();
```

### React Hook 整合
```typescript
import { usePerformanceOptimization } from '../lib/performance-integration';

function MyComponent() {
  const { initialize, optimizePage, getReport } = usePerformanceOptimization();
  
  useEffect(() => {
    initialize();
  }, []);
  
  const handlePageChange = (path: string) => {
    optimizePage(path);
  };
  
  return <div>...</div>;
}
```

## Next.js 配置優化

### 圖片優化
```javascript
// next.config.js
images: {
  domains: ['your-cdn-domain.com'],
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
}
```

### 快取標頭
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/_next/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}
```

### Webpack 優化
```javascript
// next.config.js
webpack: (config, { dev, isServer }) => {
  if (!dev && !isServer) {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    };
  }
  return config;
}
```

## 效能最佳實踐

### 1. 載入優先級
1. **關鍵資源**: 立即載入 (CSS, 關鍵 JS)
2. **重要資源**: 預載入 (字體, 關鍵圖片)
3. **次要資源**: 懶載入 (非關鍵圖片, 分析腳本)

### 2. 快取策略
- **靜態資源**: 長期快取 + 版本控制
- **API 資料**: 短期快取 + 條件請求
- **使用者資料**: 記憶體快取 + 本地儲存

### 3. 程式碼分割
- **路由層級**: 按頁面分割
- **功能層級**: 按功能模組分割
- **第三方庫**: 獨立 vendor chunk

### 4. 圖片優化
- **格式選擇**: WebP > JPEG > PNG
- **響應式**: 多尺寸 + srcset
- **懶載入**: 視窗外圖片延遲載入

## 監控和分析

### 效能指標追蹤
```typescript
// 自動追蹤 Core Web Vitals
performanceMonitor.getPerformanceReport();

// 手動記錄自訂指標
performanceMonitor.recordMetric('custom_action_time', duration);
```

### 效能預算檢查
```typescript
const budgetCheck = await performanceBudget.checkBudget();
console.log('預算檢查結果:', budgetCheck);
```

### 資源使用分析
```typescript
const report = performanceIntegration.getComprehensiveReport();
console.log('快取使用率:', report.cache.stats);
console.log('預載入統計:', report.preloader.stats);
```

## 故障排除

### 常見問題

1. **快取未生效**
   - 檢查 TTL 設定
   - 確認 localStorage 可用性
   - 檢查快取鍵值唯一性

2. **預載入失敗**
   - 檢查網路連線
   - 確認 API 端點可用性
   - 檢查錯誤日誌

3. **圖片載入慢**
   - 檢查圖片格式和大小
   - 確認 CDN 配置
   - 檢查懶載入設定

4. **程式碼分割問題**
   - 檢查 webpack 配置
   - 確認動態導入語法
   - 檢查錯誤重試機制

### 除錯工具

```typescript
// 取得詳細統計
console.log('快取統計:', cache.getStats());
console.log('預載入統計:', preloader.getStats());
console.log('程式碼分割統計:', codeSplittingManager.getStats());

// 匯出效能資料
const exportData = performanceMonitor.exportMetrics();
console.log('效能資料:', exportData);
```

## 部署考量

### Netlify 配置
```toml
# netlify.toml
[build.processing]
  skip_processing = false
[build.processing.css]
  bundle = true
  minify = true
[build.processing.js]
  bundle = true
  minify = true
[build.processing.images]
  compress = true
```

### 環境變數
```bash
# 效能監控
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_PERFORMANCE_BUDGET_ENABLED=true

# CDN 配置
NEXT_PUBLIC_CDN_BASE_URL=https://your-cdn.com
```

## 結論

本效能優化系統提供了全面的效能提升解決方案，涵蓋從前端到後端的各個層面。透過合理的配置和使用，可以顯著提升應用程式的載入速度和使用者體驗。

建議定期檢查效能指標，並根據實際使用情況調整優化策略。