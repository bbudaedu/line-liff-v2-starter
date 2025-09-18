# 彰化供佛齋僧活動報名系統

基於 LINE LIFF 的 mini-app，整合 Pretix 票務系統，為法師和志工提供簡化的活動報名流程。

## 功能特色

- 🔐 **LIFF 整合**: 完整的 LINE 前端框架整合，包含使用者驗證和權限管理
- 📱 **響應式設計**: 優化手機使用體驗，支援大字體和無障礙功能
- 🎨 **佛教風格 UI**: 採用海報風格的色彩系統和傳統字體
- 🔄 **自動重試機制**: 網路錯誤時自動重試，提升穩定性
- ✅ **完整測試**: 包含單元測試和整合測試

## 技術架構

### 前端技術棧
- **Next.js 15.0.1** - React 框架
- **React 18.3.1** - UI 函式庫
- **LIFF SDK 2.24.0** - LINE 前端框架
- **TypeScript** - 型別安全
- **CSS Modules** - 樣式管理

### 開發工具
- **Jest** - 測試框架
- **ESLint** - 程式碼檢查
- **TypeScript** - 型別檢查

## 已實作功能

### ✅ 任務 1: 建立專案基礎架構和核心介面
- Next.js 專案結構設定
- TypeScript 介面定義
- 環境變數配置
- 基礎樣式系統

### ✅ 任務 2: 實作 LIFF 初始化和使用者驗證系統
- LIFF SDK 初始化邏輯，包含錯誤處理和重試機制
- 使用者登入狀態檢查和自動登入流程
- 使用者資料獲取功能（姓名、頭像、LINE ID）
- 權限檢查和請求功能（profile, openid 權限）
- 完整的單元測試覆蓋

## 核心服務

### LIFF 服務 (`services/liff.ts`)

提供完整的 LIFF 整合功能：

```typescript
// 初始化 LIFF
const result = await initializeLiff();

// 檢查登入狀態
const isLoggedIn = checkLoginStatus();

// 獲取使用者資料
const profile = await getUserProfile();

// 檢查權限
const permissions = await checkPermissions(['profile', 'openid']);
```

### useLiff Hook (`hooks/useLiff.ts`)

React Hook 提供狀態管理：

```typescript
const {
  initialized,
  loggedIn,
  profile,
  loading,
  error,
  login,
  checkUserPermissions
} = useLiff();
```

## 開發指令

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置專案
npm run build

# 執行測試
npm test

# 型別檢查
npm run type-check

# 程式碼檢查
npm run lint
```

## 環境設定

複製 `.env.local.example` 為 `.env.local` 並設定：

```env
NEXT_PUBLIC_LIFF_ID=your_liff_id_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_LINE_CHANNEL_ID=your_channel_id_here
```

## 測試

專案包含完整的測試套件：

- **單元測試**: 測試個別函數和元件
- **整合測試**: 測試 LIFF 服務整合
- **錯誤處理測試**: 測試各種錯誤情境

執行測試：
```bash
npm test                    # 執行所有測試
npm run test:watch         # 監視模式
npm run test:coverage      # 產生覆蓋率報告
```

## 專案結構

```
src/changhua-buddhist-registration/
├── pages/                 # Next.js 頁面
│   ├── _app.tsx          # 應用程式入口
│   └── index.tsx         # 首頁
├── services/             # 業務邏輯服務
│   └── liff.ts          # LIFF 整合服務
├── hooks/               # React Hooks
│   └── useLiff.ts       # LIFF 狀態管理
├── types/               # TypeScript 型別定義
│   └── index.ts         # 核心型別
├── styles/              # 樣式檔案
│   └── globals.css      # 全域樣式
├── __tests__/           # 測試檔案
│   └── simple.test.ts   # 整合測試
└── utils/               # 工具函數
```

## 設計特色

### 響應式設計
- 適應不同螢幕尺寸
- 大字體設計（最小 16px）
- 足夠的點擊區域（最小 44px）

### 佛教風格 UI
- 紫色漸層主色調
- 黃金色強調色
- 蓮花裝飾元素
- 標楷體和圓潤字體搭配

### 無障礙功能
- 高對比模式支援
- 減少動畫選項
- 語意化 HTML 結構

## 下一步開發

接下來將實作：
- 響應式 UI 基礎元件庫
- 使用者身份選擇功能
- 後端 API 基礎架構
- Pretix API 整合服務

## 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權

此專案採用 MIT 授權條款。