/**
 * Backend data validation middleware and utilities
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Validation schemas
export const registrationSchema = z.object({
  identity: z.enum(['monk', 'volunteer']),
  personalInfo: z.object({
    name: z.string().min(1).max(50).regex(/^[\u4e00-\u9fff\w\s]+$/),
    phone: z.string().regex(/^(\+886|0)?[2-9]\d{7,8}$/),
    emergencyContact: z.string().min(1).max(50).optional(),
    templeName: z.string().min(1).max(100).optional(),
    specialRequirements: z.string().max(500).optional(),
  }),
  transport: z.object({
    required: z.boolean(),
    locationId: z.string().optional(),
    pickupTime: z.string().optional(),
  }),
  eventId: z.string().min(1),
});

export const userProfileSchema = z.object({
  lineUserId: z.string().min(1),
  displayName: z.string().min(1).max(50),
  pictureUrl: z.string().url().optional(),
  identity: z.enum(['monk', 'volunteer']).optional(),
});

export const eventQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['open', 'closed', 'full']).optional(),
});

// SQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/gi,
  /(\b(CAST|CONVERT|SUBSTRING|ASCII|CHAR_LENGTH)\s*\()/gi,
];

// XSS detection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
];

/**
 * Detect potential SQL injection attempts
 */
function detectSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Detect potential XSS attempts
 */
function detectXss(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize string input
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
}

/**
 * Deep sanitize object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validation middleware factory
 */
export function validateRequest(schema: z.ZodSchema) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Check for malicious patterns in request body
        const bodyStr = JSON.stringify(req.body);
        if (detectSqlInjection(bodyStr) || detectXss(bodyStr)) {
          return res.status(400).json({
            success: false,
            message: '請求包含不安全的內容',
            code: 'MALICIOUS_INPUT'
          });
        }

        // Sanitize request body
        req.body = sanitizeObject(req.body);

        // Validate against schema
        const validatedData = schema.parse(req.body);
        req.body = validatedData;

        return handler(req, res);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: '資料格式錯誤',
            code: 'VALIDATION_ERROR',
            errors: (error as any).errors?.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            })) || []
          });
        }

        console.error('Validation middleware error:', error);
        return res.status(500).json({
          success: false,
          message: '伺服器內部錯誤',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP header
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' static.line-scdn.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' api.line.me",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  next();
}

/**
 * Input length validation
 */
export function validateInputLength(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const maxBodySize = 1024 * 1024; // 1MB
  const bodyStr = JSON.stringify(req.body);
  
  if (bodyStr.length > maxBodySize) {
    return res.status(413).json({
      success: false,
      message: '請求資料過大',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  next();
}

/**
 * Request method validation
 */
export function validateMethod(allowedMethods: string[]) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    if (!allowedMethods.includes(req.method || '')) {
      return res.status(405).json({
        success: false,
        message: '不支援的請求方法',
        code: 'METHOD_NOT_ALLOWED'
      });
    }
    next();
  };
}

/**
 * CORS validation
 */
export function validateCors(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const allowedOrigins = [
    'https://liff.line.me',
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000', // Development only
  ].filter(Boolean);

  const origin = req.headers.origin;
  
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: '不允許的來源',
      code: 'FORBIDDEN_ORIGIN'
    });
  }
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}