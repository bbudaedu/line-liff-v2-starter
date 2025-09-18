/**
 * Data encryption and secure storage utilities
 */
// Check if we're running in Node.js environment
const isNode = typeof window === 'undefined';

// Conditionally import crypto only on server side
let crypto: any = null;
if (isNode) {
  crypto = require('crypto');
}

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Generate encryption key from password
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string, password?: string): string {
  if (!isNode) {
    throw new Error('Encryption is only available on the server side');
  }
  
  try {
    const encryptionKey = password || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not provided');
    }

    const salt = crypto.randomBytes(16);
    const key = deriveKey(encryptionKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, password?: string): string {
  if (!isNode) {
    throw new Error('Decryption is only available on the server side');
  }
  
  try {
    const encryptionKey = password || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not provided');
    }

    const buffer = Buffer.from(encryptedData, 'base64');
    
    const salt = buffer.subarray(0, 16);
    const iv = buffer.subarray(16, 16 + IV_LENGTH);
    const tag = buffer.subarray(16 + IV_LENGTH, 16 + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(16 + IV_LENGTH + TAG_LENGTH);
    
    const key = deriveKey(encryptionKey, salt);
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string, salt?: string): string {
  if (!isNode) {
    throw new Error('Hashing is only available on the server side');
  }
  
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha256');
  return saltBuffer.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
  if (!isNode) {
    throw new Error('Hash verification is only available on the server side');
  }
  
  try {
    if (!hashedData || !hashedData.includes(':')) {
      return false;
    }
    
    const [salt, hash] = hashedData.split(':');
    if (!salt || !hash) {
      return false;
    }
    
    const saltBuffer = Buffer.from(salt, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    
    const computedHash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha256');
    
    return crypto.timingSafeEqual(hashBuffer, computedHash);
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    // Mask phone numbers
    if (/^\+?[\d\s-()]+$/.test(data) && data.length >= 8) {
      return data.substring(0, 3) + '****' + data.substring(data.length - 2);
    }
    
    // Mask Taiwan ID
    if (/^[A-Z][12]\d{8}$/.test(data)) {
      return data.substring(0, 2) + '******' + data.substring(8);
    }
    
    // Mask email
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      return local.substring(0, 2) + '***@' + domain;
    }
    
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  
  if (data && typeof data === 'object') {
    const masked: any = {};
    const sensitiveFields = ['phone', 'taiwanId', 'emergencyContact', 'email', 'lineUserId'];
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key)) {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    
    return masked;
  }
  
  return data;
}

/**
 * Secure data storage class
 */
export class SecureDataStore {
  private static instance: SecureDataStore;
  private cache = new Map<string, { data: string; expiry: number }>();

  static getInstance(): SecureDataStore {
    if (!SecureDataStore.instance) {
      SecureDataStore.instance = new SecureDataStore();
    }
    return SecureDataStore.instance;
  }

  /**
   * Store encrypted data with expiry
   */
  store(key: string, data: any, ttlMs: number = 3600000): void { // Default 1 hour
    try {
      const serialized = JSON.stringify(data);
      const encrypted = encryptData(serialized);
      const expiry = Date.now() + ttlMs;
      
      this.cache.set(key, { data: encrypted, expiry });
      
      // Clean up expired entries
      this.cleanup();
    } catch (error) {
      console.error('Failed to store secure data:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Retrieve and decrypt data
   */
  retrieve(key: string): any | null {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return null;
      }
      
      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        return null;
      }
      
      const decrypted = decryptData(entry.data);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      this.cache.delete(key);
      return null;
    }
  }

  /**
   * Remove data
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Generate secure random tokens
 */
export function generateSecureToken(length: number = 32): string {
  if (!isNode) {
    throw new Error('Token generation is only available on the server side');
  }
  
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  if (!isNode) {
    throw new Error('Session ID generation is only available on the server side');
  }
  
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `${timestamp}-${randomPart}`;
}

/**
 * Validate token format
 */
export function validateToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Create secure hash for API keys
 */
export function createApiKeyHash(apiKey: string): string {
  if (!isNode) {
    throw new Error('API key hashing is only available on the server side');
  }
  
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Time-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (!isNode) {
    throw new Error('Timing-safe comparison is only available on the server side');
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  
  return crypto.timingSafeEqual(bufferA, bufferB);
}