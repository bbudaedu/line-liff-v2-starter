import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiff } from '@/hooks/useLiff';

// Mock the LIFF service
jest.mock('@/services/liff', () => ({
  initializeLiff: jest.fn(),
  checkLoginStatus: jest.fn(),
  performAutoLogin: jest.fn(),
  getUserProfile: jest.fn(),
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
  getLiffState: jest.fn(),
  isInClient: jest.fn(),
  getAccessToken: jest.fn(),
  getLiffEnvironmentInfo: jest.fn(),
  forceReinitialize: jest.fn(),
  checkLiffHealth: jest.fn(),
  getFriendlyStatusMessage: jest.fn(),
}));

// Mock the network hooks
jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({
    isOnline: true,
    isSlowConnection: false,
    connectionType: '4g',
  })),
}));

jest.mock('@/hooks/useNetworkRetry', () => ({
  useNetworkRetry: jest.fn(() => ({
    executeWithRetry: jest.fn((fn) => fn()),
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    reset: jest.fn(),
  })),
}));

import * as liffService from '@/services/liff';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNetworkRetry } from '@/hooks/useNetworkRetry';

const mockLiffService = liffService as jest.Mocked<typeof liffService>;
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseNetworkRetry = useNetworkRetry as jest.MockedFunction<typeof useNetworkRetry>;

describe('Enhanced useLiff Hook', () => {
  const mockExecuteWithRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockLiffService.getLiffState.mockReturnValue({
      initialized: false,
      loggedIn: false,
      profile: null,
      permissions: [],
      isInClient: false,
      networkStatus: 'online',
      lastHealthCheck: null,
      initializationAttempts: 0,
      lastError: null,
    });

    mockLiffService.getLiffEnvironmentInfo.mockReturnValue({
      isInClient: false,
      isLoggedIn: false,
      isInitialized: false,
      networkStatus: 'online',
      lastHealthCheck: null,
      initializationAttempts: 0,
      hasError: false,
    });

    mockLiffService.checkLiffHealth.mockReturnValue({
      isHealthy: false,
      issues: ['LIFF 尚未初始化'],
      recommendations: ['重新載入頁面或點擊重試'],
    });

    mockLiffService.getFriendlyStatusMessage.mockReturnValue({
      status: 'error',
      title: '系統初始化中',
      message: '正在初始化 LINE 應用程式，請稍候...',
      actions: [
        { label: '重新載入', action: 'reload' },
        { label: '重試', action: 'retry' }
      ],
    });

    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      connectionType: '4g',
    });

    mockUseNetworkRetry.mockReturnValue({
      executeWithRetry: mockExecuteWithRetry,
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      reset: jest.fn(),
    });

    mockExecuteWithRetry.mockImplementation((fn) => fn());
  });

  describe('Initialization', () => {
    it('should initialize LIFF on mount', async () => {
      mockLiffService.initializeLiff.mockResolvedValue({
        success: true,
        data: {
          initialized: true,
          loggedIn: false,
          profile: null,
          permissions: [],
          isInClient: false,
          networkStatus: 'online',
          lastHealthCheck: new Date(),
          initializationAttempts: 1,
          lastError: null,
        },
        message: 'LIFF 初始化成功',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      expect(result.current.loading.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading.isLoading).toBe(false);
      });

      expect(mockLiffService.initializeLiff).toHaveBeenCalledTimes(1);
      expect(mockExecuteWithRetry).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle initialization failure', async () => {
      mockLiffService.initializeLiff.mockResolvedValue({
        success: false,
        message: 'LIFF 初始化失敗',
        code: 'LIFF_INIT_FAILED',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await waitFor(() => {
        expect(result.current.error.hasError).toBe(true);
      });

      expect(result.current.error.message).toContain('LIFF 初始化失敗');
      expect(result.current.error.code).toBe('LIFF_INIT_ERROR');
    });

    it('should handle network offline during initialization', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'none',
      });

      const { result } = renderHook(() => useLiff());

      await waitFor(() => {
        expect(result.current.error.hasError).toBe(true);
      });

      expect(result.current.error.message).toContain('網路連線中斷');
    });
  });

  describe('Force Reinitialization', () => {
    it('should force reinitialize LIFF', async () => {
      mockLiffService.forceReinitialize.mockResolvedValue({
        success: true,
        data: {
          initialized: true,
          loggedIn: false,
          profile: null,
          permissions: [],
          isInClient: false,
          networkStatus: 'online',
          lastHealthCheck: new Date(),
          initializationAttempts: 1,
          lastError: null,
        },
        message: 'LIFF 強制重新初始化成功',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await act(async () => {
        await result.current.forceReinitialize();
      });

      expect(mockLiffService.forceReinitialize).toHaveBeenCalledTimes(1);
    });

    it('should handle force reinitialization failure', async () => {
      mockLiffService.forceReinitialize.mockResolvedValue({
        success: false,
        message: '重新初始化失敗',
        code: 'FORCE_REINIT_FAILED',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await act(async () => {
        await result.current.forceReinitialize();
      });

      await waitFor(() => {
        expect(result.current.error.hasError).toBe(true);
      });

      expect(result.current.error.message).toContain('重新初始化失敗');
    });
  });

  describe('Login Flow', () => {
    it('should perform login', async () => {
      mockLiffService.performAutoLogin.mockResolvedValue({
        success: true,
        message: '登入成功',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await act(async () => {
        await result.current.login();
      });

      expect(mockLiffService.performAutoLogin).toHaveBeenCalledTimes(1);
    });

    it('should handle login failure', async () => {
      mockLiffService.performAutoLogin.mockResolvedValue({
        success: false,
        message: '登入失敗',
        code: 'LOGIN_FAILED',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await act(async () => {
        await result.current.login();
      });

      await waitFor(() => {
        expect(result.current.error.hasError).toBe(true);
      });

      expect(result.current.error.message).toContain('登入失敗');
    });
  });

  describe('Permission Management', () => {
    it('should check user permissions', async () => {
      mockLiffService.checkPermissions.mockResolvedValue({
        success: true,
        data: ['profile', 'openid'],
        message: '權限檢查通過',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      let permissionResult: boolean = false;
      await act(async () => {
        permissionResult = await result.current.checkUserPermissions(['profile', 'openid']);
      });

      expect(permissionResult).toBe(true);
      expect(mockLiffService.checkPermissions).toHaveBeenCalledWith(['profile', 'openid']);
    });

    it('should request user permissions', async () => {
      mockLiffService.requestPermissions.mockResolvedValue({
        success: true,
        message: '正在請求權限',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await act(async () => {
        await result.current.requestUserPermissions(['profile', 'openid']);
      });

      expect(mockLiffService.requestPermissions).toHaveBeenCalledWith(['profile', 'openid']);
    });
  });

  describe('Health Checking', () => {
    it('should check health status', () => {
      const { result } = renderHook(() => useLiff());

      act(() => {
        result.current.checkHealth();
      });

      expect(mockLiffService.checkLiffHealth).toHaveBeenCalled();
    });

    it('should get friendly status message', () => {
      const { result } = renderHook(() => useLiff());

      const status = result.current.getFriendlyStatus();

      expect(status).toEqual({
        status: 'error',
        title: '系統初始化中',
        message: '正在初始化 LINE 應用程式，請稍候...',
        actions: [
          { label: '重新載入', action: 'reload' },
          { label: '重試', action: 'retry' }
        ],
      });
    });
  });

  describe('Network Status Integration', () => {
    it('should update state when network status changes', async () => {
      const { result, rerender } = renderHook(() => useLiff());

      // Change network status to offline
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'none',
      });

      rerender();

      await waitFor(() => {
        expect(result.current.networkStatus).toBe('offline');
      });
    });

    it('should update state when network becomes slow', async () => {
      const { result, rerender } = renderHook(() => useLiff());

      // Change network status to slow
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        connectionType: '2g',
      });

      rerender();

      await waitFor(() => {
        expect(result.current.networkStatus).toBe('slow');
      });
    });
  });

  describe('Network Retry Integration', () => {
    it('should use network retry for operations', async () => {
      mockLiffService.initializeLiff.mockResolvedValue({
        success: true,
        data: {
          initialized: true,
          loggedIn: false,
          profile: null,
          permissions: [],
          isInClient: false,
          networkStatus: 'online',
          lastHealthCheck: new Date(),
          initializationAttempts: 1,
          lastError: null,
        },
        message: 'LIFF 初始化成功',
        timestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() => useLiff());

      await waitFor(() => {
        expect(result.current.loading.isLoading).toBe(false);
      });

      expect(mockExecuteWithRetry).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should provide executeWithRetry function', () => {
      const { result } = renderHook(() => useLiff());

      expect(typeof result.current.executeWithRetry).toBe('function');
    });
  });

  describe('State Management', () => {
    it('should provide comprehensive state information', async () => {
      mockLiffService.getLiffState.mockReturnValue({
        initialized: true,
        loggedIn: true,
        profile: {
          userId: 'test-user',
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg',
        },
        permissions: ['profile', 'openid'],
        isInClient: true,
        networkStatus: 'online',
        lastHealthCheck: new Date(),
        initializationAttempts: 1,
        lastError: null,
      });

      mockLiffService.getLiffEnvironmentInfo.mockReturnValue({
        isInClient: true,
        isLoggedIn: true,
        isInitialized: true,
        networkStatus: 'online',
        lastHealthCheck: new Date(),
        initializationAttempts: 1,
        hasError: false,
      });

      mockLiffService.checkLiffHealth.mockReturnValue({
        isHealthy: true,
        issues: [],
        recommendations: [],
      });

      const { result } = renderHook(() => useLiff());

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
        expect(result.current.loggedIn).toBe(true);
        expect(result.current.profile).toBeDefined();
        expect(result.current.permissions).toEqual(['profile', 'openid']);
        expect(result.current.isInLineClient).toBe(true);
        expect(result.current.healthStatus.isHealthy).toBe(true);
        expect(result.current.environmentInfo.isInitialized).toBe(true);
      });
    });
  });
});