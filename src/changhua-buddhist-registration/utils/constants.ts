// API 端點常數
export const API_ENDPOINTS = {
  // 使用者相關
  USER_PROFILE: '/api/user/profile',
  USER_IDENTITY: '/api/user/identity',
  
  // 活動相關
  EVENTS: '/api/events',
  EVENT_DETAIL: (id: string) => `/api/events/${id}`,
  EVENT_TRANSPORT: (id: string) => `/api/events/${id}/transport`,
  
  // 報名相關
  REGISTRATION: '/api/registration',
  REGISTRATION_DETAIL: (id: string) => `/api/registration/${id}`,
  
  // Pretix 整合
  PRETIX_ORDERS: '/api/pretix/orders',
  PRETIX_ORDER_DETAIL: (id: string) => `/api/pretix/orders/${id}`,
  
  // LINE 整合
  LINE_NOTIFY: '/api/v1/line/notify',
  LINE_FRIENDSHIP: '/api/v1/line/friendship',
  LINE_BULK_NOTIFY: '/api/v1/line/bulk-notify',
  LINE_SEND_REMINDERS: '/api/v1/line/send-reminders',
} as const;

// 本地儲存鍵值
export const STORAGE_KEYS = {
  USER_IDENTITY: 'userIdentity',
  USER_PROFILE: 'userProfile',
  REGISTRATION_DRAFT: 'registrationDraft',
  LIFF_ACCESS_TOKEN: 'liffAccessToken',
} as const;

// 使用者身份類型
export const USER_IDENTITY = {
  MONK: 'monk',
  VOLUNTEER: 'volunteer',
} as const;

// 活動狀態
export const EVENT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  FULL: 'full',
} as const;

// 報名狀態
export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;

// Pretix 訂單狀態
export const PRETIX_ORDER_STATUS = {
  PENDING: 'n',      // pending
  PAID: 'p',         // paid
  EXPIRED: 'e',      // expired
  CANCELLED: 'c',    // cancelled
  REFUNDED: 'r',     // refunded
} as const;

// 表單驗證規則
export const VALIDATION_RULES = {
  REQUIRED_FIELDS: {
    NAME: 'name',
    PHONE: 'phone',
  },
  PHONE_PATTERN: /^09\d{8}$/,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 20,
  SPECIAL_REQUIREMENTS_MAX_LENGTH: 500,
} as const;

// 錯誤訊息
export const ERROR_MESSAGES = {
  // 系統錯誤
  SYSTEM_ERROR: '系統發生錯誤，請稍後再試',
  NETWORK_ERROR: '網路連線不穩定，請檢查網路狀態',
  LIFF_INIT_ERROR: 'LINE 系統初始化失敗，請重新載入頁面',
  
  // 驗證錯誤
  REQUIRED_FIELD: '此欄位為必填',
  INVALID_PHONE: '請輸入有效的手機號碼（09xxxxxxxx）',
  NAME_TOO_SHORT: '姓名至少需要2個字元',
  NAME_TOO_LONG: '姓名不能超過20個字元',
  SPECIAL_REQUIREMENTS_TOO_LONG: '特殊需求說明不能超過500個字元',
  
  // 業務邏輯錯誤
  EVENT_FULL: '活動已額滿',
  REGISTRATION_CLOSED: '報名已截止',
  TRANSPORT_FULL: '交通車座位已滿',
  DUPLICATE_REGISTRATION: '您已報名此活動',
  
  // API 錯誤
  UNAUTHORIZED: '請重新登入',
  FORBIDDEN: '沒有權限執行此操作',
  NOT_FOUND: '找不到相關資料',
  SERVER_ERROR: '伺服器錯誤，請稍後再試',
} as const;

// 成功訊息
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: '報名成功！',
  PROFILE_UPDATED: '個人資料已更新',
  IDENTITY_SAVED: '身份設定已儲存',
} as const;

// 載入訊息
export const LOADING_MESSAGES = {
  INITIALIZING: '系統初始化中...',
  LOADING_EVENTS: '載入活動資料中...',
  SUBMITTING_REGISTRATION: '提交報名資料中...',
  LOADING_PROFILE: '載入個人資料中...',
} as const;

// 日期格式
export const DATE_FORMATS = {
  DISPLAY_DATE: 'YYYY年MM月DD日',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'YYYY年MM月DD日 HH:mm',
  API_DATE: 'YYYY-MM-DD',
  API_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

// 分頁設定
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const;

// 快取設定
export const CACHE_CONFIG = {
  EVENTS_TTL: 5 * 60 * 1000,        // 5分鐘
  USER_PROFILE_TTL: 30 * 60 * 1000, // 30分鐘
  TRANSPORT_TTL: 2 * 60 * 1000,     // 2分鐘
} as const;

// 重試設定
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒
  BACKOFF_MULTIPLIER: 2,
} as const;

// 環境變數鍵值
export const ENV_KEYS = {
  LIFF_ID: 'NEXT_PUBLIC_LIFF_ID',
  API_BASE_URL: 'NEXT_PUBLIC_API_BASE_URL',
  LINE_CHANNEL_ID: 'NEXT_PUBLIC_LINE_CHANNEL_ID',
} as const;

// 預設值
export const DEFAULTS = {
  TRANSPORT_PICKUP_TIME: '07:30',
  EVENT_REGISTRATION_DEADLINE_DAYS: 3,
  MAX_TRANSPORT_SEATS: 45,
} as const;