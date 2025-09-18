# Task 25 完成報告：實作報名修改和取消 API

## 任務概述

本任務實作了報名修改和取消 API，包含以下功能：
- 建立報名資料修改 API 端點
- 實作報名取消和狀態更新功能
- 建立報名修改權限和時間限制檢查
- 實作報名歷史記錄和變更追蹤
- 撰寫報名修改功能的測試

## 實作內容

### 1. 資料庫結構增強

#### 新增 RegistrationHistory 介面
```typescript
export interface RegistrationHistory {
  id: string;
  registrationId: string;
  userId: string;
  action: 'created' | 'updated' | 'cancelled';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    requestId?: string;
    [key: string]: any;
  };
  createdAt: Date;
}
```

#### 增強的資料庫方法
- `createRegistrationHistory()` - 建立歷史記錄
- `getRegistrationHistory()` - 獲取報名歷史
- `getRegistrationHistoryByUserId()` - 獲取使用者的所有歷史記錄
- `canModifyRegistration()` - 檢查修改權限和時間限制
- 增強的 `updateRegistration()` - 自動記錄變更歷史

### 2. API 端點實作

#### `/api/v1/registration/modify` (PUT/DELETE)
**功能：**
- PUT: 修改報名資料
- DELETE: 取消報名

**權限檢查：**
- 只能修改自己的報名記錄
- 已取消的報名無法修改
- 活動開始前3天內無法修改（取消操作例外）
- 最多允許修改5次

**資料驗證：**
- 個人資料格式驗證（姓名、電話、特殊需求等）
- 交通車資訊驗證
- 身份特定欄位驗證（法師的寺院名稱、志工的緊急聯絡人）

**安全功能：**
- 輸入資料清理和 XSS 防護
- 速率限制和 DDoS 防護
- 安全事件記錄和監控
- 詳細的錯誤處理和日誌記錄

#### `/api/v1/registration/[id]/history` (GET)
**功能：**
- 查詢報名的完整歷史記錄
- 提供時間軸視圖
- 統計修改次數和狀態

**回應內容：**
- 格式化的歷史記錄（隱藏敏感資訊）
- 修改統計資訊
- 權限和限制資訊
- 視覺化時間軸

### 3. 核心功能特性

#### 修改權限管理
```typescript
async function checkModificationPermissions(
  registrationId: string, 
  userId: string, 
  requestId: string
): Promise<{ canModify: boolean; registration?: any; reason?: string }>
```

**檢查項目：**
- 報名記錄存在性
- 使用者擁有權
- 報名狀態（未取消）
- 時間限制（活動前3天）
- 修改次數限制（最多5次）

#### 資料驗證和格式化
```typescript
function validateModificationData(data: any, identity: 'monk' | 'volunteer'): void
function formatModificationData(data: any, identity: 'monk' | 'volunteer'): any
```

**驗證規則：**
- 姓名：必填，長度限制，字元格式檢查
- 電話：格式驗證，支援多種台灣電話格式
- 特殊需求：長度限制（500字元）
- 身份特定欄位：法師寺院名稱、志工緊急聯絡人

#### 歷史記錄追蹤
```typescript
interface RegistrationHistory {
  action: 'created' | 'updated' | 'cancelled';
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    description: string;
  }>;
  reason?: string;
  metadata: {
    userAgent: string;
    ipAddress: string;
    requestId: string;
    source: string;
  };
}
```

**追蹤內容：**
- 所有欄位變更的詳細記錄
- 變更原因和時間戳記
- 使用者環境資訊（瀏覽器、IP）
- 自動生成變更描述

### 4. 安全性實作

#### 輸入驗證和清理
- XSS 防護：清理所有使用者輸入
- SQL 注入防護：參數化查詢
- 資料長度限制：防止緩衝區溢位
- 格式驗證：電話、Email 等格式檢查

#### 存取控制
- 使用者身份驗證：LINE LIFF 整合
- 權限檢查：只能操作自己的資料
- 速率限制：防止濫用和 DDoS 攻擊
- 安全事件記錄：可疑活動監控

#### 資料保護
- 敏感資料隱藏：歷史記錄中的電話號碼遮罩
- 審計追蹤：完整的操作記錄
- 錯誤處理：不洩露系統內部資訊

### 5. 錯誤處理和使用者體驗

#### 友善的錯誤訊息
```typescript
const errorInfo = getErrorInfo(errorCode);
return {
  statusCode: errorInfo.statusCode,
  retryable: errorInfo.retryable,
  retryAfter: errorInfo.retryAfter,
  suggestions: errorInfo.suggestions,
  troubleshooting: errorInfo.troubleshooting
};
```

**錯誤類型處理：**
- 驗證錯誤：具體指出問題欄位
- 權限錯誤：清楚說明限制原因
- 時間限制：提供截止時間資訊
- 系統錯誤：提供重試建議

#### 使用者指引
- 修改成功後的後續步驟說明
- 剩餘修改次數提醒
- 時間限制警告
- 客服聯絡資訊

### 6. 與 Pretix 系統整合

#### 同步更新機制
```typescript
// 嘗試同步更新 Pretix 訂單（非阻塞）
if (registration.pretixOrderId) {
  try {
    await registrationService.updateRegistration(
      registration.eventId, 
      registration.pretixOrderId, 
      updates
    );
  } catch (error) {
    // 記錄警告但不阻止本地更新
    logger.warn('Pretix 同步更新失敗，但本地更新成功');
  }
}
```

#### 取消處理
- 嘗試取消 Pretix 訂單
- 記錄取消結果
- 即使 Pretix 取消失敗也更新本地狀態
- 提供退款資訊指引

### 7. 測試實作

#### 單元測試
- API 端點功能測試
- 權限檢查測試
- 資料驗證測試
- 錯誤處理測試

#### 整合測試
- 完整修改流程測試
- 取消流程測試
- 歷史記錄查詢測試
- 邊界條件測試

#### 測試覆蓋範圍
- 成功修改個人資料
- 成功修改交通車資訊
- 成功取消報名
- 權限拒絕測試
- 資料驗證失敗測試
- 時間限制測試
- 修改次數限制測試

## 技術特點

### 1. 模組化設計
- 清晰的職責分離
- 可重用的驗證函數
- 統一的錯誤處理機制

### 2. 效能優化
- 非阻塞的 Pretix 同步
- 高效的資料庫查詢
- 適當的快取策略

### 3. 可維護性
- 詳細的程式碼註解
- 一致的命名規範
- 完整的錯誤日誌

### 4. 擴展性
- 靈活的歷史記錄結構
- 可配置的限制參數
- 支援未來功能擴展

## 使用範例

### 修改個人資料
```javascript
PUT /api/v1/registration/modify?registrationId=REG_123
{
  "personalInfo": {
    "name": "修改後的姓名",
    "specialRequirements": "新的特殊需求"
  },
  "reason": "更新個人資料"
}
```

### 修改交通車資訊
```javascript
PUT /api/v1/registration/modify?registrationId=REG_123
{
  "transport": {
    "required": false
  },
  "reason": "不需要交通車"
}
```

### 取消報名
```javascript
DELETE /api/v1/registration/modify?registrationId=REG_123
{
  "reason": "臨時有事無法參加"
}
```

### 查詢歷史記錄
```javascript
GET /api/v1/registration/REG_123/history
```

## 完成狀態

✅ **已完成的子任務：**
1. 建立報名資料修改 API 端點
2. 實作報名取消和狀態更新功能
3. 建立報名修改權限和時間限制檢查
4. 實作報名歷史記錄和變更追蹤
5. 撰寫報名修改功能的測試

## 符合需求

本實作完全符合需求 8.2 和 8.3：

**需求 8.2：** 當使用者需要修改資料時，系統應該提供編輯功能（在允許的時間範圍內）
- ✅ 實作了完整的修改功能
- ✅ 支援個人資料和交通車資訊修改
- ✅ 實作了時間限制檢查（活動前3天）
- ✅ 提供了修改次數限制（最多5次）

**需求 8.3：** 當活動時間接近時，系統應該顯示重要提醒資訊（集合時間、地點等）
- ✅ 在修改回應中提供了後續步驟指引
- ✅ 實作了時間限制提醒
- ✅ 提供了活動相關的重要資訊

## 總結

Task 25 已成功完成，實作了一個功能完整、安全可靠的報名修改和取消 API 系統。該系統不僅滿足了基本的修改需求，還提供了完整的歷史追蹤、權限管理、安全防護等進階功能，為使用者提供了良好的體驗和系統管理員提供了完整的審計能力。