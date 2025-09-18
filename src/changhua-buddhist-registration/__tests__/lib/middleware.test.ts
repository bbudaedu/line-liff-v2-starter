/**
 * 中介軟體單元測試
 * Middleware unit tests
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  generateRequestId,
  corsMiddleware,
  rateLimitMiddleware,
  validateRequest,
  ExtendedNextApiRequest,
} from '../../lib/middleware';

// Mock response object
const createMockResponse = (): Partial<NextApiResponse> => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  end: jest.fn(),
  send: jest.fn(),
  headersSent: false,
});

// Mock request object
const createMockRequest = (overrides: Partial<NextApiRequest> = {}): Partial<ExtendedNextApiRequest> => ({
  method: 'GET',
  url: '/api/test',
  headers: {},
  query: {},
  body: {},
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides,
});

describe('Middleware Utilities', () => {
  test('generateRequestId should generate unique IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    
    expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe('CORS Middleware', () => {
  test('should set CORS headers', () => {
    const req = createMockRequest() as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    corsMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Line-Access-Token');
    expect(next).toHaveBeenCalled();
  });

  test('should handle OPTIONS requests', () => {
    const req = createMockRequest({ method: 'OPTIONS' }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    corsMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    // Clear rate limit records before each test
    jest.clearAllMocks();
    // Clear the rate limit map by creating a new middleware instance
  });

  test('should allow requests within limit', () => {
    const middleware = rateLimitMiddleware(5, 60000); // 5 requests per minute
    const req = createMockRequest({
      connection: { remoteAddress: '127.0.0.1' }
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should block requests exceeding limit', () => {
    const middleware = rateLimitMiddleware(1, 60000); // 1 request per minute
    const testIp = '192.168.1.100'; // Use a unique IP for this test
    const req = createMockRequest({
      connection: { remoteAddress: testIp }
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    // First request should pass
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Second request from same IP should be blocked
    const req2 = createMockRequest({
      connection: { remoteAddress: testIp }
    }) as NextApiRequest;
    const res2 = createMockResponse() as NextApiResponse;
    const next2 = jest.fn();
    
    middleware(req2, res2, next2);
    
    expect(next2).not.toHaveBeenCalled();
    expect(res2.status).toHaveBeenCalledWith(429);
    expect(res2.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
      })
    );
  });
});

describe('Validation Middleware', () => {
  test('should pass validation for valid data', () => {
    const middleware = validateRequest({
      body: {
        name: { required: true, type: 'string' },
        age: { type: 'number' },
      },
    });

    const req = createMockRequest({
      body: { name: '測試', age: 25 },
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should fail validation for missing required field', () => {
    const middleware = validateRequest({
      body: {
        name: { required: true, type: 'string' },
      },
    });

    const req = createMockRequest({
      body: {},
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("欄位 'name' 為必填項目"),
      })
    );
  });

  test('should fail validation for wrong type', () => {
    const middleware = validateRequest({
      body: {
        age: { type: 'number' },
      },
    });

    const req = createMockRequest({
      body: { age: '25' }, // string instead of number
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("欄位 'age' 類型錯誤"),
      })
    );
  });

  test('should validate string length', () => {
    const middleware = validateRequest({
      body: {
        name: { minLength: 2, maxLength: 10 },
      },
    });

    // Test minimum length
    const req1 = createMockRequest({
      body: { name: 'a' }, // too short
    }) as NextApiRequest;
    const res1 = createMockResponse() as NextApiResponse;
    const next1 = jest.fn();

    middleware(req1, res1, next1);

    expect(next1).not.toHaveBeenCalled();
    expect(res1.status).toHaveBeenCalledWith(400);

    // Test maximum length
    const req2 = createMockRequest({
      body: { name: 'this is too long' }, // too long
    }) as NextApiRequest;
    const res2 = createMockResponse() as NextApiResponse;
    const next2 = jest.fn();

    middleware(req2, res2, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  test('should validate pattern', () => {
    const middleware = validateRequest({
      body: {
        phone: { pattern: /^09\d{8}$/ },
      },
    });

    const req = createMockRequest({
      body: { phone: '123456789' }, // invalid format
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("欄位 'phone' 格式不正確"),
      })
    );
  });

  test('should validate query parameters', () => {
    const middleware = validateRequest({
      query: {
        id: { required: true },
      },
    });

    const req = createMockRequest({
      query: {},
    }) as NextApiRequest;
    const res = createMockResponse() as NextApiResponse;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("查詢參數 'id' 為必填項目"),
      })
    );
  });
});