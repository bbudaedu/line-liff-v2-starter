import { 
  initializeLiff, 
  checkPermissions, 
  requestPermissions,
  getLiffEnvironmentInfo,
  checkLiffHealth,
  getFriendlyStatusMessage,
  forceReinitialize,
  resetLiffState,
  cleanup
} from '@/services/liff';

// Mock LIFF SDK
jest.mock('@line/liff', () => ({
  init: jest.fn(),
  isLoggedIn: jest.fn(),
  isInClient: jest.fn(),
  getProfile: jest.fn(),
  getPermissionGrantedAll: jest.fn(),
  requestPermissionGrantedAll: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  getAccessToken: jest.fn(),
  closeWindow: jest.fn(),
}));

import liff from '@line/liff';
const mockLiff = liff as jest.Mocked<typeof liff>;

// Mock navigator
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(global.navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    type: 'wifi',
  },
});

describe('Enhanced LIFF Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLiffState();
    
    // Set environment variable
    process.env.NEXT_PUBLIC_LIFF_ID = 'test-liff-id';
    
    // Reset navigator online status
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('initializeLiff', () => {
    it('should initialize LIFF successfully', async () => {
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(true);
      mockLiff.isInClient.mockReturnValue(true);
      mockLiff.getProfile.mockResolvedValue({
        userId: 'test-user',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/avatar.jpg',
      });
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile', 'openid']);

      const result = await initializeLiff();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.initialized).toBe(true);
      expect(result.data?.loggedIn).toBe(true);
      expect(mockLiff.init).toHaveBeenCalledWith({
        liffId: 'test-liff-id',
        withLoginOnExternalBrowser: true,
      });
    });

    it('should handle network offline error', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      const result = await initializeLiff();

      expect(result.success).toBe(false);
      expect(result.code).toBe('NETWORK_OFFLINE');
      expect(result.message).toContain('網路連線中斷');
    });

    it('should retry on network errors', async () => {
      mockLiff.init
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue(undefined);
      
      mockLiff.isLoggedIn.mockReturnValue(false);
      mockLiff.isInClient.mockReturnValue(true);

      const result = await initializeLiff();

      expect(result.success).toBe(true);
      expect(mockLiff.init).toHaveBeenCalledTimes(3);
    });

    it('should not retry on fatal errors', async () => {
      mockLiff.init.mockRejectedValue(new Error('Invalid LIFF ID'));

      const result = await initializeLiff();

      expect(result.success).toBe(false);
      expect(mockLiff.init).toHaveBeenCalledTimes(1);
    });

    it('should handle missing LIFF_ID', async () => {
      delete process.env.NEXT_PUBLIC_LIFF_ID;

      const result = await initializeLiff();

      expect(result.success).toBe(false);
      expect(result.message).toContain('LIFF_ID 未設定');
    });
  });

  describe('checkPermissions', () => {
    beforeEach(async () => {
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(true);
      mockLiff.isInClient.mockReturnValue(true);
      await initializeLiff();
    });

    it('should check permissions successfully', async () => {
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile', 'openid']);

      const result = await checkPermissions(['profile', 'openid']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['profile', 'openid']);
    });

    it('should detect missing permissions', async () => {
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile']);

      const result = await checkPermissions(['profile', 'openid']);

      expect(result.success).toBe(false);
      expect(result.code).toBe('MISSING_PERMISSIONS');
      expect(result.message).toContain('openid');
    });

    it('should handle offline network status', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      const result = await checkPermissions();

      expect(result.success).toBe(false);
      expect(result.message).toContain('網路連線中斷');
    });
  });

  describe('requestPermissions', () => {
    beforeEach(async () => {
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(true);
      mockLiff.isInClient.mockReturnValue(true);
      await initializeLiff();
    });

    it('should request permissions when missing', async () => {
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile']);
      mockLiff.requestPermissionGrantedAll.mockImplementation(() => {});

      const result = await requestPermissions(['profile', 'openid']);

      expect(result.success).toBe(true);
      expect(mockLiff.requestPermissionGrantedAll).toHaveBeenCalledWith(['profile', 'openid']);
    });

    it('should skip request when all permissions granted', async () => {
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile', 'openid']);

      const result = await requestPermissions(['profile', 'openid']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('所有權限都已授權');
      expect(mockLiff.requestPermissionGrantedAll).not.toHaveBeenCalled();
    });

    it('should retry on network errors', async () => {
      mockLiff.getPermissionGrantedAll
        .mockReturnValueOnce(['profile'])
        .mockReturnValueOnce(['profile'])
        .mockReturnValue(['profile', 'openid']);
      
      mockLiff.requestPermissionGrantedAll
        .mockImplementationOnce(() => {
          throw new Error('Network Error');
        })
        .mockImplementation(() => {});

      const result = await requestPermissions(['profile', 'openid']);

      expect(result.success).toBe(true);
    });
  });

  describe('getLiffEnvironmentInfo', () => {
    it('should return environment information', () => {
      const info = getLiffEnvironmentInfo();

      expect(info).toHaveProperty('isInClient');
      expect(info).toHaveProperty('isLoggedIn');
      expect(info).toHaveProperty('isInitialized');
      expect(info).toHaveProperty('networkStatus');
      expect(info).toHaveProperty('initializationAttempts');
      expect(info).toHaveProperty('hasError');
    });
  });

  describe('checkLiffHealth', () => {
    it('should return healthy status when all is well', async () => {
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(true);
      mockLiff.isInClient.mockReturnValue(true);
      mockLiff.getProfile.mockResolvedValue({
        userId: 'test-user',
        displayName: 'Test User',
      });
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile', 'openid']);

      await initializeLiff();
      const health = checkLiffHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('should detect initialization issues', () => {
      const health = checkLiffHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('LIFF 尚未初始化');
      expect(health.recommendations).toContain('重新載入頁面或點擊重試');
    });

    it('should detect network issues', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      const health = checkLiffHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('網路連線中斷');
      expect(health.recommendations).toContain('檢查網路連線');
    });
  });

  describe('getFriendlyStatusMessage', () => {
    it('should return success message when healthy and logged in', async () => {
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(true);
      mockLiff.isInClient.mockReturnValue(true);
      mockLiff.getProfile.mockResolvedValue({
        userId: 'test-user',
        displayName: 'Test User',
      });
      mockLiff.getPermissionGrantedAll.mockReturnValue(['profile', 'openid']);

      await initializeLiff();
      const status = getFriendlyStatusMessage();

      expect(status.status).toBe('success');
      expect(status.title).toBe('系統運作正常');
      expect(status.actions).toHaveLength(0);
    });

    it('should return error message when not initialized', () => {
      const status = getFriendlyStatusMessage();

      expect(status.status).toBe('error');
      expect(status.title).toBe('系統初始化中');
      expect(status.actions).toContainEqual({ label: '重新載入', action: 'reload' });
    });

    it('should return warning message when not logged in', async () => {
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(false);
      mockLiff.isInClient.mockReturnValue(true);

      await initializeLiff();
      const status = getFriendlyStatusMessage();

      expect(status.status).toBe('warning');
      expect(status.title).toBe('需要登入');
      expect(status.actions).toContainEqual({ label: '登入', action: 'login' });
    });
  });

  describe('forceReinitialize', () => {
    it('should reset state and reinitialize', async () => {
      // First initialization
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(true);
      await initializeLiff();

      // Force reinitialize
      mockLiff.init.mockClear();
      const result = await forceReinitialize();

      expect(result.success).toBe(true);
      expect(mockLiff.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      cleanup();
      
      const info = getLiffEnvironmentInfo();
      expect(info.isInitialized).toBe(false);
      expect(info.isLoggedIn).toBe(false);
    });
  });
});