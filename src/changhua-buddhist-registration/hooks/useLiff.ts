import { useState, useEffect, useCallback } from 'react';
import { 
  initializeLiff, 
  checkLoginStatus, 
  performAutoLogin, 
  getUserProfile, 
  checkPermissions, 
  requestPermissions,
  getLiffState,
  isInClient,
  getAccessToken,
  getLiffEnvironmentInfo,
  forceReinitialize,
  checkLiffHealth,
  getFriendlyStatusMessage
} from '@/services/liff';
import { LiffProfile, LoadingState, ErrorState } from '@/types';
import { useNetworkStatus } from './useNetworkStatus';
import { useNetworkRetry } from './useNetworkRetry';

// LIFF Hook 狀態介面
interface UseLiffState {
  initialized: boolean;
  loggedIn: boolean;
  profile: LiffProfile | null;
  permissions: string[];
  isInLineClient: boolean;
  loading: LoadingState;
  error: ErrorState;
  networkStatus: 'online' | 'offline' | 'slow';
  healthStatus: {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  };
  environmentInfo: {
    isInClient: boolean;
    isLoggedIn: boolean;
    isInitialized: boolean;
    networkStatus: string;
    lastHealthCheck: Date | null;
    initializationAttempts: number;
    hasError: boolean;
    errorMessage?: string;
  };
}

// LIFF Hook 回傳介面
interface UseLiffReturn extends UseLiffState {
  // 初始化相關
  initialize: () => Promise<void>;
  forceReinitialize: () => Promise<void>;
  
  // 登入相關
  login: () => Promise<void>;
  checkLogin: () => boolean;
  
  // 使用者資料相關
  refreshProfile: () => Promise<void>;
  
  // 權限相關
  checkUserPermissions: (requiredScopes?: string[]) => Promise<boolean>;
  requestUserPermissions: (requiredScopes?: string[]) => Promise<void>;
  
  // 工具函數
  getToken: () => string | null;
  retry: () => Promise<void>;
  
  // 狀態檢查
  checkHealth: () => void;
  getFriendlyStatus: () => {
    status: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    actions: Array<{ label: string; action: string }>;
  };
  
  // 網路重試
  executeWithRetry: <T>(operation: () => Promise<T>) => Promise<T>;
}

/**
 * LIFF 管理 Hook
 * 提供增強的 LIFF 初始化、使用者驗證和狀態管理功能
 */
export const useLiff = (): UseLiffReturn => {
  const networkStatus = useNetworkStatus();
  const { executeWithRetry } = useNetworkRetry({
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 1.5
  });
  
  const [state, setState] = useState<UseLiffState>({
    initialized: false,
    loggedIn: false,
    profile: null,
    permissions: [],
    isInLineClient: false,
    loading: { isLoading: true, message: '系統初始化中...' },
    error: { hasError: false },
    networkStatus: 'online',
    healthStatus: {
      isHealthy: false,
      issues: [],
      recommendations: [],
    },
    environmentInfo: {
      isInClient: false,
      isLoggedIn: false,
      isInitialized: false,
      networkStatus: 'unknown',
      lastHealthCheck: null,
      initializationAttempts: 0,
      hasError: false,
    },
  });

  /**
   * 更新載入狀態
   */
  const setLoading = useCallback((loading: LoadingState) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  /**
   * 更新錯誤狀態
   */
  const setError = useCallback((error: ErrorState) => {
    setState(prev => ({ ...prev, error, loading: { isLoading: false } }));
  }, []);

  /**
   * 更新 LIFF 狀態
   */
  const updateLiffState = useCallback(() => {
    const liffState = getLiffState();
    const environmentInfo = getLiffEnvironmentInfo();
    const healthStatus = checkLiffHealth();
    
    setState(prev => ({
      ...prev,
      initialized: liffState.initialized,
      loggedIn: liffState.loggedIn,
      profile: liffState.profile,
      permissions: liffState.permissions,
      isInLineClient: isInClient(),
      networkStatus: networkStatus.isOnline ? 
        (networkStatus.isSlowConnection ? 'slow' : 'online') : 'offline',
      healthStatus,
      environmentInfo,
    }));
  }, [networkStatus]);

  /**
   * 初始化 LIFF
   */
  const initialize = useCallback(async () => {
    try {
      setLoading({ isLoading: true, message: 'LIFF 初始化中...' });
      setError({ hasError: false });

      // 檢查網路狀態
      if (!networkStatus.isOnline) {
        throw new Error('網路連線中斷，請檢查網路連線後重試');
      }

      const result = await executeWithRetry(async () => {
        return await initializeLiff();
      });
      
      if (result.success) {
        updateLiffState();
        
        // 如果已登入，檢查權限
        if (result.data?.loggedIn) {
          setLoading({ isLoading: true, message: '檢查使用者權限中...' });
          await checkUserPermissions();
        }
        
        setLoading({ isLoading: false });
        console.log('LIFF 初始化完成');
      } else {
        throw new Error(result.message || 'LIFF 初始化失敗');
      }
    } catch (error) {
      console.error('LIFF 初始化錯誤:', error);
      const errorMessage = (error as Error).message;
      
      setError({
        hasError: true,
        message: errorMessage || '系統初始化失敗，請重新載入頁面',
        code: 'LIFF_INIT_ERROR',
      });
      
      updateLiffState(); // 更新狀態以反映錯誤
    }
  }, [updateLiffState, setLoading, setError, networkStatus.isOnline, executeWithRetry]);

  /**
   * 強制重新初始化 LIFF
   */
  const forceReinitializeCallback = useCallback(async () => {
    try {
      setLoading({ isLoading: true, message: '強制重新初始化中...' });
      setError({ hasError: false });

      const result = await forceReinitialize();
      
      if (result.success) {
        updateLiffState();
        setLoading({ isLoading: false });
        console.log('LIFF 強制重新初始化完成');
      } else {
        throw new Error(result.message || '重新初始化失敗');
      }
    } catch (error) {
      console.error('強制重新初始化錯誤:', error);
      setError({
        hasError: true,
        message: (error as Error).message || '重新初始化失敗',
        code: 'FORCE_REINIT_ERROR',
      });
    }
  }, [updateLiffState, setLoading, setError]);

  /**
   * 執行登入
   */
  const login = useCallback(async () => {
    try {
      setLoading({ isLoading: true, message: '登入中...' });
      setError({ hasError: false });

      const result = await performAutoLogin();
      
      if (!result.success) {
        throw new Error(result.message || '登入失敗');
      }
      
      // 登入成功後更新狀態
      updateLiffState();
      setLoading({ isLoading: false });
      
    } catch (error) {
      console.error('登入錯誤:', error);
      setError({
        hasError: true,
        message: (error as Error).message || '登入失敗，請重試',
        code: 'LOGIN_ERROR',
      });
    }
  }, [updateLiffState, setLoading, setError]);

  /**
   * 檢查登入狀態
   */
  const checkLogin = useCallback((): boolean => {
    const isLoggedIn = checkLoginStatus();
    updateLiffState();
    return isLoggedIn;
  }, [updateLiffState]);

  /**
   * 重新獲取使用者資料
   */
  const refreshProfile = useCallback(async () => {
    try {
      setLoading({ isLoading: true, message: '更新使用者資料中...' });
      
      const result = await getUserProfile();
      
      if (result.success) {
        updateLiffState();
        setLoading({ isLoading: false });
      } else {
        throw new Error(result.message || '獲取使用者資料失敗');
      }
    } catch (error) {
      console.error('更新使用者資料錯誤:', error);
      setError({
        hasError: true,
        message: (error as Error).message || '更新使用者資料失敗',
        code: 'REFRESH_PROFILE_ERROR',
      });
    }
  }, [updateLiffState, setLoading, setError]);

  /**
   * 檢查使用者權限
   */
  const checkUserPermissions = useCallback(async (requiredScopes: string[] = ['profile', 'openid']): Promise<boolean> => {
    try {
      const result = await checkPermissions(requiredScopes);
      updateLiffState();
      
      if (result.success) {
        console.log('權限檢查通過');
        return true;
      } else {
        console.warn('權限檢查失敗:', result.message);
        return false;
      }
    } catch (error) {
      console.error('權限檢查錯誤:', error);
      return false;
    }
  }, [updateLiffState]);

  /**
   * 請求使用者權限
   */
  const requestUserPermissions = useCallback(async (requiredScopes: string[] = ['profile', 'openid']) => {
    try {
      setLoading({ isLoading: true, message: '請求權限中...' });
      
      const result = await requestPermissions(requiredScopes);
      
      if (result.success) {
        // 權限請求可能會導致頁面重新載入，所以這裡可能不會執行到
        updateLiffState();
        setLoading({ isLoading: false });
      } else {
        throw new Error(result.message || '權限請求失敗');
      }
    } catch (error) {
      console.error('權限請求錯誤:', error);
      setError({
        hasError: true,
        message: (error as Error).message || '權限請求失敗',
        code: 'REQUEST_PERMISSIONS_ERROR',
      });
    }
  }, [updateLiffState, setLoading, setError]);

  /**
   * 獲取存取權杖
   */
  const getToken = useCallback((): string | null => {
    return getAccessToken();
  }, []);

  /**
   * 重試操作
   */
  const retry = useCallback(async () => {
    setError({ hasError: false });
    await initialize();
  }, [initialize, setError]);

  /**
   * 檢查健康狀態
   */
  const checkHealth = useCallback(() => {
    updateLiffState();
  }, [updateLiffState]);

  /**
   * 獲取友善狀態訊息
   */
  const getFriendlyStatus = useCallback(() => {
    return getFriendlyStatusMessage();
  }, []);

  /**
   * 初始化效果
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * 監聽網路狀態變化
   */
  useEffect(() => {
    updateLiffState();
  }, [networkStatus, updateLiffState]);

  /**
   * 監聽頁面可見性變化，重新檢查登入狀態
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.initialized) {
        console.log('頁面重新可見，檢查系統狀態');
        checkHealth();
        checkLogin();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.initialized, checkLogin, checkHealth]);

  /**
   * 監聽 LIFF 相關事件
   */
  useEffect(() => {
    if (!state.initialized) return;

    // 監聽登入狀態變化
    const checkLoginPeriodically = setInterval(() => {
      const currentLoginStatus = checkLoginStatus();
      if (currentLoginStatus !== state.loggedIn) {
        console.log('登入狀態變化:', currentLoginStatus);
        updateLiffState();
      }
    }, 5000); // 每 5 秒檢查一次

    return () => {
      clearInterval(checkLoginPeriodically);
    };
  }, [state.initialized, state.loggedIn, updateLiffState]);

  return {
    // 狀態
    ...state,
    
    // 方法
    initialize,
    forceReinitialize: forceReinitializeCallback,
    login,
    checkLogin,
    refreshProfile,
    checkUserPermissions,
    requestUserPermissions,
    getToken,
    retry,
    checkHealth,
    getFriendlyStatus,
    executeWithRetry,
  };
};