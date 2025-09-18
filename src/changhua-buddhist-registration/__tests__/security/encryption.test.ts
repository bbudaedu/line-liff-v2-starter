/**
 * Encryption and secure storage tests
 */
import {
  encryptData,
  decryptData,
  hashData,
  verifyHash,
  maskSensitiveData,
  SecureDataStore,
  generateSecureToken,
  generateSessionId,
  validateToken,
  createApiKeyHash,
  timingSafeEqual
} from '../../lib/encryption';

describe('Encryption Tests', () => {
  const testData = 'This is sensitive information that needs to be encrypted';
  const testPassword = 'test-encryption-password-123';

  describe('Data Encryption/Decryption', () => {
    test('should encrypt data successfully', () => {
      const encrypted = encryptData(testData, testPassword);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted.length).toBeGreaterThan(0);
      expect(typeof encrypted).toBe('string');
    });

    test('should decrypt data successfully', () => {
      const encrypted = encryptData(testData, testPassword);
      const decrypted = decryptData(encrypted, testPassword);
      
      expect(decrypted).toBe(testData);
    });

    test('should produce different encrypted output each time', () => {
      const encrypted1 = encryptData(testData, testPassword);
      const encrypted2 = encryptData(testData, testPassword);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same data
      expect(decryptData(encrypted1, testPassword)).toBe(testData);
      expect(decryptData(encrypted2, testPassword)).toBe(testData);
    });

    test('should fail with wrong password', () => {
      const encrypted = encryptData(testData, testPassword);
      
      expect(() => {
        decryptData(encrypted, 'wrong-password');
      }).toThrow('Failed to decrypt data');
    });

    test('should fail with corrupted data', () => {
      const encrypted = encryptData(testData, testPassword);
      const corrupted = encrypted.substring(0, encrypted.length - 10) + 'corrupted';
      
      expect(() => {
        decryptData(corrupted, testPassword);
      }).toThrow('Failed to decrypt data');
    });

    test('should handle empty data', () => {
      const encrypted = encryptData('', testPassword);
      const decrypted = decryptData(encrypted, testPassword);
      
      expect(decrypted).toBe('');
    });

    test('should handle unicode data', () => {
      const unicodeData = '測試資料 🔒 encryption test';
      const encrypted = encryptData(unicodeData, testPassword);
      const decrypted = decryptData(encrypted, testPassword);
      
      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('Data Hashing', () => {
    test('should hash data consistently with same salt', () => {
      const data = 'password123';
      const hash1 = hashData(data);
      const [salt] = hash1.split(':');
      const hash2 = hashData(data, salt);
      
      expect(hash1).toBe(hash2);
    });

    test('should produce different hashes with different salts', () => {
      const data = 'password123';
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      
      expect(hash1).not.toBe(hash2);
    });

    test('should verify hash correctly', () => {
      const data = 'password123';
      const hash = hashData(data);
      
      expect(verifyHash(data, hash)).toBe(true);
      expect(verifyHash('wrong-password', hash)).toBe(false);
    });

    test('should handle empty data in hashing', () => {
      const hash = hashData('');
      expect(verifyHash('', hash)).toBe(true);
      expect(verifyHash('not-empty', hash)).toBe(false);
    });

    test('should be resistant to timing attacks', () => {
      const data = 'password123';
      const hash = hashData(data);
      
      // Measure time for correct password
      const start1 = process.hrtime.bigint();
      verifyHash(data, hash);
      const time1 = process.hrtime.bigint() - start1;
      
      // Measure time for wrong password
      const start2 = process.hrtime.bigint();
      verifyHash('wrong-password', hash);
      const time2 = process.hrtime.bigint() - start2;
      
      // Times should be similar (within reasonable bounds)
      const timeDiff = Math.abs(Number(time1 - time2));
      expect(timeDiff).toBeLessThan(1000000); // 1ms in nanoseconds
    });
  });

  describe('Sensitive Data Masking', () => {
    test('should mask phone numbers', () => {
      const phone = '0912345678';
      const masked = maskSensitiveData(phone);
      
      expect(masked).toBe('091****78');
      expect(masked).not.toBe(phone);
    });

    test('should mask Taiwan ID numbers', () => {
      const taiwanId = 'A123456789';
      const masked = maskSensitiveData(taiwanId);
      
      expect(masked).toBe('A1******89');
      expect(masked).not.toBe(taiwanId);
    });

    test('should mask email addresses', () => {
      const email = 'john.doe@example.com';
      const masked = maskSensitiveData(email);
      
      expect(masked).toBe('jo***@example.com');
      expect(masked).not.toBe(email);
    });

    test('should handle objects with sensitive fields', () => {
      const data = {
        name: 'John Doe',
        phone: '0912345678',
        taiwanId: 'A123456789',
        email: 'john@example.com',
        normalField: 'not sensitive'
      };

      const masked = maskSensitiveData(data);
      
      expect(masked.name).toBe('John Doe');
      expect(masked.phone).toBe('091****78');
      expect(masked.taiwanId).toBe('A1******89');
      expect(masked.email).toBe('jo***@example.com');
      expect(masked.normalField).toBe('not sensitive');
    });

    test('should handle arrays', () => {
      const data = ['0912345678', 'A123456789', 'normal text'];
      const masked = maskSensitiveData(data);
      
      expect(masked[0]).toBe('091****78');
      expect(masked[1]).toBe('A1******89');
      expect(masked[2]).toBe('normal text');
    });

    test('should handle nested objects', () => {
      const data = {
        user: {
          personalInfo: {
            phone: '0912345678',
            taiwanId: 'A123456789'
          }
        }
      };

      const masked = maskSensitiveData(data);
      
      expect(masked.user.personalInfo.phone).toBe('091****78');
      expect(masked.user.personalInfo.taiwanId).toBe('A1******89');
    });
  });

  describe('Secure Data Store', () => {
    let store: SecureDataStore;

    beforeEach(() => {
      store = SecureDataStore.getInstance();
      store.clear();
    });

    test('should store and retrieve data', () => {
      const testData = { sensitive: 'information', number: 123 };
      
      store.store('test-key', testData);
      const retrieved = store.retrieve('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent keys', () => {
      const retrieved = store.retrieve('non-existent-key');
      expect(retrieved).toBeNull();
    });

    test('should handle data expiry', async () => {
      const testData = { test: 'data' };
      
      store.store('test-key', testData, 100); // 100ms TTL
      
      // Should be available immediately
      expect(store.retrieve('test-key')).toEqual(testData);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be null after expiry
      expect(store.retrieve('test-key')).toBeNull();
    });

    test('should remove data', () => {
      const testData = { test: 'data' };
      
      store.store('test-key', testData);
      expect(store.retrieve('test-key')).toEqual(testData);
      
      store.remove('test-key');
      expect(store.retrieve('test-key')).toBeNull();
    });

    test('should clear all data', () => {
      store.store('key1', { data: 1 });
      store.store('key2', { data: 2 });
      
      expect(store.retrieve('key1')).toBeTruthy();
      expect(store.retrieve('key2')).toBeTruthy();
      
      store.clear();
      
      expect(store.retrieve('key1')).toBeNull();
      expect(store.retrieve('key2')).toBeNull();
    });

    test('should be singleton', () => {
      const store1 = SecureDataStore.getInstance();
      const store2 = SecureDataStore.getInstance();
      
      expect(store1).toBe(store2);
    });
  });

  describe('Token Generation and Validation', () => {
    test('should generate secure tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]{64}$/.test(token1)).toBe(true);
    });

    test('should generate tokens of specified length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    test('should generate session IDs', () => {
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^[a-z0-9]+-[a-f0-9]{32}$/);
    });

    test('should validate token format', () => {
      const validToken = generateSecureToken();
      const invalidTokens = [
        'invalid',
        '123',
        'not-hex-chars-gggg' + 'a'.repeat(48),
        'a'.repeat(63), // Too short
        'a'.repeat(65)  // Too long
      ];

      expect(validateToken(validToken)).toBe(true);
      
      invalidTokens.forEach(token => {
        expect(validateToken(token)).toBe(false);
      });
    });

    test('should create API key hashes', () => {
      const apiKey = 'test-api-key-123';
      const hash1 = createApiKeyHash(apiKey);
      const hash2 = createApiKeyHash(apiKey);
      
      expect(hash1).toBe(hash2); // Should be deterministic
      expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });

    test('should perform timing-safe string comparison', () => {
      const str1 = 'secret-string';
      const str2 = 'secret-string';
      const str3 = 'different-string';
      
      expect(timingSafeEqual(str1, str2)).toBe(true);
      expect(timingSafeEqual(str1, str3)).toBe(false);
      expect(timingSafeEqual('', '')).toBe(true);
      expect(timingSafeEqual('a', 'ab')).toBe(false); // Different lengths
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption without password', () => {
      // Mock missing environment variable
      const originalEnv = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => {
        encryptData(testData);
      }).toThrow('Failed to encrypt data');
      
      // Restore environment
      if (originalEnv) {
        process.env.ENCRYPTION_KEY = originalEnv;
      }
    });

    test('should handle decryption without password', () => {
      const encrypted = encryptData(testData, testPassword);
      
      // Mock missing environment variable
      const originalEnv = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => {
        decryptData(encrypted);
      }).toThrow('Failed to decrypt data');
      
      // Restore environment
      if (originalEnv) {
        process.env.ENCRYPTION_KEY = originalEnv;
      }
    });

    test('should handle invalid hash format in verification', () => {
      const invalidHashes = [
        'invalid-format',
        'no-colon-separator',
        'invalid:hex:format',
        ''
      ];

      invalidHashes.forEach(hash => {
        expect(verifyHash('test', hash)).toBe(false);
      });
    });
  });
});