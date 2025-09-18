import { VALIDATION_RULES, ERROR_MESSAGES } from './constants';
import { FormErrors } from '@/types';

/**
 * 格式化日期顯示
 */
export const formatDate = (date: Date | string, format: string = 'YYYY年MM月DD日'): string => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
};

/**
 * 格式化時間顯示
 */
export const formatTime = (date: Date | string): string => {
  return formatDate(date, 'HH:mm');
};

/**
 * 格式化日期時間顯示
 */
export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, 'YYYY年MM月DD日 HH:mm');
};

/**
 * 檢查日期是否已過期
 */
export const isDateExpired = (date: Date | string): boolean => {
  const targetDate = new Date(date);
  const now = new Date();
  return targetDate < now;
};

/**
 * 計算兩個日期之間的天數差
 */
export const getDaysDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const timeDiff = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * 驗證手機號碼格式
 */
export const validatePhone = (phone: string): boolean => {
  return VALIDATION_RULES.PHONE_PATTERN.test(phone);
};

/**
 * 驗證姓名格式
 */
export const validateName = (name: string): boolean => {
  const trimmedName = name.trim();
  return trimmedName.length >= VALIDATION_RULES.NAME_MIN_LENGTH && 
         trimmedName.length <= VALIDATION_RULES.NAME_MAX_LENGTH;
};

/**
 * 驗證特殊需求長度
 */
export const validateSpecialRequirements = (text: string): boolean => {
  return text.length <= VALIDATION_RULES.SPECIAL_REQUIREMENTS_MAX_LENGTH;
};

/**
 * 表單驗證函數
 */
export const validateRegistrationForm = (data: {
  name: string;
  phone: string;
  identity: 'monk' | 'volunteer';
  templeName?: string;
  emergencyContact?: string;
  specialRequirements?: string;
}): FormErrors => {
  const errors: FormErrors = {};
  
  // 驗證姓名
  if (!data.name.trim()) {
    errors.name = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validateName(data.name)) {
    if (data.name.trim().length < VALIDATION_RULES.NAME_MIN_LENGTH) {
      errors.name = ERROR_MESSAGES.NAME_TOO_SHORT;
    } else {
      errors.name = ERROR_MESSAGES.NAME_TOO_LONG;
    }
  }
  
  // 驗證手機號碼
  if (!data.phone.trim()) {
    errors.phone = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validatePhone(data.phone)) {
    errors.phone = ERROR_MESSAGES.INVALID_PHONE;
  }
  
  // 根據身份驗證特定欄位
  if (data.identity === 'monk') {
    if (!data.templeName?.trim()) {
      errors.templeName = ERROR_MESSAGES.REQUIRED_FIELD;
    }
  } else if (data.identity === 'volunteer') {
    if (!data.emergencyContact?.trim()) {
      errors.emergencyContact = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!validatePhone(data.emergencyContact)) {
      errors.emergencyContact = ERROR_MESSAGES.INVALID_PHONE;
    }
  }
  
  // 驗證特殊需求
  if (data.specialRequirements && !validateSpecialRequirements(data.specialRequirements)) {
    errors.specialRequirements = ERROR_MESSAGES.SPECIAL_REQUIREMENTS_TOO_LONG;
  }
  
  return errors;
};

/**
 * 清理輸入字串（防止 XSS）
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

/**
 * 生成隨機 ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * 深拷貝物件
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
};

/**
 * 防抖函數
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 節流函數
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 本地儲存工具函數
 */
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

/**
 * 格式化錯誤訊息
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return ERROR_MESSAGES.SYSTEM_ERROR;
};

/**
 * 檢查是否為有效的 URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 格式化檔案大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 等待指定時間
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 重試函數
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      await sleep(delay * Math.pow(2, i)); // 指數退避
    }
  }
  
  throw lastError!;
};

/**
 * 檢查物件是否為空
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * 取得環境變數
 */
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue || '';
};

/**
 * 檢查活動是否已額滿
 */
export const isEventFull = (event: { currentParticipants: number; maxParticipants: number }): boolean => {
  return event.currentParticipants >= event.maxParticipants;
};

/**
 * 檢查活動報名是否已截止
 */
export const isEventClosed = (event: { registrationDeadline: Date | string }): boolean => {
  const deadline = new Date(event.registrationDeadline);
  const now = new Date();
  return deadline < now;
};

/**
 * 檢查活動是否即將截止（24小時內）
 */
export const isEventClosingSoon = (event: { registrationDeadline: Date | string }): boolean => {
  const deadline = new Date(event.registrationDeadline);
  const now = new Date();
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilDeadline <= 24 && hoursUntilDeadline > 0;
};