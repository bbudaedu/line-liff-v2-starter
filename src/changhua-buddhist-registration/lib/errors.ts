/**
 * 統一錯誤處理和日誌記錄系統
 * Unified error handling and logging system
 */

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 預定義錯誤類型
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '資源不存在') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授權存取') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止存取') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '資源衝突') {
    super(message, 409, 'CONFLICT');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, service: string) {
    super(`${service} 服務錯誤: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// 日誌記錄系統
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, error, userId, requestId } = entry;
    
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (userId) logMessage += ` | User: ${userId}`;
    if (requestId) logMessage += ` | Request: ${requestId}`;
    if (context) logMessage += ` | Context: ${JSON.stringify(context)}`;
    if (error) logMessage += ` | Error: ${error.message}\n${error.stack}`;
    
    return logMessage;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedMessage = this.formatLogEntry(entry);

    // 在開發環境中使用 console，生產環境可以整合其他日誌服務
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    } else {
      // 生產環境可以整合 Winston, Pino 或其他日誌服務
      console.log(formattedMessage);
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // API 請求日誌
  apiRequest(method: string, path: string, userId?: string, requestId?: string): void {
    this.info(`API Request: ${method} ${path}`, {
      method,
      path,
      userId,
      requestId,
    });
  }

  // API 回應日誌
  apiResponse(method: string, path: string, statusCode: number, duration: number, userId?: string, requestId?: string): void {
    this.info(`API Response: ${method} ${path} - ${statusCode} (${duration}ms)`, {
      method,
      path,
      statusCode,
      duration,
      userId,
      requestId,
    });
  }
}

export const logger = new Logger();

// 錯誤回應格式化
export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

export function formatErrorResponse(error: AppError, requestId?: string): ErrorResponse {
  return {
    success: false,
    message: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// 成功回應格式化
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export function formatSuccessResponse<T>(data: T, message?: string, requestId?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId,
  };
}