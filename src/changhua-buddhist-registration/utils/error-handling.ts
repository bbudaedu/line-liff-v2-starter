/**
 * Error handling utilities for the application
 */

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  timestamp?: string;
  userMessage?: string;
}

export interface ErrorInfo {
  title: string;
  message: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

/**
 * Create an enhanced application error
 */
export function createAppError(
  message: string,
  code?: string,
  statusCode?: number,
  context?: Record<string, any>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.context = context;
  error.timestamp = new Date().toISOString();
  return error;
}

/**
 * Get user-friendly error information based on error type
 */
export function getErrorInfo(error: Error | AppError): ErrorInfo {
  const appError = error as AppError;
  
  // Network errors
  if (isNetworkError(error)) {
    return {
      title: '網路連線問題',
      message: '無法連接到伺服器，請檢查您的網路連線',
      suggestions: [
        '檢查網路連線是否正常',
        '嘗試重新載入頁面',
        '切換到其他網路環境',
        '稍後再試'
      ],
      severity: 'medium',
      recoverable: true
    };
  }

  // Timeout errors
  if (isTimeoutError(error)) {
    return {
      title: '請求逾時',
      message: '伺服器回應時間過長，請稍後再試',
      suggestions: [
        '檢查網路連線速度',
        '重新嘗試操作',
        '稍後再試',
        '聯絡客服如問題持續'
      ],
      severity: 'medium',
      recoverable: true
    };
  }

  // Authentication errors
  if (isAuthError(error)) {
    return {
      title: '身份驗證失敗',
      message: '您的登入狀態已過期，請重新登入',
      suggestions: [
        '重新登入 LINE 帳號',
        '檢查 LINE 應用程式是否正常',
        '清除瀏覽器快取',
        '重新開啟應用程式'
      ],
      severity: 'high',
      recoverable: true
    };
  }

  // Validation errors
  if (isValidationError(error)) {
    return {
      title: '資料驗證錯誤',
      message: appError.userMessage || '輸入的資料格式不正確',
      suggestions: [
        '檢查必填欄位是否完整',
        '確認資料格式正確',
        '重新填寫表單',
        '參考填寫說明'
      ],
      severity: 'low',
      recoverable: true
    };
  }

  // Server errors
  if (isServerError(error)) {
    return {
      title: '伺服器錯誤',
      message: '伺服器發生內部錯誤，請稍後再試',
      suggestions: [
        '稍後再試',
        '重新載入頁面',
        '檢查系統狀態',
        '聯絡客服如問題持續'
      ],
      severity: 'high',
      recoverable: true
    };
  }

  // LIFF specific errors
  if (isLiffError(error)) {
    return {
      title: 'LINE 應用程式錯誤',
      message: 'LINE 應用程式發生錯誤，請重新開啟',
      suggestions: [
        '重新開啟 LINE 應用程式',
        '更新 LINE 應用程式',
        '重新啟動手機',
        '在 LINE 中重新開啟連結'
      ],
      severity: 'high',
      recoverable: true
    };
  }

  // Generic errors
  return {
    title: '系統錯誤',
    message: appError.userMessage || error.message || '發生未預期的錯誤',
    suggestions: [
      '重新載入頁面',
      '檢查網路連線',
      '清除瀏覽器快取',
      '聯絡客服如問題持續'
    ],
    severity: 'medium',
    recoverable: true
  };
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const code = (error as any).code;
  
  return (
    message.includes('network error') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    code === 'NETWORK_ERROR' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND'
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const code = (error as any).code;
  
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    code === 'ECONNABORTED' ||
    code === 'TIMEOUT'
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: Error): boolean {
  const statusCode = (error as AppError).statusCode;
  const code = (error as any).code;
  
  return (
    statusCode === 401 ||
    statusCode === 403 ||
    code === 'UNAUTHORIZED' ||
    code === 'FORBIDDEN' ||
    error.message.includes('unauthorized') ||
    error.message.includes('forbidden')
  );
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: Error): boolean {
  const statusCode = (error as AppError).statusCode;
  const code = (error as any).code;
  
  return (
    statusCode === 400 ||
    code === 'VALIDATION_ERROR' ||
    code === 'BAD_REQUEST' ||
    error.message.includes('validation')
  );
}

/**
 * Check if error is a server error
 */
export function isServerError(error: Error): boolean {
  const statusCode = (error as AppError).statusCode;
  
  return statusCode !== undefined && statusCode >= 500 && statusCode < 600;
}

/**
 * Check if error is a LIFF-specific error
 */
export function isLiffError(error: Error): boolean {
  const code = (error as any).code;
  const message = error.message.toLowerCase();
  
  return (
    code === 'LIFF_ERROR' ||
    message.includes('liff') ||
    message.includes('line') ||
    message.includes('not in client')
  );
}

/**
 * Log error with context information
 */
export function logError(error: Error | AppError, context?: Record<string, any>): void {
  const appError = error as AppError;
  const errorData = {
    message: error.message,
    stack: error.stack,
    code: appError.code,
    statusCode: appError.statusCode,
    timestamp: appError.timestamp || new Date().toISOString(),
    context: { ...appError.context, ...context },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  };

  console.error('Application Error:', errorData);

  // In production, you might want to send this to an error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorData });
  }
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  const errorInfo = getErrorInfo(error);
  return errorInfo.message;
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: Error | AppError): boolean {
  const errorInfo = getErrorInfo(error);
  return errorInfo.recoverable;
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: Error | AppError): 'low' | 'medium' | 'high' | 'critical' {
  const errorInfo = getErrorInfo(error);
  return errorInfo.severity;
}

/**
 * Format error for display in UI components
 */
export function formatErrorForUI(error: Error | AppError): {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
  severity: string;
} {
  const errorInfo = getErrorInfo(error);
  
  return {
    title: errorInfo.title,
    message: errorInfo.message,
    suggestions: errorInfo.suggestions,
    canRetry: errorInfo.recoverable,
    severity: errorInfo.severity
  };
}

/**
 * Error boundary helper for React components
 */
export function handleComponentError(error: Error, errorInfo: React.ErrorInfo): void {
  const appError = createAppError(
    error.message,
    'COMPONENT_ERROR',
    undefined,
    {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }
  );
  
  logError(appError);
}