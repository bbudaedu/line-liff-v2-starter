import { PretixConfig } from '../services/pretix';

// Pretix 配置介面
export interface PretixEnvironmentConfig extends PretixConfig {
  environment: 'development' | 'staging' | 'production';
  retryAttempts: number;
  retryDelay: number;
  cacheTimeout: number;
  healthCheckInterval: number;
}

// 預設配置
const defaultConfig: Omit<PretixEnvironmentConfig, 'baseURL' | 'apiToken' | 'organizerSlug'> = {
  environment: 'development',
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  healthCheckInterval: 30 * 1000 // 30 seconds
};

// 環境變數驗證
function validateEnvironmentVariables(): {
  baseURL: string;
  apiToken: string;
  organizerSlug: string;
} {
  const baseURL = process.env.PRETIX_API_URL || process.env.NEXT_PUBLIC_PRETIX_API_URL;
  const apiToken = process.env.PRETIX_API_TOKEN;
  const organizerSlug = process.env.PRETIX_ORGANIZER_SLUG || process.env.NEXT_PUBLIC_PRETIX_ORGANIZER_SLUG;

  if (!baseURL) {
    throw new Error('PRETIX_API_URL environment variable is required');
  }

  if (!apiToken) {
    throw new Error('PRETIX_API_TOKEN environment variable is required');
  }

  if (!organizerSlug) {
    throw new Error('PRETIX_ORGANIZER_SLUG environment variable is required');
  }

  return { baseURL, apiToken, organizerSlug };
}

// 根據環境獲取配置
export function getPretixConfig(): PretixEnvironmentConfig {
  const envVars = validateEnvironmentVariables();
  const environment = (process.env.NODE_ENV as any) || 'development';

  const config: PretixEnvironmentConfig = {
    ...defaultConfig,
    ...envVars,
    environment
  };

  // 根據環境調整配置
  switch (environment) {
    case 'production':
      config.retryAttempts = 5;
      config.retryDelay = 2000;
      config.cacheTimeout = 10 * 60 * 1000; // 10 minutes
      config.healthCheckInterval = 60 * 1000; // 1 minute
      break;
    
    case 'staging':
      config.retryAttempts = 4;
      config.retryDelay = 1500;
      config.cacheTimeout = 7 * 60 * 1000; // 7 minutes
      config.healthCheckInterval = 45 * 1000; // 45 seconds
      break;
    
    case 'development':
    default:
      // 使用預設配置
      break;
  }

  return config;
}

// 測試環境配置
export function getTestPretixConfig(): PretixEnvironmentConfig {
  return {
    baseURL: 'https://test.pretix.eu/api/v1',
    apiToken: 'test-token',
    organizerSlug: 'test-organizer',
    environment: 'development',
    retryAttempts: 1,
    retryDelay: 100,
    cacheTimeout: 1000, // 1 second for testing
    healthCheckInterval: 5000 // 5 seconds
  };
}

// 驗證 Pretix URL 格式
export function validatePretixURL(url: string): boolean {
  try {
    const parsedURL = new URL(url);
    return parsedURL.protocol === 'https:' && parsedURL.pathname.includes('/api/v1');
  } catch {
    return false;
  }
}

// 驗證 API Token 格式
export function validateAPIToken(token: string): boolean {
  // Pretix API tokens are typically 40 characters long
  return typeof token === 'string' && token.length >= 20 && token.length <= 100;
}

// 驗證 Organizer Slug 格式
export function validateOrganizerSlug(slug: string): boolean {
  // Organizer slugs should be alphanumeric with hyphens
  return /^[a-zA-Z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}

// 完整配置驗證
export function validatePretixConfig(config: PretixConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!validatePretixURL(config.baseURL)) {
    errors.push('Invalid Pretix API URL format');
  }

  if (!validateAPIToken(config.apiToken)) {
    errors.push('Invalid API token format');
  }

  if (!validateOrganizerSlug(config.organizerSlug)) {
    errors.push('Invalid organizer slug format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 活動相關的常數
export const PRETIX_CONSTANTS = {
  // 訂單狀態
  ORDER_STATUS: {
    NEW: 'n',
    PENDING: 'p',
    EXPIRED: 'e',
    CANCELLED: 'c',
    REFUNDED: 'r'
  } as const,

  // 支付狀態
  PAYMENT_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  } as const,

  // 銷售管道
  SALES_CHANNELS: {
    WEB: 'web',
    MOBILE: 'mobile',
    LIFF: 'liff'
  } as const,

  // 語言代碼
  LOCALES: {
    TRADITIONAL_CHINESE: 'zh-tw',
    SIMPLIFIED_CHINESE: 'zh-cn',
    ENGLISH: 'en'
  } as const,

  // 貨幣代碼
  CURRENCIES: {
    TWD: 'TWD',
    USD: 'USD',
    EUR: 'EUR'
  } as const,

  // 項目類別關鍵字
  ITEM_CATEGORIES: {
    MONK: ['法師', 'monk', '師父', '出家'],
    VOLUNTEER: ['志工', 'volunteer', '義工', '在家']
  } as const,

  // API 限制
  API_LIMITS: {
    MAX_POSITIONS_PER_ORDER: 100,
    MAX_ORDERS_PER_MINUTE: 60,
    MAX_RETRY_ATTEMPTS: 5,
    DEFAULT_TIMEOUT: 30000
  } as const
};

// 錯誤訊息對應
export const PRETIX_ERROR_MESSAGES = {
  'BAD_REQUEST': '請求資料格式錯誤',
  'UNAUTHORIZED': 'API 認證失敗，請檢查 API Token',
  'FORBIDDEN': '沒有權限執行此操作',
  'NOT_FOUND': '找不到指定的資源',
  'RATE_LIMITED': 'API 請求頻率過高，請稍後再試',
  'SERVER_ERROR': 'Pretix 服務暫時無法使用，請稍後再試',
  'NETWORK_ERROR': '無法連接到 Pretix 服務，請檢查網路連線',
  'UNKNOWN_ERROR': '未知錯誤',
  'FETCH_EVENTS_ERROR': '獲取活動列表失敗',
  'FETCH_EVENT_ERROR': '獲取活動詳情失敗',
  'CHECK_AVAILABILITY_ERROR': '檢查活動可用性失敗',
  'CREATE_REGISTRATION_ERROR': '建立報名失敗',
  'GET_ORDER_ERROR': '查詢報名狀態失敗',
  'CANCEL_ORDER_ERROR': '取消報名失敗',
  'EVENT_NOT_AVAILABLE': '活動不可報名',
  'ITEM_NOT_FOUND': '找不到對應的報名項目',
  'ITEM_NOT_AVAILABLE': '該報名項目已額滿'
} as const;

// 預設的活動設定
export const DEFAULT_EVENT_SETTINGS = {
  currency: PRETIX_CONSTANTS.CURRENCIES.TWD,
  locale: PRETIX_CONSTANTS.LOCALES.TRADITIONAL_CHINESE,
  sales_channel: PRETIX_CONSTANTS.SALES_CHANNELS.LIFF,
  timezone: 'Asia/Taipei'
};

// 報名表單欄位對應
export const REGISTRATION_FIELD_MAPPING = {
  monk: {
    required: ['name', 'phone', 'templeName'],
    optional: ['email', 'specialRequirements']
  },
  volunteer: {
    required: ['name', 'phone', 'emergencyContact'],
    optional: ['email', 'specialRequirements']
  }
} as const;

export default {
  getPretixConfig,
  getTestPretixConfig,
  validatePretixConfig,
  PRETIX_CONSTANTS,
  PRETIX_ERROR_MESSAGES,
  DEFAULT_EVENT_SETTINGS,
  REGISTRATION_FIELD_MAPPING
};