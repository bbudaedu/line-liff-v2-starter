/**
 * Security configuration and constants
 */

// Security headers configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-DNS-Prefetch-Control': 'off'
};

// Content Security Policy
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' static.line-scdn.net d.line-scdn.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' api.line.me liff.line.me",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
];

// Allowed origins for CORS
export const ALLOWED_ORIGINS = [
  'https://liff.line.me',
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:9000'] : [])
].filter(Boolean) as string[];

// Rate limiting configurations
export const RATE_LIMITS = {
  // Authentication endpoints - very strict
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: '登入嘗試過於頻繁，請15分鐘後再試'
  },
  
  // Registration endpoints - strict
  registration: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
    message: '報名請求過於頻繁，請稍後再試'
  },
  
  // General API endpoints - moderate
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'API請求過於頻繁，請稍後再試'
  },
  
  // Sensitive operations - very strict
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1,
    message: '此操作每小時只能執行一次'
  },

  // Data query endpoints - lenient
  query: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: '查詢請求過於頻繁，請稍後再試'
  }
};

// Input validation limits
export const INPUT_LIMITS = {
  maxBodySize: 1024 * 1024, // 1MB
  maxStringLength: 1000,
  maxArrayLength: 100,
  maxObjectDepth: 5
};

// Security monitoring thresholds
export const SECURITY_THRESHOLDS = {
  highRiskScore: 7,
  maxFailedAttempts: 5,
  suspiciousActivityWindow: 60 * 60 * 1000, // 1 hour
  ddosDetectionWindow: 60 * 1000, // 1 minute
  ddosRequestThreshold: 100,
  bruteForceWindow: 60 * 60 * 1000, // 1 hour
  bruteForceThreshold: 5
};

// Encryption settings
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 16,
  iterations: 100000
};

// Token settings
export const TOKEN_CONFIG = {
  defaultLength: 32,
  sessionIdLength: 16,
  apiKeyHashAlgorithm: 'sha256'
};

// Sensitive field patterns for masking
export const SENSITIVE_PATTERNS = {
  phone: /^(\+886|0)?[2-9]\d{7,8}$/,
  taiwanId: /^[A-Z][12]\d{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/
};

// XSS and injection patterns
export const MALICIOUS_PATTERNS = {
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi
  ],
  
  sql: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/gi,
    /(\b(CAST|CONVERT|SUBSTRING|ASCII|CHAR_LENGTH)\s*\()/gi
  ],
  
  command: [
    /[;&|`$(){}[\]]/g,
    /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|nslookup|dig)\b/gi
  ]
};

// Bot detection patterns
export const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i,
  /curl/i, /wget/i, /python/i, /java/i,
  /postman/i, /insomnia/i, /httpie/i,
  /scanner/i, /test/i, /monitor/i
];

// Suspicious path patterns
export const SUSPICIOUS_PATHS = [
  /\/admin/i, /\/wp-admin/i, /\/phpmyadmin/i,
  /\.php$/i, /\.asp$/i, /\.jsp$/i,
  /\/api\/.*\/.*\/.*\//, // Too many nested API paths
  /\.\./g, // Directory traversal
  /\/etc\/passwd/i, /\/windows\/system32/i
];

// Environment-specific settings
export const getSecurityConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    isDevelopment,
    isProduction,
    enableDetailedLogging: isDevelopment,
    enableSecurityHeaders: isProduction,
    enableRateLimiting: true,
    enableEncryption: isProduction,
    enableCSP: isProduction,
    logLevel: isDevelopment ? 'debug' : 'info'
  };
};