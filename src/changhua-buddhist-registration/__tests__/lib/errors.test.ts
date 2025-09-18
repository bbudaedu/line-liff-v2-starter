/**
 * 錯誤處理和日誌系統單元測試
 * Error handling and logging system unit tests
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  logger,
  formatErrorResponse,
  formatSuccessResponse,
} from '../../lib/errors';

describe('Error Classes', () => {
  test('AppError should create error with correct properties', () => {
    const error = new AppError('測試錯誤', 400, 'TEST_ERROR');
    
    expect(error.message).toBe('測試錯誤');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  test('ValidationError should have correct defaults', () => {
    const error = new ValidationError('驗證失敗');
    
    expect(error.message).toBe('驗證失敗');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  test('NotFoundError should have correct defaults', () => {
    const error = new NotFoundError();
    
    expect(error.message).toBe('資源不存在');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  test('UnauthorizedError should have correct defaults', () => {
    const error = new UnauthorizedError();
    
    expect(error.message).toBe('未授權存取');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  test('ForbiddenError should have correct defaults', () => {
    const error = new ForbiddenError();
    
    expect(error.message).toBe('禁止存取');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  test('ConflictError should have correct defaults', () => {
    const error = new ConflictError();
    
    expect(error.message).toBe('資源衝突');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  test('ExternalServiceError should include service name', () => {
    const error = new ExternalServiceError('連線失敗', 'Pretix');
    
    expect(error.message).toBe('Pretix 服務錯誤: 連線失敗');
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
  });
});

describe('Response Formatters', () => {
  test('formatErrorResponse should format error correctly', () => {
    const error = new ValidationError('測試錯誤');
    const requestId = 'req_123';
    
    const response = formatErrorResponse(error, requestId);
    
    expect(response).toEqual({
      success: false,
      message: '測試錯誤',
      code: 'VALIDATION_ERROR',
      timestamp: expect.any(String),
      requestId: 'req_123',
    });
  });

  test('formatSuccessResponse should format success response correctly', () => {
    const data = { id: 1, name: '測試' };
    const message = '操作成功';
    const requestId = 'req_123';
    
    const response = formatSuccessResponse(data, message, requestId);
    
    expect(response).toEqual({
      success: true,
      data: { id: 1, name: '測試' },
      message: '操作成功',
      timestamp: expect.any(String),
      requestId: 'req_123',
    });
  });

  test('formatSuccessResponse should work without optional parameters', () => {
    const data = { id: 1, name: '測試' };
    
    const response = formatSuccessResponse(data);
    
    expect(response).toEqual({
      success: true,
      data: { id: 1, name: '測試' },
      message: undefined,
      timestamp: expect.any(String),
      requestId: undefined,
    });
  });
});

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log error messages', () => {
    const error = new Error('測試錯誤');
    const context = { userId: 'user123' };
    
    logger.error('發生錯誤', error, context);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR: 發生錯誤')
    );
  });

  test('should log API requests', () => {
    const infoSpy = jest.spyOn(console, 'log').mockImplementation();
    
    logger.apiRequest('GET', '/api/test', 'user123', 'req_123');
    
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO: API Request: GET /api/test')
    );
    
    infoSpy.mockRestore();
  });

  test('should log API responses', () => {
    const infoSpy = jest.spyOn(console, 'log').mockImplementation();
    
    logger.apiResponse('GET', '/api/test', 200, 150, 'user123', 'req_123');
    
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO: API Response: GET /api/test - 200 (150ms)')
    );
    
    infoSpy.mockRestore();
  });
});