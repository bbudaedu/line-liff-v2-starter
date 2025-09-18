/**
 * Security validation and penetration tests
 */
import { sanitizeInput, sanitizeFormData, validatePhoneNumber, validateTaiwanId, detectSqlInjection, rateLimiter } from '../../utils/security';
import { validateRequest, registrationSchema } from '../../lib/validation';
import { encryptData, decryptData, hashData, verifyHash, maskSensitiveData } from '../../lib/encryption';
import { rateLimit, rateLimitConfigs } from '../../lib/rate-limiting';
import { logSecurityEvent, SecurityEventType } from '../../lib/security-monitoring';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Security Validation Tests', () => {
  describe('Input Sanitization', () => {
    test('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    test('should remove iframe tags', () => {
      const maliciousInput = '<iframe src="javascript:alert(1)"></iframe>';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const maliciousInput = '<div onclick="alert(1)">Click me</div>';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
    });

    test('should encode HTML entities', () => {
      const input = '<>&"\'';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&lt;&gt;&amp;&quot;&#x27;');
    });

    test('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('Form Data Sanitization', () => {
    test('should sanitize all string fields in form data', () => {
      const formData = {
        name: '<script>alert("xss")</script>John',
        phone: '0912345678',
        specialRequirements: '<iframe src="evil.com"></iframe>None'
      };

      const sanitized = sanitizeFormData(formData);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.phone).toBe('0912345678');
      expect(sanitized.specialRequirements).not.toContain('<iframe>');
    });

    test('should handle nested objects', () => {
      const formData = {
        personalInfo: {
          name: '<script>alert(1)</script>John',
          phone: '0912345678'
        },
        transport: {
          required: true,
          locationId: 'location1'
        }
      };

      const sanitized = sanitizeFormData(formData);
      expect(sanitized.personalInfo.name).not.toContain('<script>');
      expect(sanitized.transport.required).toBe(true);
    });
  });

  describe('SQL Injection Detection', () => {
    test('should detect SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ];

      maliciousInputs.forEach(input => {
        expect(detectSqlInjection(input)).toBe(true);
      });
    });

    test('should not flag legitimate inputs', () => {
      const legitimateInputs = [
        'John Doe',
        '0912345678',
        'I need vegetarian food',
        'Temple of Peace'
      ];

      legitimateInputs.forEach(input => {
        expect(detectSqlInjection(input)).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    test('should validate Taiwan phone numbers', () => {
      const validPhones = [
        '0912345678',
        '+886912345678',
        '02-12345678',
        '0912-345-678'
      ];

      validPhones.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(true);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '0123456789012',
        'abc123',
        '+1234567890'
      ];

      invalidPhones.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(false);
      });
    });
  });

  describe('Taiwan ID Validation', () => {
    test('should validate correct Taiwan ID format', () => {
      const validIds = [
        'A123456789',
        'B234567890',
        'F131232066'
      ];

      validIds.forEach(id => {
        expect(validateTaiwanId(id)).toBe(true);
      });
    });

    test('should reject invalid Taiwan IDs', () => {
      const invalidIds = [
        'A12345678',  // Too short
        'A1234567890', // Too long
        '1123456789',  // Starts with number
        'A023456789',  // Invalid second digit
        'A999999999'   // Invalid checksum
      ];

      invalidIds.forEach(id => {
        expect(validateTaiwanId(id)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limiter
      rateLimiter.reset('test-client');
    });

    test('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed('test-client')).toBe(true);
      }
    });

    test('should block requests exceeding limit', () => {
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.isAllowed('test-client');
      }
      
      // Next request should be blocked
      expect(rateLimiter.isAllowed('test-client')).toBe(false);
    });
  });
});

describe('Data Encryption Tests', () => {
  const testData = 'sensitive information';
  const testPassword = 'test-encryption-key';

  test('should encrypt and decrypt data correctly', () => {
    const encrypted = encryptData(testData, testPassword);
    expect(encrypted).not.toBe(testData);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decryptData(encrypted, testPassword);
    expect(decrypted).toBe(testData);
  });

  test('should fail with wrong password', () => {
    const encrypted = encryptData(testData, testPassword);
    
    expect(() => {
      decryptData(encrypted, 'wrong-password');
    }).toThrow();
  });

  test('should hash data consistently', () => {
    const hash1 = hashData(testData);
    const hash2 = hashData(testData);
    
    // Hashes should be different due to random salt
    expect(hash1).not.toBe(hash2);
    
    // But both should verify correctly
    expect(verifyHash(testData, hash1)).toBe(true);
    expect(verifyHash(testData, hash2)).toBe(true);
  });

  test('should mask sensitive data', () => {
    const sensitiveData = {
      name: 'John Doe',
      phone: '0912345678',
      taiwanId: 'A123456789',
      email: 'john@example.com'
    };

    const masked = maskSensitiveData(sensitiveData);
    
    expect(masked.name).toBe('John Doe'); // Name not masked
    expect(masked.phone).toBe('091****78');
    expect(masked.taiwanId).toBe('A1******89');
    expect(masked.email).toBe('jo***@example.com');
  });
});

describe('API Security Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.1'
      },
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
  });

  test('should validate request schema', async () => {
    const validData = {
      identity: 'monk',
      personalInfo: {
        name: 'John Doe',
        phone: '0912345678'
      },
      transport: {
        required: false
      },
      eventId: 'event123'
    };

    mockReq.body = validData;

    const handler = validateRequest(registrationSchema)((req, res) => {
      return Promise.resolve();
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    
    expect(mockRes.status).not.toHaveBeenCalledWith(400);
  });

  test('should reject invalid schema', async () => {
    const invalidData = {
      identity: 'invalid',
      personalInfo: {
        name: '', // Empty name
        phone: 'invalid-phone'
      }
    };

    mockReq.body = invalidData;

    const handler = validateRequest(registrationSchema)((req, res) => {
      return Promise.resolve();
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('should detect malicious input', async () => {
    const maliciousData = {
      identity: 'monk',
      personalInfo: {
        name: '<script>alert("xss")</script>',
        phone: "'; DROP TABLE users; --"
      },
      transport: { required: false },
      eventId: 'event123'
    };

    mockReq.body = maliciousData;

    const handler = validateRequest(registrationSchema)((req, res) => {
      return Promise.resolve();
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MALICIOUS_INPUT'
      })
    );
  });
});

describe('Security Monitoring Tests', () => {
  let mockReq: Partial<NextApiRequest>;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.1'
      }
    };
  });

  test('should log security events', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    logSecurityEvent(
      mockReq as NextApiRequest,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      'Test security event',
      { testData: 'test' }
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should calculate risk scores correctly', () => {
    // This would test the internal risk calculation logic
    // Implementation depends on the specific risk scoring algorithm
  });
});

describe('Penetration Testing Scenarios', () => {
  describe('XSS Attack Scenarios', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>'
    ];

    test('should block all XSS payloads', () => {
      xssPayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain('script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
      });
    });
  });

  describe('SQL Injection Attack Scenarios', () => {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#"
    ];

    test('should detect all SQL injection payloads', () => {
      sqlPayloads.forEach(payload => {
        expect(detectSqlInjection(payload)).toBe(true);
      });
    });
  });

  describe('Directory Traversal Scenarios', () => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];

    test('should sanitize directory traversal attempts', () => {
      traversalPayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
      });
    });
  });

  describe('Command Injection Scenarios', () => {
    const commandPayloads = [
      '; cat /etc/passwd',
      '| whoami',
      '&& rm -rf /',
      '`id`',
      '$(whoami)'
    ];

    test('should sanitize command injection attempts', () => {
      commandPayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('|');
        expect(sanitized).not.toContain('&&');
        expect(sanitized).not.toContain('`');
        expect(sanitized).not.toContain('$(');
      });
    });
  });
});