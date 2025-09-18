# API 文件

## 概述

彰化供佛齋僧活動報名系統 API 提供完整的後端服務，支援使用者管理、活動查詢、報名處理等功能。

## 基礎資訊

- **基礎 URL**: `/api/v1`
- **認證方式**: LINE Access Token (透過 `X-Line-Access-Token` 標頭)
- **回應格式**: JSON
- **字元編碼**: UTF-8

## 通用回應格式

### 成功回應
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功訊息",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123456789_abcdef"
}
```

### 錯誤回應
```json
{
  "success": false,
  "message": "錯誤訊息",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123456789_abcdef"
}
```

## API 端點

### 1. 系統健康檢查

#### GET /api/v1/health

檢查系統運行狀態。

**請求**
- 方法: `GET`
- 認證: 不需要

**回應**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 12345.67,
    "memory": {
      "rss": 123456789,
      "heapTotal": 123456789,
      "heapUsed": 123456789,
      "external": 123456789
    }
  },
  "message": "系統運行正常"
}
```

### 2. 使用者管理

#### GET /api/v1/user/profile

取得使用者資料。

**請求**
- 方法: `GET`
- 認證: 需要 LINE Access Token

**回應**
```json
{
  "success": true,
  "data": {
    "lineUserId": "U1234567890abcdef",
    "displayName": "測試使用者",
    "pictureUrl": "https://profile.line-scdn.net/...",
    "identity": "volunteer",
    "phone": "0912345678",
    "emergencyContact": "0987654321",
    "templeName": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/v1/user/profile

建立或更新使用者資料。

**請求**
- 方法: `POST`
- 認證: 需要 LINE Access Token
- Content-Type: `application/json`

**請求主體**
```json
{
  "identity": "volunteer",
  "phone": "0912345678",
  "emergencyContact": "0987654321",
  "templeName": "測試寺院"
}
```

**欄位說明**
- `identity`: 身份類型 (`monk` | `volunteer`)
- `phone`: 聯絡電話 (格式: `09xxxxxxxx`)
- `emergencyContact`: 緊急聯絡人 (志工專用)
- `templeName`: 寺院名稱 (法師專用)

#### POST /api/v1/user/identity

設定使用者身份。

**請求**
- 方法: `POST`
- 認證: 需要 LINE Access Token
- Content-Type: `application/json`

**請求主體**
```json
{
  "identity": "monk"
}
```

### 3. 活動管理

#### GET /api/v1/events

取得活動列表。

**請求**
- 方法: `GET`
- 認證: 不需要

**回應**
```json
{
  "success": true,
  "data": [
    {
      "id": "event_123",
      "name": "2024年彰化供佛齋僧活動",
      "description": "歡迎法師和志工參與供佛齋僧活動",
      "startDate": "2024-12-01T08:00:00.000Z",
      "endDate": "2024-12-01T17:00:00.000Z",
      "location": "彰化縣彰化市中山路一段123號",
      "maxParticipants": 150,
      "currentParticipants": 25,
      "registrationDeadline": "2024-11-25T23:59:59.000Z",
      "status": "open",
      "pretixEventSlug": "changhua-buddhist-2024",
      "transportOptions": [
        {
          "id": "transport_123",
          "name": "彰化火車站",
          "address": "彰化縣彰化市三民路1號",
          "pickupTime": "2024-12-01T07:30:00.000Z",
          "maxSeats": 45,
          "bookedSeats": 10,
          "coordinates": {
            "lat": 24.0818,
            "lng": 120.5387
          }
        }
      ]
    }
  ]
}
```

#### GET /api/v1/events/{id}

取得特定活動詳情。

**請求**
- 方法: `GET`
- 認證: 不需要
- 路徑參數: `id` - 活動 ID

**回應**
```json
{
  "success": true,
  "data": {
    "id": "event_123",
    "name": "2024年彰化供佛齋僧活動",
    "description": "歡迎法師和志工參與供佛齋僧活動",
    "startDate": "2024-12-01T08:00:00.000Z",
    "endDate": "2024-12-01T17:00:00.000Z",
    "location": "彰化縣彰化市中山路一段123號",
    "maxParticipants": 150,
    "currentParticipants": 25,
    "registrationDeadline": "2024-11-25T23:59:59.000Z",
    "status": "open",
    "pretixEventSlug": "changhua-buddhist-2024",
    "transportOptions": [...],
    "registrationStats": {
      "total": 25,
      "monks": 10,
      "volunteers": 15
    }
  }
}
```

#### GET /api/v1/events/{id}/transport

取得活動交通車資訊。

**請求**
- 方法: `GET`
- 認證: 不需要
- 路徑參數: `id` - 活動 ID

**回應**
```json
{
  "success": true,
  "data": [
    {
      "id": "transport_123",
      "eventId": "event_123",
      "name": "彰化火車站",
      "address": "彰化縣彰化市三民路1號",
      "pickupTime": "2024-12-01T07:30:00.000Z",
      "maxSeats": 45,
      "bookedSeats": 10,
      "availableSeats": 35,
      "isAvailable": true,
      "coordinates": {
        "lat": 24.0818,
        "lng": 120.5387
      }
    }
  ]
}
```

## 錯誤代碼

| 代碼 | HTTP 狀態 | 說明 |
|------|-----------|------|
| `VALIDATION_ERROR` | 400 | 請求資料驗證失敗 |
| `UNAUTHORIZED` | 401 | 未授權存取 |
| `FORBIDDEN` | 403 | 禁止存取 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `METHOD_NOT_ALLOWED` | 405 | HTTP 方法不被允許 |
| `CONFLICT` | 409 | 資源衝突 |
| `RATE_LIMIT_EXCEEDED` | 429 | 請求頻率超過限制 |
| `INTERNAL_ERROR` | 500 | 系統內部錯誤 |
| `EXTERNAL_SERVICE_ERROR` | 502 | 外部服務錯誤 |
| `LINE_SERVICE_ERROR` | 502 | LINE 服務錯誤 |

## 認證

API 使用 LINE Access Token 進行使用者認證。需要在請求標頭中包含：

```
X-Line-Access-Token: {LINE_ACCESS_TOKEN}
```

LINE Access Token 可以透過 LIFF SDK 取得：

```javascript
const accessToken = liff.getAccessToken();
```

## 速率限制

為了保護系統資源，API 實施了速率限制：

- **限制**: 每個 IP 位址每 15 分鐘最多 100 個請求
- **超過限制**: 回傳 HTTP 429 狀態碼
- **重置時間**: 每 15 分鐘重置一次計數

## 範例程式碼

### JavaScript (使用 Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 設定 LINE Access Token
api.interceptors.request.use((config) => {
  const accessToken = liff.getAccessToken();
  if (accessToken) {
    config.headers['X-Line-Access-Token'] = accessToken;
  }
  return config;
});

// 取得使用者資料
const getUserProfile = async () => {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    console.error('取得使用者資料失敗:', error.response.data);
    throw error;
  }
};

// 設定使用者身份
const setUserIdentity = async (identity) => {
  try {
    const response = await api.post('/user/identity', { identity });
    return response.data;
  } catch (error) {
    console.error('設定身份失敗:', error.response.data);
    throw error;
  }
};

// 取得活動列表
const getEvents = async () => {
  try {
    const response = await api.get('/events');
    return response.data;
  } catch (error) {
    console.error('取得活動列表失敗:', error.response.data);
    throw error;
  }
};
```

## 開發環境設定

### 環境變數

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_LIFF_ID=your_liff_id
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

### 測試資料

系統會自動初始化測試資料，包含：

- 一個測試活動：「2024年彰化供佛齋僧活動」
- 兩個交通車地點：彰化火車站、員林轉運站

### 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 執行測試
npm test

# 執行 API 測試
npm test -- --testPathPattern="api"
```

## 注意事項

1. **資料持久化**: 目前使用記憶體資料庫，重啟後資料會遺失
2. **生產環境**: 需要整合真實的資料庫系統 (PostgreSQL, MongoDB 等)
3. **安全性**: 生產環境需要加強安全性措施
4. **監控**: 建議整合日誌監控和錯誤追蹤服務
5. **快取**: 考慮加入 Redis 等快取機制提升效能