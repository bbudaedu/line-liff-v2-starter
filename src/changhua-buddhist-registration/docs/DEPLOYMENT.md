# 部署指南

本文件說明彰化供佛齋僧活動報名系統的部署流程和配置。

## 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Netlify       │    │   Heroku/       │    │   External      │
│   (Frontend)    │◄──►│   Railway       │◄──►│   Services      │
│                 │    │   (Backend)     │    │                 │
│ - Next.js App   │    │ - API Server    │    │ - LINE API      │
│ - Static Assets │    │ - Database      │    │ - Pretix API    │
│ - CDN           │    │ - Redis Cache   │    │ - Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 前端部署 (Netlify)

### 1. 自動部署設定

#### 連接 Git Repository
1. 登入 Netlify Dashboard
2. 點擊 "New site from Git"
3. 選擇 GitHub repository
4. 設定建置配置：
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Base directory**: `src/changhua-buddhist-registration`

#### 環境變數設定
在 Netlify Dashboard > Site settings > Environment variables 中設定：

```bash
# 必要變數
NEXT_PUBLIC_LIFF_ID=your_production_liff_id
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.herokuapp.com
NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id
NEXT_PUBLIC_ENVIRONMENT=production

# 可選變數
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

#### 建置設定檔案
確保 `netlify.toml` 檔案在專案根目錄：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# API 代理設定
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-domain.herokuapp.com/api/:splat"
  status = 200
  force = true

# 客戶端路由處理
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. 自訂網域設定

1. 在 Netlify Dashboard > Domain settings 中新增自訂網域
2. 設定 DNS 記錄指向 Netlify
3. 啟用 HTTPS (自動 Let's Encrypt 憑證)

### 3. 效能優化

- 啟用 Asset Optimization
- 設定 Prerendering 規則
- 配置 CDN 快取策略

## 後端部署

### Heroku 部署

#### 1. 建立 Heroku 應用程式

```bash
# 安裝 Heroku CLI
npm install -g heroku

# 登入 Heroku
heroku login

# 建立應用程式
heroku create changhua-buddhist-api

# 設定 Node.js buildpack
heroku buildpacks:set heroku/nodejs
```

#### 2. 環境變數設定

```bash
# LINE 整合
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
heroku config:set LINE_CHANNEL_SECRET=your_channel_secret
heroku config:set LIFF_ID=your_liff_id
heroku config:set LINE_CHANNEL_ID=your_channel_id

# Pretix 整合
heroku config:set PRETIX_API_URL=https://your-pretix-instance.com/api/v1
heroku config:set PRETIX_API_TOKEN=your_pretix_api_token
heroku config:set PRETIX_ORGANIZER_SLUG=your_organizer_slug

# 安全性
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set ENCRYPTION_KEY=$(openssl rand -base64 32)

# 監控
heroku config:set SENTRY_DSN=your_sentry_dsn
heroku config:set LOG_LEVEL=info

# 應用程式設定
heroku config:set NODE_ENV=production
```

#### 3. 附加元件設定

```bash
# PostgreSQL 資料庫
heroku addons:create heroku-postgresql:mini

# Redis 快取
heroku addons:create heroku-redis:mini

# 日誌管理
heroku addons:create papertrail:choklad

# 監控
heroku addons:create newrelic:wayne
```

#### 4. 部署

```bash
# 部署到 Heroku
git push heroku main

# 執行資料庫遷移
heroku run npm run db:migrate

# 檢查應用程式狀態
heroku ps:scale web=1
heroku logs --tail
```

### Railway 部署

#### 1. 建立專案

1. 登入 Railway Dashboard
2. 點擊 "New Project"
3. 選擇 "Deploy from GitHub repo"
4. 選擇 repository 和分支

#### 2. 環境變數設定

在 Railway Dashboard > Variables 中設定所有必要的環境變數。

#### 3. 服務設定

```toml
# railway.toml
[build]
cmd = "npm install && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## 資料庫設定

### PostgreSQL 初始化

```sql
-- 建立資料庫結構
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  line_user_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  picture_url TEXT,
  identity VARCHAR(50),
  phone VARCHAR(20),
  emergency_contact VARCHAR(255),
  temple_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  pretix_event_slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  location VARCHAR(255),
  max_participants INTEGER,
  registration_deadline TIMESTAMP,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_id INTEGER REFERENCES events(id),
  pretix_order_id VARCHAR(255),
  personal_info JSONB,
  transport_info JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transport_options (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  pickup_time TIMESTAMP,
  max_seats INTEGER,
  booked_seats INTEGER DEFAULT 0,
  coordinates JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_transport_options_event_id ON transport_options(event_id);
```

### 資料庫遷移腳本

```javascript
// scripts/migrate.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  try {
    // 執行遷移 SQL
    const migrationSQL = `
      -- 在這裡放置遷移 SQL
    `;
    
    await pool.query(migrationSQL);
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
```

## 監控設定

### 健康檢查端點

系統提供以下監控端點：

- `GET /api/health` - 基本健康檢查
- `GET /api/monitoring/metrics` - 詳細系統指標
- `GET /api/monitoring/status` - 服務狀態頁面

### Sentry 錯誤追蹤

1. 建立 Sentry 專案
2. 取得 DSN
3. 設定環境變數 `SENTRY_DSN`

### 日誌管理

#### Heroku Papertrail
```bash
# 檢視即時日誌
heroku logs --tail

# 搜尋特定日誌
heroku logs --grep="ERROR"
```

#### 自訂日誌格式
```javascript
// lib/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;
```

## 安全性配置

### HTTPS 設定
- Netlify: 自動 Let's Encrypt 憑證
- Heroku: 自動 SSL 憑證

### CORS 設定
```javascript
// middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://changhua-buddhist.netlify.app', 'https://liff.line.me']
    : ['http://localhost:3000', 'http://localhost:9000'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
```

### 速率限制
```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP'
});

module.exports = limiter;
```

## 備份策略

### 資料庫備份

#### Heroku PostgreSQL
```bash
# 建立備份
heroku pg:backups:capture

# 下載備份
heroku pg:backups:download

# 排程自動備份
heroku pg:backups:schedule DATABASE_URL --at '02:00 Asia/Taipei'
```

#### 手動備份腳本
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
gzip $BACKUP_FILE

# 上傳到雲端儲存
aws s3 cp ${BACKUP_FILE}.gz s3://your-backup-bucket/
```

## 災難復原

### 復原程序

1. **資料庫復原**
   ```bash
   # 從備份復原
   heroku pg:backups:restore b001 DATABASE_URL
   ```

2. **應用程式復原**
   ```bash
   # 回滾到上一個版本
   heroku rollback v123
   ```

3. **DNS 切換**
   - 更新 DNS 記錄指向備用服務
   - 確認服務正常運作

### 監控告警

設定以下告警規則：
- API 回應時間 > 5 秒
- 錯誤率 > 5%
- 資料庫連線失敗
- 記憶體使用率 > 80%
- 磁碟空間 < 20%

## 效能優化

### 前端優化
- 程式碼分割 (Code Splitting)
- 圖片優化和 CDN
- 快取策略
- 預載入關鍵資源

### 後端優化
- 資料庫查詢優化
- Redis 快取
- API 回應快取
- 連線池管理

### 監控指標
- 頁面載入時間
- API 回應時間
- 資料庫查詢時間
- 記憶體和 CPU 使用率

## 維護作業

### 定期維護
- 每週檢查系統日誌
- 每月更新相依套件
- 每季進行安全性檢查
- 每半年進行災難復原演練

### 更新流程
1. 在開發環境測試
2. 部署到測試環境
3. 執行自動化測試
4. 部署到生產環境
5. 監控系統狀態

## 故障排除

### 常見問題

#### 1. LIFF 初始化失敗
- 檢查 LIFF ID 設定
- 確認網域白名單
- 檢查 HTTPS 憑證

#### 2. Pretix API 連線失敗
- 檢查 API Token 有效性
- 確認網路連線
- 檢查 API 速率限制

#### 3. 資料庫連線問題
- 檢查連線字串
- 確認資料庫服務狀態
- 檢查連線池設定

#### 4. 記憶體不足
- 檢查記憶體洩漏
- 優化查詢效能
- 增加伺服器資源

### 日誌分析
```bash
# 搜尋錯誤日誌
heroku logs --grep="ERROR" --tail

# 分析 API 回應時間
heroku logs --grep="duration" --tail

# 監控資料庫查詢
heroku logs --grep="query" --tail
```

## 聯絡資訊

如有部署相關問題，請聯絡：
- 技術負責人：[聯絡資訊]
- 系統管理員：[聯絡資訊]
- 緊急聯絡：[24小時聯絡方式]