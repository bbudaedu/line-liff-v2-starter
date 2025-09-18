import {
  createAppError,
  getErrorInfo,
  isNetworkError,
  isTimeoutError,
  isAuthError,
  isValidationError,
  isServerError,
  isLiffError,
  getUserFriendlyMessage,
  isRecoverableError,
  getErrorSeverity,
  formatErrorForUI,
  logError
} from '../../utils/error-handling';

describe('Error Handling Utilities', () => {
  describe('createAppError', () => {
    it('creates an enhanced error with all properties', () => {
      const error = createAppError(
        'Test error',
        'TEST_ERROR',
        400,
        { userId: '123' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ userId: '123' });
      expect(error.timestamp).toBeDefined();
    });

    it('creates error with minimal parameters', () => {
      const error = createAppError('Simple error');

      expect(error.message).toBe('Simple error');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.context).toBeUndefined();
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('Error Type Detection', () => {
    describe('isNetworkError', () => {
      it('detects network errors by message', () => {
        expect(isNetworkError(new Error('Network Error'))).toBe(true);
        expect(isNetworkError(new Error('fetch failed'))).toBe(true);
        expect(isNetworkError(new Error('connection refused'))).toBe(true);
      });

      it('detects network errors by code', () => {
        const error = new Error('Test');
        (error as any).code = 'NETWORK_ERROR';
        expect(isNetworkError(error)).toBe(true);

        (error as any).code = 'ECONNREFUSED';
        expect(isNetworkError(error)).toBe(true);
      });

      it('returns false for non-network errors', () => {
        expect(isNetworkError(new Error('Validation failed'))).toBe(false);
      });
    });

    describe('isTimeoutError', () => {
      it('detects timeout errors', () => {
        expect(isTimeoutError(new Error('Request timeout'))).toBe(true);
        expect(isTimeoutError(new Error('Operation timed out'))).toBe(true);
        
        const error = new Error('Test');
        (error as any).code = 'ECONNABORTED';
        expect(isTimeoutError(error)).toBe(true);
      });
    });

    describe('isAuthError', () => {
      it('detects auth errors by status code', () => {
        const error = createAppError('Unauthorized', 'AUTH_ERROR', 401);
        expect(isAuthError(error)).toBe(true);

        const forbiddenError = createAppError('Forbidden', 'AUTH_ERROR', 403);
        expect(isAuthError(forbiddenError)).toBe(true);
      });

      it('detects auth errors by message', () => {
        expect(isAuthError(new Error('unauthorized access'))).toBe(true);
        expect(isAuthError(new Error('forbidden resource'))).toBe(true);
      });
    });

    describe('isValidationError', () => {
      it('detects validation errors', () => {
        const error = createAppError('Bad request', 'VALIDATION_ERROR', 400);
        expect(isValidationError(error)).toBe(true);

        expect(isValidationError(new Error('validation failed'))).toBe(true);
      });
    });

    describe('isServerError', () => {
      it('detects server errors by status code', () => {
        const error = createAppError('Internal error', 'SERVER_ERROR', 500);
        expect(isServerError(error)).toBe(true);

        const badGatewayError = createAppError('Bad gateway', 'SERVER_ERROR', 502);
        expect(isServerError(error)).toBe(true);
      });

      it('returns false for non-server errors', () => {
        const clientError = createAppError('Bad request', 'CLIENT_ERROR', 400);
        expect(isServerError(clientError)).toBe(false);
      });
    });

    describe('isLiffError', () => {
      it('detects LIFF errors', () => {
        const error = new Error('LIFF initialization failed');
        (error as any).code = 'LIFF_ERROR';
        expect(isLiffError(error)).toBe(true);

        expect(isLiffError(new Error('not in line client'))).toBe(true);
      });
    });
  });

  describe('getErrorInfo', () => {
    it('returns network error info', () => {
      const error = new Error('Network Error');
      const info = getErrorInfo(error);

      expect(info.title).toBe('網路連線問題');
      expect(info.severity).toBe('medium');
      expect(info.recoverable).toBe(true);
      expect(info.suggestions).toContain('檢查網路連線是否正常');
    });

    it('returns timeout error info', () => {
      const error = new Error('Request timeout');
      const info = getErrorInfo(error);

      expect(info.title).toBe('請求逾時');
      expect(info.severity).toBe('medium');
      expect(info.recoverable).toBe(true);
    });

    it('returns auth error info', () => {
      const error = createAppError('Unauthorized', 'AUTH_ERROR', 401);
      const info = getErrorInfo(error);

      expect(info.title).toBe('身份驗證失敗');
      expect(info.severity).toBe('high');
      expect(info.recoverable).toBe(true);
    });

    it('returns validation error info', () => {
      const error = createAppError('Validation failed', 'VALIDATION_ERROR', 400);
      error.userMessage = '電話號碼格式不正確';
      const info = getErrorInfo(error);

      expect(info.title).toBe('資料驗證錯誤');
      expect(info.message).toBe('電話號碼格式不正確');
      expect(info.severity).toBe('low');
    });

    it('returns server error info', () => {
      const error = createAppError('Internal server error', 'SERVER_ERROR', 500);
      const info = getErrorInfo(error);

      expect(info.title).toBe('伺服器錯誤');
      expect(info.severity).toBe('high');
      expect(info.recoverable).toBe(true);
    });

    it('returns LIFF error info', () => {
      const error = new Error('LIFF not initialized');
      (error as any).code = 'LIFF_ERROR';
      const info = getErrorInfo(error);

      expect(info.title).toBe('LINE 應用程式錯誤');
      expect(info.severity).toBe('high');
      expect(info.recoverable).toBe(true);
    });

    it('returns generic error info for unknown errors', () => {
      const error = new Error('Unknown error');
      const info = getErrorInfo(error);

      expect(info.title).toBe('系統錯誤');
      expect(info.message).toBe('Unknown error');
      expect(info.severity).toBe('medium');
      expect(info.recoverable).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('getUserFriendlyMessage returns user-friendly message', () => {
      const error = new Error('Network Error');
      const message = getUserFriendlyMessage(error);

      expect(message).toBe('無法連接到伺服器，請檢查您的網路連線');
    });

    it('isRecoverableError checks if error is recoverable', () => {
      const networkError = new Error('Network Error');
      expect(isRecoverableError(networkError)).toBe(true);

      const genericError = new Error('Unknown error');
      expect(isRecoverableError(genericError)).toBe(true);
    });

    it('getErrorSeverity returns correct severity', () => {
      const networkError = new Error('Network Error');
      expect(getErrorSeverity(networkError)).toBe('medium');

      const authError = createAppError('Unauthorized', 'AUTH_ERROR', 401);
      expect(getErrorSeverity(authError)).toBe('high');

      const validationError = createAppError('Bad input', 'VALIDATION_ERROR', 400);
      expect(getErrorSeverity(validationError)).toBe('low');
    });

    it('formatErrorForUI returns formatted error object', () => {
      const error = new Error('Network Error');
      const formatted = formatErrorForUI(error);

      expect(formatted).toEqual({
        title: '網路連線問題',
        message: '無法連接到伺服器，請檢查您的網路連線',
        suggestions: expect.arrayContaining(['檢查網路連線是否正常']),
        canRetry: true,
        severity: 'medium'
      });
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('logs error with context', () => {
      const error = createAppError('Test error', 'TEST_ERROR', 400, { userId: '123' });
      logError(error, { action: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Application Error:',
        expect.objectContaining({
          message: 'Test error',
          code: 'TEST_ERROR',
          statusCode: 400,
          context: { userId: '123', action: 'test' }
        })
      );
    });

    it('logs error without context', () => {
      const error = new Error('Simple error');
      logError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Application Error:',
        expect.objectContaining({
          message: 'Simple error'
        })
      );
    });
  });
});