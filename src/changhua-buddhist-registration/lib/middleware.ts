/**
 * API 中介軟體：請求驗證、安全性、錯誤處理
 * API Middleware: Request validation, security, error handling
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AppError, logger, formatErrorResponse, ValidationError, UnauthorizedError } from './errors';
import axios from 'axios';

// 擴展 NextApiRequest 以包含自定義屬性
export interface ExtendedNextApiRequest extends NextApiRequest {
  requestId: string;
  startTime: number;
  user?: {
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
  };
}

// 生成請求 ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 請求日誌中介軟體
export function requestLogger(req: ExtendedNextApiRequest, res: NextApiResponse, next: () => void): void {
  req.requestId = generateRequestId();
  req.startTime = Date.now();

  logger.apiRequest(req.method || 'UNKNOWN', req.url || '', req.user?.lineUserId, req.requestId);

  // 攔截回應以記錄日誌
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - req.startTime;
    logger.apiResponse(
      req.method || 'UNKNOWN',
      req.url || '',
      res.statusCode,
      duration,
      req.user?.lineUserId,
      req.requestId
    );
    return originalSend.call(this, body);
  };

  next();
}

// CORS 中介軟體
export function corsMiddleware(req: NextApiRequest, res: NextApiResponse, next: () => void): void {
  // 設定 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Line-Access-Token');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}

// 速率限制中介軟體（簡化版）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 分鐘
) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void): void => {
    const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const key = `rate_limit_${clientIp}`;
    const now = Date.now();

    const record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      // 重置或建立新記錄
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json(formatErrorResponse(
        new AppError('請求過於頻繁，請稍後再試', 429, 'RATE_LIMIT_EXCEEDED')
      ));
      return;
    }

    record.count++;
    next();
  };
}

// LINE 使用者驗證中介軟體
export async function lineAuthMiddleware(req: ExtendedNextApiRequest, res: NextApiResponse, next: () => void): Promise<void> {
  try {
    const accessToken = req.headers['x-line-access-token'] as string;
    
    if (!accessToken) {
      throw new UnauthorizedError('缺少 LINE 存取權杖');
    }

    // 驗證 LINE 存取權杖
    const response = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 5000,
    });

    req.user = {
      lineUserId: response.data.userId,
      displayName: response.data.displayName,
      pictureUrl: response.data.pictureUrl,
    };

    next();
  } catch (error) {
    logger.error('LINE 使用者驗證失敗', error as Error, {
      headers: req.headers,
      requestId: req.requestId,
    });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        res.status(401).json(formatErrorResponse(
          new UnauthorizedError('無效的 LINE 存取權杖'),
          req.requestId
        ));
      } else {
        res.status(502).json(formatErrorResponse(
          new AppError('LINE 服務暫時無法使用', 502, 'LINE_SERVICE_ERROR'),
          req.requestId
        ));
      }
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('驗證過程發生錯誤', 500, 'AUTH_ERROR'),
        req.requestId
      ));
    }
  }
}

// 請求驗證中介軟體
export function validateRequest(schema: {
  body?: Record<string, any>;
  query?: Record<string, any>;
}) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void): void => {
    try {
      // 簡化的驗證邏輯
      if (schema.body) {
        for (const [key, rules] of Object.entries(schema.body)) {
          const value = req.body?.[key];
          
          if (rules.required && (value === undefined || value === null || value === '')) {
            throw new ValidationError(`欄位 '${key}' 為必填項目`);
          }
          
          if (value !== undefined && rules.type) {
            const actualType = typeof value;
            if (actualType !== rules.type) {
              throw new ValidationError(`欄位 '${key}' 類型錯誤，期望 ${rules.type}，實際 ${actualType}`);
            }
          }
          
          if (value && rules.minLength && value.length < rules.minLength) {
            throw new ValidationError(`欄位 '${key}' 長度不能少於 ${rules.minLength} 個字元`);
          }
          
          if (value && rules.maxLength && value.length > rules.maxLength) {
            throw new ValidationError(`欄位 '${key}' 長度不能超過 ${rules.maxLength} 個字元`);
          }
          
          if (value && rules.pattern && !rules.pattern.test(value)) {
            throw new ValidationError(`欄位 '${key}' 格式不正確`);
          }
        }
      }

      if (schema.query) {
        for (const [key, rules] of Object.entries(schema.query)) {
          const value = req.query[key];
          
          if (rules.required && !value) {
            throw new ValidationError(`查詢參數 '${key}' 為必填項目`);
          }
        }
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json(formatErrorResponse(error, (req as ExtendedNextApiRequest).requestId));
      } else {
        res.status(500).json(formatErrorResponse(
          new AppError('請求驗證失敗', 500, 'VALIDATION_ERROR'),
          (req as ExtendedNextApiRequest).requestId
        ));
      }
    }
  };
}

// 錯誤處理中介軟體
export function errorHandler(error: Error, req: ExtendedNextApiRequest, res: NextApiResponse): void {
  logger.error('API 錯誤', error, {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    userId: req.user?.lineUserId,
    requestId: req.requestId,
  });

  if (error instanceof AppError) {
    res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
  } else {
    // 未預期的錯誤
    res.status(500).json(formatErrorResponse(
      new AppError('系統發生未預期的錯誤', 500, 'INTERNAL_ERROR'),
      req.requestId
    ));
  }
}

// 中介軟體組合器
export function withMiddleware(...middlewares: Array<(req: any, res: any, next: () => void) => void>) {
  return (handler: (req: ExtendedNextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const extendedReq = req as ExtendedNextApiRequest;
      
      try {
        // 執行中介軟體鏈
        for (const middleware of middlewares) {
          await new Promise<void>((resolve, reject) => {
            middleware(extendedReq, res, () => resolve());
          });
          
          // 如果回應已經發送，停止執行
          if (res.headersSent) {
            return;
          }
        }
        
        // 執行主要處理器
        await handler(extendedReq, res);
      } catch (error) {
        errorHandler(error as Error, extendedReq, res);
      }
    };
  };
}

// 常用中介軟體組合
export const withBasicMiddleware = withMiddleware(
  corsMiddleware,
  requestLogger,
  rateLimitMiddleware()
);

export const withAuthMiddleware = withMiddleware(
  corsMiddleware,
  requestLogger,
  rateLimitMiddleware(),
  lineAuthMiddleware
);