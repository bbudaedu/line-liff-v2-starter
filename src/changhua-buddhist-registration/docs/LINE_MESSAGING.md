# LINE 訊息通知服務文件

## 概述

LINE 訊息通知服務提供完整的 LINE 官方帳號訊息發送功能，包含報名成功通知、活動提醒、重要資訊推送等功能。

## 功能特色

### 1. 好友狀態檢查
- 自動檢查使用者是否為官方帳號好友
- 提供加好友引導訊息
- 避免向非好友發送訊息

### 2. 多種訊息類型
- **報名成功通知**：包含活動詳情和交通車資訊的 Flex Message
- **活動提醒**：明日提醒和即將開始提醒
- **重要資訊推送**：支援文字和 Flex Message 格式
- **批量訊息發送**：支援同時向多位使用者發送訊息

### 3. 錯誤處理
- 自動處理非好友狀態
- LINE API 錯誤重試機制
- 詳細的錯誤日誌記錄

## API 端點

### 1. 發送通知 `/api/v1/line/notify`

**POST** 請求，用於發送各種類型的 LINE 通知。

#### 請求格式
```json
{
  "userId": "LINE_USER_ID",
  "type": "registration_success|event_reminder|important_info",
  "data": {
    // 根據類型提供不同的資料
  }
}
```

#### 報名成功通知
```json
{
  "userId": "U1234567890",
  "type": "registration_success",
  "data": {
    "registration": {
      "id": "reg_123",
      "identity": "monk",
      "personalInfo": {
        "name": "測試法師",
        "phone": "0912345678"
      },
      "transport": {
        "required": true,
        "locationId": "transport_1"
      }
    },
    "event": {
      "id": "event_1",
      "name": "彰化供佛齋僧活動",
      "startDate": "2024-01-15T09:00:00Z",
      "location": "彰化縣某寺院",
      "transportOptions": [...]
    }
  }
}
```

#### 活動提醒
```json
{
  "userId": "U1234567890",
  "type": "event_reminder",
  "data": {
    "registration": {...},
    "event": {...},
    "reminderType": "day_before|hour_before"
  }
}
```

#### 重要資訊通知
```json
{
  "userId": "U1234567890",
  "type": "important_info",
  "data": {
    "title": "重要通知",
    "content": "活動時間異動",
    "actionUrl": "https://example.com/info" // 可選
  }
}
```

### 2. 檢查好友狀態 `/api/v1/line/friendship`

**GET** 請求，檢查使用者是否為官方帳號好友。

#### 請求格式
```
GET /api/v1/line/friendship?userId=U1234567890
```

#### 回應格式
```json
{
  "success": true,
  "data": {
    "isFriend": true,
    "canSendMessage": true,
    "guidanceMessage": "請加入我們的官方帳號為好友" // 僅在非好友時提供
  }
}
```

### 3. 批量發送通知 `/api/v1/line/bulk-notify`

**POST** 請求，向多位使用者批量發送訊息。

#### 請求格式
```json
{
  "userIds": ["U1234567890", "U0987654321"],
  "messageTemplate": {
    "type": "transport_info",
    "data": {
      "title": "交通車異動通知",
      "content": "上車時間調整為 07:00"
    }
  }
}
```

#### 回應格式
```json
{
  "success": true,
  "data": {
    "totalUsers": 2,
    "successCount": 1,
    "failedCount": 1,
    "successUsers": ["U1234567890"],
    "failedUsers": ["U0987654321"]
  }
}
```

### 4. 發送活動提醒 `/api/v1/line/send-reminders`

**POST** 請求，為特定活動或所有符合條件的活動發送提醒。

#### 請求格式
```json
{
  "eventId": "event_1", // 可選，不提供則處理所有符合條件的活動
  "reminderType": "day_before|hour_before",
  "authToken": "CRON_AUTH_TOKEN" // 用於排程呼叫驗證
}
```

## 服務類別

### LineMessagingService

伺服器端 LINE 訊息服務，直接與 LINE Bot SDK 互動。

#### 主要方法

```typescript
// 檢查好友狀態
async checkFriendshipStatus(userId: string): Promise<FriendshipStatus>

// 發送報名成功通知
async sendRegistrationSuccessNotification(
  userId: string,
  registration: Registration,
  event: Event
): Promise<void>

// 發送活動提醒
async sendEventReminder(
  userId: string,
  registration: Registration,
  event: Event,
  reminderType: 'day_before' | 'hour_before'
): Promise<void>

// 發送重要資訊
async sendImportantInfo(
  userId: string,
  title: string,
  content: string,
  actionUrl?: string
): Promise<void>

// 批量發送訊息
async sendBulkMessages(
  userIds: string[],
  messageTemplate: MessageTemplate
): Promise<{ success: string[]; failed: string[] }>
```

### LineClientService

客戶端 LINE 訊息服務，透過 API 呼叫與後端互動。

#### 主要方法

```typescript
// 檢查好友狀態
async checkFriendshipStatus(userId: string): Promise<LineFriendshipStatus>

// 發送報名成功通知
async sendRegistrationSuccessNotification(
  userId: string,
  registration: Registration,
  event: Event
): Promise<boolean>

// 處理報名成功流程
async handleRegistrationSuccess(
  user: User,
  registration: Registration,
  event: Event
): Promise<{
  notificationSent: boolean;
  friendshipGuidance?: string;
}>
```

### NotificationService

整合通知服務，結合業務邏輯與 LINE 訊息發送。

#### 主要方法

```typescript
// 發送報名成功通知
async sendRegistrationSuccessNotification(
  user: User,
  registration: Registration,
  event: Event
): Promise<boolean>

// 為特定活動發送批量提醒
async sendEventRemindersForEvent(
  eventId: string,
  reminderType: 'day_before' | 'hour_before'
): Promise<{ success: number; failed: number }>

// 發送交通車資訊更新
async sendTransportInfoUpdate(
  eventId: string,
  transportLocationId: string,
  updateMessage: string
): Promise<{ success: number; failed: number }>
```

## 訊息模板

### 報名成功通知 (Flex Message)

包含以下資訊：
- 活動名稱、時間、地點
- 報名身份（法師/志工）
- 交通車資訊（如有選擇）
- 查看詳情按鈕

### 活動提醒 (Text Message)

包含以下資訊：
- 提醒類型（明日活動/即將開始）
- 活動基本資訊
- 交通車上車資訊
- 佛教祝福語

### 重要資訊通知

支援兩種格式：
- **純文字**：簡單的標題 + 內容
- **Flex Message**：包含動作按鈕的豐富格式

## 環境變數設定

```bash
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# LIFF 應用程式 URL
NEXT_PUBLIC_LIFF_URL=https://liff.line.me/your_liff_id

# 排程驗證權杖（可選）
CRON_AUTH_TOKEN=your_cron_auth_token
```

## 使用範例

### 1. 報名成功後發送通知

```typescript
import { lineClientService } from '@/services/line-client';

// 在報名成功後
const result = await lineClientService.handleRegistrationSuccess(
  user,
  registration,
  event
);

if (result.notificationSent) {
  console.log('通知發送成功');
} else if (result.friendshipGuidance) {
  // 顯示加好友引導
  showFriendshipGuidance(result.friendshipGuidance);
}
```

### 2. 檢查好友狀態

```typescript
const friendshipStatus = await lineClientService.checkFriendshipStatus(userId);

if (!friendshipStatus.isFriend) {
  // 顯示加好友提示
  showAddFriendPrompt(friendshipStatus.guidanceMessage);
}
```

### 3. 發送批量通知

```typescript
import { notificationService } from '@/services/notification';

// 發送交通車異動通知
const result = await notificationService.sendTransportInfoUpdate(
  'event_1',
  'transport_1',
  '因天候因素，上車時間調整為 07:00，請準時到達。'
);

console.log(`通知發送完成：成功 ${result.success} 人，失敗 ${result.failed} 人`);
```

## 錯誤處理

### 常見錯誤類型

1. **NOT_FRIEND (403)**：使用者尚未加入好友
2. **INVALID_REQUEST (400)**：請求參數錯誤
3. **RATE_LIMIT_EXCEEDED (429)**：請求過於頻繁
4. **INTERNAL_ERROR (500)**：系統內部錯誤

### 錯誤處理策略

```typescript
try {
  await lineMessagingService.sendRegistrationSuccessNotification(
    userId,
    registration,
    event
  );
} catch (error) {
  if (error.statusCode === 403) {
    // 使用者不是好友，記錄但不視為錯誤
    console.warn(`User ${userId} is not a friend`);
  } else {
    // 其他錯誤需要處理
    console.error('Failed to send notification:', error);
    throw error;
  }
}
```

## 測試

### 單元測試

```bash
npm test -- --testPathPattern="line-messaging"
```

### API 測試

```bash
npm test -- --testPathPattern="line-notify"
npm test -- --testPathPattern="line-friendship"
```

### 整合測試

```bash
npm test -- --testPathPattern="integration/line-messaging"
```

## 部署注意事項

1. **LINE Bot 設定**：確保 Channel Access Token 和 Channel Secret 正確設定
2. **Webhook 設定**：如需接收 LINE 事件，需設定 Webhook URL
3. **好友狀態**：測試時確保測試帳號已加入官方帳號好友
4. **訊息限制**：注意 LINE API 的訊息發送限制和配額
5. **錯誤監控**：建議設定錯誤追蹤和監控系統

## 相關文件

- [LINE Bot SDK 文件](https://developers.line.biz/en/docs/messaging-api/)
- [LINE LIFF 文件](https://developers.line.biz/en/docs/liff/)
- [Flex Message 設計工具](https://developers.line.biz/flex-simulator/)