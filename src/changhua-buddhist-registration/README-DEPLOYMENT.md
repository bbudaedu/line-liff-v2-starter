# 部署和監控系統

本文件說明彰化供佛齋僧活動報名系統的部署和監控功能。

## 🚀 快速開始

### 前置需求

1. **Node.js** (版本 18 或以上)
2. **Heroku CLI** (後端部署)
3. **Git** (版本控制)
4. **AWS CLI** (可選，用於 S3 備份)

### 安裝工具

```bash
# 安裝 Heroku CLI
npm install -g heroku

# 安裝 AWS CLI (可選)
# 請參考: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# 驗證安裝
heroku --version
aws --version
```

## 📦 部署配置

### 1. 前端部署 (Netlify)

#### 自動部署設定

1. **連接 GitHub Repository**
   - 登入 [Netlify](https://netlify.com)
   - 點擊 "New site from Git"
   - 選擇此 repository

2. **建置設定**
   ```
   Build command: npm run build
   Publish directory: .next
   Base directory: src/changhua-buddhist-registration
   ```

3. **環境變數設定**
   ```bash
   NEXT_PUBLIC_LIFF_ID=your_production_liff_id
   NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.herokuapp.com
   NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id
   NEXT_PUBLIC_ENVIRONMENT=production
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   ```

#### 手動部署

```bash
# 建置前端
npm run build

# 部署到 Netlify (如果使用 Netlify CLI)
netlify deploy --prod --dir=.next
```

### 2. 後端部署 (Heroku)

#### 使用部署腳本

```bash
# 部署到生產環境
./scripts/deploy.sh production

# 部署到測試環境
./scripts/deploy.sh staging

# 跳過測試直接部署
./scripts/deploy.sh production true
```

#### 手動部署

```bash
# 建立 Heroku 應用程式
heroku create changhua-buddhist-api

# 設定環境變數
heroku config:set NODE_ENV=production
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set PRETIX_API_URL=your_pretix_url
heroku config:set PRETIX_API_TOKEN=your_pretix_token
# ... 其他環境變數

# 新增資料庫
heroku addons:create heroku-postgresql:mini

# 部署
git push heroku main

# 執行資料庫遷移
heroku run npm run db:migrate
```

### 3. Railway 部署 (替代方案)

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入 Railway
railway login

# 初始化專案
railway init

# 部署
railway up
```

## 🔧 環境變數管理

### 必要環境變數

```bash
# LINE 整合
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LIFF_ID=your_liff_id
LINE_CHANNEL_ID=your_channel_id

# Pretix 整合
PRETIX_API_URL=https://your-pretix-instance.com/api/v1
PRETIX_API_TOKEN=your_pretix_api_token
PRETIX_ORGANIZER_SLUG=your_organizer_slug

# 資料庫
DATABASE_URL=postgresql://user:password@host:port/database

# 安全性
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# 監控 (可選)
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### 環境變數驗證

系統會在啟動時自動驗證必要的環境變數：

```typescript
// 在 config/environment.ts 中自動驗證
const env = EnvironmentValidator.validate();
```

## 📊 監控系統

### 1. 健康檢查端點

```bash
# 基本健康檢查
curl https://your-api-domain.herokuapp.com/api/health

# 詳細系統指標
curl https://your-api-domain.herokuapp.com/api/monitoring/metrics

# 服務狀態頁面
curl https://your-api-domain.herokuapp.com/api/monitoring/status
```

### 2. 監控儀表板

訪問 `/admin/monitoring` 查看即時監控儀表板，包含：

- 系統健康狀態
- 服務狀態 (資料庫、Pretix、LINE API)
- 系統資源使用率
- 應用程式指標
- 錯誤追蹤

### 3. 自動化健康檢查

```bash
# 執行健康檢查腳本
./scripts/health-check.sh

# 自訂 URL 檢查
./scripts/health-check.sh -b https://your-backend.com -f https://your-frontend.com
```

### 4. 錯誤追蹤

系統整合了 Sentry 進行錯誤追蹤：

```typescript
import { captureError, captureMessage } from '../lib/monitoring';

// 捕獲錯誤
try {
  // 業務邏輯
} catch (error) {
  captureError(error, {
    userId: 'user123',
    action: 'registration',
    metadata: { eventId: 'event456' }
  });
}

// 記錄訊息
captureMessage('User completed registration', 'info', {
  userId: 'user123'
});
```

## 💾 備份系統

### 1. 自動備份

```bash
# 完整備份 (資料庫 + 配置 + 程式碼)
./scripts/backup.sh full

# 僅備份資料庫
./scripts/backup.sh database

# 僅備份配置
./scripts/backup.sh config
```

### 2. 排程備份

```bash
# 設定每日自動備份
heroku pg:backups:schedule DATABASE_URL --at '02:00 Asia/Taipei'

# 檢查備份狀態
heroku pg:backups
```

### 3. 備份到 S3

```bash
# 設定 S3 備份
export S3_BUCKET=your-backup-bucket
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# 執行備份並上傳到 S3
./scripts/backup.sh full
```

### 4. 備份復原

```bash
# 從最新備份復原
heroku pg:backups:restore b001 DATABASE_URL

# 從特定備份復原
heroku pg:backups:restore b123 DATABASE_URL --confirm your-app-name
```

## 🔍 日誌管理

### 1. 檢視日誌

```bash
# 即時日誌
heroku logs --tail --app your-app-name

# 搜尋錯誤
heroku logs --grep="ERROR" --app your-app-name

# 特定時間範圍
heroku logs --since="2024-01-01" --until="2024-01-02"
```

### 2. 日誌等級

系統支援多種日誌等級：

```typescript
// 設定日誌等級
LOG_LEVEL=debug  // debug, info, warn, error
```

### 3. 結構化日誌

```typescript
import { logger } from '../lib/logger';

logger.info('User registration completed', {
  userId: 'user123',
  eventId: 'event456',
  duration: 1234
});
```

## 🚨 告警設定

### 1. Heroku 告警

在 Heroku Dashboard 中設定告警：

- 應用程式停機
- 記憶體使用率 > 80%
- 回應時間 > 5 秒
- 錯誤率 > 5%

### 2. 自訂告警

```typescript
// 在 lib/monitoring.ts 中設定告警
if (errorRate > 0.05) {
  captureMessage('High error rate detected', 'error', {
    errorRate,
    threshold: 0.05
  });
}
```

### 3. 通知設定

```bash
# Slack 通知 (可選)
export SLACK_WEBHOOK_URL=your_slack_webhook_url

# Email 通知 (透過 Sentry)
export SENTRY_DSN=your_sentry_dsn
```

## 🔧 維護作業

### 1. 定期維護

```bash
# 每日維護檢查
./scripts/daily-maintenance.sh

# 每週維護檢查
./scripts/weekly-maintenance.sh

# 每月維護檢查
./scripts/monthly-maintenance.sh
```

### 2. 資料庫維護

```bash
# 資料庫分析和優化
heroku pg:psql -c "VACUUM ANALYZE;" --app your-app-name

# 檢查資料庫大小
heroku pg:info --app your-app-name

# 檢查慢查詢
heroku pg:outliers --app your-app-name
```

### 3. 安全性檢查

```bash
# 檢查套件漏洞
npm audit

# 修復安全性問題
npm audit fix

# 檢查環境變數
heroku config --app your-app-name
```

## 🔄 災難復原

### 1. 復原計畫

- **RTO (Recovery Time Objective)**: 4 小時
- **RPO (Recovery Point Objective)**: 1 小時

### 2. 復原程序

```bash
# 執行災難復原腳本
./scripts/disaster-recovery.sh

# 手動復原步驟
# 1. 復原資料庫
heroku pg:backups:restore b001 DATABASE_URL

# 2. 回滾應用程式
heroku rollback v123

# 3. 驗證系統功能
./scripts/health-check.sh
```

### 3. 降級模式

系統支援降級模式，在外部服務不可用時：

```typescript
// 啟用降級模式
DegradedModeManager.enable('Pretix API unavailable');

// 在降級模式下，某些功能會被暫時停用
```

## 📈 效能優化

### 1. 前端優化

- 程式碼分割 (Code Splitting)
- 圖片優化和 CDN
- 快取策略
- 預載入關鍵資源

### 2. 後端優化

- 資料庫查詢優化
- Redis 快取
- API 回應快取
- 連線池管理

### 3. 監控指標

定期檢查以下指標：

- 頁面載入時間 < 3 秒
- API 回應時間 < 2 秒
- 資料庫查詢時間 < 500ms
- 記憶體使用率 < 80%
- CPU 使用率 < 70%

## 🆘 故障排除

### 常見問題

#### 1. LIFF 初始化失敗

```bash
# 檢查 LIFF ID
echo $NEXT_PUBLIC_LIFF_ID

# 檢查網域設定
# 確認網域已加入 LIFF 白名單

# 檢查 HTTPS
# 確保使用 HTTPS 協定
```

#### 2. Pretix API 連線失敗

```bash
# 測試 API 連線
curl -H "Authorization: Token $PRETIX_API_TOKEN" \
     $PRETIX_API_URL/organizers/$PRETIX_ORGANIZER_SLUG/

# 檢查 API Token 有效性
# 登入 Pretix 管理介面檢查 Token
```

#### 3. 資料庫連線問題

```bash
# 檢查資料庫狀態
heroku pg:info --app your-app-name

# 重新啟動應用程式
heroku restart --app your-app-name

# 檢查連線池設定
heroku config:get DATABASE_URL --app your-app-name
```

#### 4. 記憶體不足

```bash
# 檢查記憶體使用
heroku ps --app your-app-name

# 升級 dyno 類型
heroku ps:scale web=1:standard-1x --app your-app-name

# 檢查記憶體洩漏
heroku logs --grep="memory" --app your-app-name
```

## 📞 支援聯絡

### 緊急聯絡

- **第一級支援**: 系統管理員 (24/7)
- **第二級支援**: 開發團隊 (工作時間)
- **第三級支援**: 供應商支援

### 外部支援

- **Heroku 支援**: https://help.heroku.com
- **LINE 開發者支援**: https://developers.line.biz/support/
- **Netlify 支援**: https://docs.netlify.com

### 文件資源

- [部署指南](./docs/DEPLOYMENT.md)
- [維運手冊](./docs/OPERATIONS.md)
- [API 文件](./docs/API.md)
- [安全性指南](./docs/SECURITY.md)

---

## 📝 更新日誌

### v1.0.0 (2024-01-XX)
- 初始部署和監控系統
- 健康檢查端點
- 自動備份系統
- 監控儀表板

### 未來計畫

- [ ] 容器化部署 (Docker)
- [ ] Kubernetes 支援
- [ ] 更多監控指標
- [ ] 自動擴展功能
- [ ] 多區域部署

---

**注意**: 請確保在生產環境中妥善保護所有敏感資訊，包括 API 金鑰、資料庫連線字串等。