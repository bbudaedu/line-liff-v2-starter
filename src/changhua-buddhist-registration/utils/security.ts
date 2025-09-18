/**
 * Frontend security utilities for input sanitization and XSS protection
 */

// XSS protection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
  /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
];

// Dangerous HTML attributes
const DANGEROUS_ATTRIBUTES = [
  'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur',
  'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload', 'onabort',
  'onkeydown', 'onkeypress', 'onkeyup', 'onmousedown', 'onmouseup',
  'onmousemove', 'onmouseout', 'onresize', 'onscroll'
];

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove dangerous script tags and other elements
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove dangerous attributes
  DANGEROUS_ATTRIBUTES.forEach(attr => {
    const attrPattern = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');
  });

  // Remove any remaining event handlers and javascript
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/alert\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/eval\s*\([^)]*\)/gi, '');

  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
}

/**
 * Validate and sanitize form data
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const phonePattern = /^(\+886|0)?[2-9]\d{7,8}$/;
  return phonePattern.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate Taiwan ID number format
 */
export function validateTaiwanId(id: string): boolean {
  const idPattern = /^[A-Z][12]\d{8}$/;
  if (!idPattern.test(id)) return false;

  // Checksum validation
  const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
  const letterValue = letters.indexOf(id[0]) + 10;
  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
  
  let sum = Math.floor(letterValue / 10) * weights[0] + (letterValue % 10) * weights[1];
  
  for (let i = 1; i < 10; i++) {
    sum += parseInt(id[i]) * weights[i + 1];
  }
  
  return sum % 10 === 0;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Check for SQL injection patterns
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/gi,
    /(\b(CAST|CONVERT|SUBSTRING|ASCII|CHAR_LENGTH)\s*\()/gi
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Rate limiting for client-side requests
 */
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new ClientRateLimiter();

/**
 * Secure local storage wrapper
 */
export class SecureStorage {
  private static encode(data: string): string {
    return btoa(encodeURIComponent(data));
  }

  private static decode(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return '';
    }
  }

  static setItem(key: string, value: string): void {
    try {
      const encoded = this.encode(value);
      localStorage.setItem(key, encoded);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  }

  static getItem(key: string): string | null {
    try {
      const encoded = localStorage.getItem(key);
      return encoded ? this.decode(encoded) : null;
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }
}