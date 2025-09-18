/**
 * Rate limiting and DDoS protection tests
 */
import { rateLimit, rateLimitConfigs, ddosProtection, getRateLimitStatus } from '../../lib/rate-limiting';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Rate Limiting Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.100'
      },
      socket: {
        remoteAddress: '192.168.1.100'
      } as any
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    mockHandler = jest.fn().mockResolvedValue(undefined);
  });

  describe('Basic Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 5
      })(mockHandler);

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
        expect(mockRes.status).not.toHaveBeenCalledWith(429);
      }

      expect(mockHandler).toHaveBeenCalledTimes(5);
    });

    test('should block requests exceeding limit', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 3
      })(mockHandler);

      // Make 3 requests - should succeed
      for (let i = 0; i < 3; i++) {
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      }

      // 4th request should be blocked
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RATE_LIMITED'
        })
      );
    });

    test('should set rate limit headers', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 10
      })(mockHandler);

      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });
  });

  describe('Different Client Identification', () => {
    test('should treat different IPs as separate clients', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 2
      })(mockHandler);

      // Client 1
      mockReq.headers!['x-forwarded-for'] = '192.168.1.100';
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Client 2 - should not be affected by client 1's limit
      mockReq.headers!['x-forwarded-for'] = '192.168.1.101';
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockHandler).toHaveBeenCalledTimes(4);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    test('should consider user agent in client identification', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 2
      })(mockHandler);

      // Same IP, different user agents
      mockReq.headers!['user-agent'] = 'Mozilla/5.0 Chrome';
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      mockReq.headers!['user-agent'] = 'Mozilla/5.0 Firefox';
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Suspicious Activity Detection', () => {
    test('should detect bot user agents', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 10
      })(mockHandler);

      const botUserAgents = [
        'Googlebot/2.1',
        'Mozilla/5.0 (compatible; bingbot/2.0)',
        'curl/7.68.0',
        'python-requests/2.25.1'
      ];

      for (const userAgent of botUserAgents) {
        mockReq.headers!['user-agent'] = userAgent;
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
        
        // Should be blocked due to suspicious activity
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
          })
        );
      }
    });

    test('should detect suspicious paths', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 10
      })(mockHandler);

      const suspiciousPaths = [
        '/admin/login',
        '/wp-admin/admin.php',
        '/phpmyadmin/index.php',
        '/api/users/admin/delete'
      ];

      for (const path of suspiciousPaths) {
        mockReq.url = path;
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
        
        expect(mockRes.status).toHaveBeenCalledWith(429);
      }
    });

    test('should block after multiple suspicious requests', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 10
      })(mockHandler);

      mockReq.headers!['user-agent'] = 'curl/7.68.0';

      // Make 3 suspicious requests
      for (let i = 0; i < 3; i++) {
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      }

      // Should be blocked for 1 hour
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
        })
      );
    });
  });

  describe('DDoS Protection', () => {
    test('should detect rapid-fire requests', async () => {
      const mockNext = jest.fn();
      
      // Simulate 15 rapid requests
      for (let i = 0; i < 15; i++) {
        ddosProtection(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      }

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'DDOS_PROTECTION_TRIGGERED'
        })
      );
    });

    test('should allow normal request patterns', async () => {
      const mockNext = jest.fn();
      
      // Make 5 requests - should be fine
      for (let i = 0; i < 5; i++) {
        ddosProtection(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('Rate Limit Configurations', () => {
    test('should have appropriate limits for auth endpoints', () => {
      expect(rateLimitConfigs.auth.maxRequests).toBe(5);
      expect(rateLimitConfigs.auth.windowMs).toBe(15 * 60 * 1000);
    });

    test('should have appropriate limits for registration endpoints', () => {
      expect(rateLimitConfigs.registration.maxRequests).toBe(3);
      expect(rateLimitConfigs.registration.windowMs).toBe(60 * 1000);
    });

    test('should have lenient limits for general endpoints', () => {
      expect(rateLimitConfigs.general.maxRequests).toBe(30);
      expect(rateLimitConfigs.general.windowMs).toBe(60 * 1000);
    });

    test('should have strict limits for sensitive operations', () => {
      expect(rateLimitConfigs.sensitive.maxRequests).toBe(1);
      expect(rateLimitConfigs.sensitive.windowMs).toBe(60 * 60 * 1000);
    });
  });

  describe('Rate Limit Status Monitoring', () => {
    test('should provide rate limit statistics', () => {
      const status = getRateLimitStatus();
      
      expect(status).toHaveProperty('activeClients');
      expect(status).toHaveProperty('suspiciousClients');
      expect(status).toHaveProperty('blockedClients');
      expect(typeof status.activeClients).toBe('number');
      expect(typeof status.suspiciousClients).toBe('number');
      expect(typeof status.blockedClients).toBe('number');
    });
  });

  describe('Window Reset Behavior', () => {
    test('should reset limits after window expires', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 100, // Very short window for testing
        maxRequests: 2
      })(mockHandler);

      // Exhaust limit
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      
      // Third request should be blocked
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be able to make requests again
      mockRes.status = jest.fn().mockReturnThis();
      await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('Skip Conditions', () => {
    test('should skip successful requests when configured', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true
      })(mockHandler);

      mockRes.statusCode = 200;

      // Make 3 successful requests - should all pass due to skip condition
      for (let i = 0; i < 3; i++) {
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      }

      expect(mockHandler).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    test('should skip failed requests when configured', async () => {
      const rateLimitedHandler = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        skipFailedRequests: true
      })(mockHandler);

      mockRes.statusCode = 400;

      // Make 3 failed requests - should all pass due to skip condition
      for (let i = 0; i < 3; i++) {
        await rateLimitedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      }

      expect(mockHandler).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
  });
});