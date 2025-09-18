import liff from '@line/liff';
import { LiffProfile, ApiResponse } from '@/types';
import { createAppError, isNetworkError, logError } from '@/utils/error-handling';

// LIFF 配置
const LIFF_CONFIG = {
  liffId: process.env.NEXT_PUBLIC_LIFF_ID || '',
  retryAttempts: 5,
  retryDelay: 1000, // 1 秒
  backoffMultiplier: 1.5,
  maxRetryDelay: 10000, // 最大重試延遲 10 秒
  permissionRetryAttempts: 2,
  healthCheckInterval: 30000, // 30 秒健康檢查間隔
};

// LIFF 初始化狀態
interface LiffState {
  initialized: boolean;
  loggedIn: boolean;
  profile: LiffProfile | null;
  permissions: string[];
  isInClient: boolean;
  networkStatus: 'online' | 'offline' | 'slow';
  lastHealthCheck: Date | null;
  initializationAttempts: number;
  lastError: Error | null;
}

let liffState: LiffState = {
  initialized: false,
  loggedIn: false,
  profile: null,
  permissions: [],
  isInClient: false,
  networkStatus: 'online',
  lastHealthCheck: null,
  initializationAttempts: 0,
  lastError: null,
};

// 健康檢查定時器
let healthCheckTimer: NodeJS.Timeout | null = null;

// 重置狀態函數（用於測試）
export const resetLiffState = (): void => {
  liffState = {
    initialized: false,
    loggedIn: false,
    profile: null,
    permissions: [],
    isInClient: false,
    networkStatus: 'online',
    lastHealthCheck: null,
    initializationAttempts: 0,
    lastError: null,
  };
  
  // 清除健康檢查定時器
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
};

/**
 * 檢查網路連線狀態
 */
const checkNetworkStatus = (): 'online' | 'offline' | 'slow' => {
  if (typeof navigator === 'undefined') return 'online';
  
  if (!navigator.onLine) {
    return 'offline';
  }
  
  // 檢查連線速度
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType;
    
    if (['slow-2g', '2g'].includes(effectiveType)) {
      return 'slow';
    }
  }
  
  return 'online';
};

/**
 * 計算重試延遲時間（指數退避）
 */
const calculateRetryDelay = (attempt: number): number => {
  const delay = LIFF_CONFIG.retryDelay * Math.pow(LIFF_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, LIFF_CONFIG.maxRetryDelay);
};

/**
 * LIFF SDK 初始化
 * 包含增強的錯誤處理和重試機制
 */
export const initializeLiff = async (): Promise<ApiResponse<LiffState>> => {
  let lastError: Error | null = null;
  
  // 更新初始化嘗試次數
  liffState.initializationAttempts++;
  
  // 檢查網路狀態
  liffState.networkStatus = checkNetworkStatus();
  
  if (liffState.networkStatus === 'offline') {
    const error = createAppError(
      '網路連線中斷，無法初始化 LIFF',
      'NETWORK_OFFLINE',
      0,
      { networkStatus: liffState.networkStatus }
    );
    liffState.lastError = error;
    logError(error);
    
    return {
      success: false,
      message: '網路連線中斷，請檢查網路連線後重試',
      code: 'NETWORK_OFFLINE',
      timestamp: new Date().toISOString(),
    };
  }
  
  for (let attempt = 1; attempt <= LIFF_CONFIG.retryAttempts; attempt++) {
    try {
      console.log(`LIFF 初始化嘗試 ${attempt}/${LIFF_CONFIG.retryAttempts}`);
      
      // 檢查 LIFF ID 是否存在
      if (!LIFF_CONFIG.liffId) {
        const error = createAppError(
          'LIFF_ID 未設定，請檢查環境變數配置',
          'LIFF_ID_MISSING',
          400,
          { liffId: LIFF_CONFIG.liffId }
        );
        throw error;
      }
      
      // 檢查是否在支援的環境中
      if (typeof window === 'undefined') {
        const error = createAppError(
          'LIFF 只能在瀏覽器環境中初始化',
          'INVALID_ENVIRONMENT',
          400
        );
        throw error;
      }
      
      // 初始化 LIFF
      await liff.init({ 
        liffId: LIFF_CONFIG.liffId,
        withLoginOnExternalBrowser: true // 允許外部瀏覽器登入
      });
      
      // 更新初始化狀態
      liffState.initialized = true;
      liffState.loggedIn = liff.isLoggedIn();
      liffState.isInClient = liff.isInClient();
      liffState.lastHealthCheck = new Date();
      liffState.lastError = null;
      
      console.log('LIFF 初始化成功');
      console.log('登入狀態:', liffState.loggedIn);
      console.log('客戶端環境:', liffState.isInClient);
      
      // 如果已登入，獲取使用者資料和權限
      if (liffState.loggedIn) {
        await updateUserProfile();
        await updateUserPermissions();
      }
      
      // 啟動健康檢查
      startHealthCheck();
      
      return {
        success: true,
        data: { ...liffState },
        message: 'LIFF 初始化成功',
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      lastError = error as Error;
      liffState.lastError = lastError;
      
      const appError = createAppError(
        lastError.message,
        'LIFF_INIT_ERROR',
        undefined,
        { 
          attempt,
          maxAttempts: LIFF_CONFIG.retryAttempts,
          networkStatus: liffState.networkStatus,
          isInClient: liffState.isInClient
        }
      );
      
      logError(appError);
      console.error(`LIFF 初始化失敗 (嘗試 ${attempt}):`, error);
      
      // 檢查是否為網路錯誤
      if (isNetworkError(lastError) && attempt < LIFF_CONFIG.retryAttempts) {
        const retryDelay = calculateRetryDelay(attempt);
        console.log(`網路錯誤，等待 ${retryDelay}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // 重新檢查網路狀態
        liffState.networkStatus = checkNetworkStatus();
        if (liffState.networkStatus === 'offline') {
          break; // 如果網路斷線，停止重試
        }
        continue;
      }
      
      // 如果不是最後一次嘗試且不是致命錯誤，等待後重試
      if (attempt < LIFF_CONFIG.retryAttempts && !isFatalError(lastError)) {
        const retryDelay = calculateRetryDelay(attempt);
        console.log(`等待 ${retryDelay}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        break; // 致命錯誤或最後一次嘗試，停止重試
      }
    }
  }
  
  // 所有重試都失敗
  const errorMessage = getInitializationErrorMessage(lastError);
  
  return {
    success: false,
    message: errorMessage,
    code: lastError?.name || 'LIFF_INIT_FAILED',
    timestamp: new Date().toISOString(),
  };
};

/**
 * 使用者登入狀態檢查
 */
export const checkLoginStatus = (): boolean => {
  if (!liffState.initialized) {
    console.warn('LIFF 尚未初始化');
    return false;
  }
  
  try {
    const isLoggedIn = liff.isLoggedIn();
    liffState.loggedIn = isLoggedIn;
    
    console.log('登入狀態檢查:', isLoggedIn);
    return isLoggedIn;
  } catch (error) {
    console.error('檢查登入狀態失敗:', error);
    return false;
  }
};

/**
 * 自動登入流程
 */
export const performAutoLogin = async (): Promise<ApiResponse<LiffProfile>> => {
  try {
    if (!liffState.initialized) {
      throw new Error('LIFF 尚未初始化');
    }
    
    if (liffState.loggedIn && liffState.profile) {
      console.log('使用者已登入');
      return {
        success: true,
        data: liffState.profile,
        message: '使用者已登入',
        timestamp: new Date().toISOString(),
      };
    }
    
    console.log('開始自動登入流程...');
    
    // 執行登入
    liff.login();
    
    // 注意：liff.login() 會重新導向，所以這裡不會執行到
    return {
      success: true,
      message: '正在重新導向至登入頁面',
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('自動登入失敗:', error);
    return {
      success: false,
      message: `自動登入失敗: ${(error as Error).message}`,
      code: 'AUTO_LOGIN_FAILED',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * 獲取使用者資料
 */
export const getUserProfile = async (): Promise<ApiResponse<LiffProfile>> => {
  try {
    if (!liffState.initialized) {
      throw new Error('LIFF 尚未初始化');
    }
    
    if (!liffState.loggedIn) {
      throw new Error('使用者尚未登入');
    }
    
    const profile = await liff.getProfile();
    
    const liffProfile: LiffProfile = {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
    
    // 更新狀態
    liffState.profile = liffProfile;
    
    console.log('使用者資料獲取成功:', liffProfile);
    
    return {
      success: true,
      data: liffProfile,
      message: '使用者資料獲取成功',
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('獲取使用者資料失敗:', error);
    return {
      success: false,
      message: `獲取使用者資料失敗: ${(error as Error).message}`,
      code: 'GET_PROFILE_FAILED',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * 檢查是否為致命錯誤（不應重試）
 */
const isFatalError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  const name = error.name;
  
  return (
    message.includes('liff_id') ||
    message.includes('invalid liff id') ||
    message.includes('unauthorized') ||
    name === 'LIFF_ID_MISSING' ||
    name === 'INVALID_ENVIRONMENT'
  );
};

/**
 * 獲取初始化錯誤的友善訊息
 */
const getInitializationErrorMessage = (error: Error | null): string => {
  if (!error) return 'LIFF 初始化失敗，請重試';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('liff_id') || message.includes('invalid liff id')) {
    return 'LIFF 應用程式配置錯誤，請聯絡客服';
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return '網路連線問題，請檢查網路後重試';
  }
  
  if (message.includes('timeout')) {
    return '連線逾時，請稍後再試';
  }
  
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return '應用程式權限不足，請重新開啟';
  }
  
  return `初始化失敗：${error.message}`;
};

/**
 * 啟動健康檢查
 */
const startHealthCheck = (): void => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  
  healthCheckTimer = setInterval(() => {
    performHealthCheck();
  }, LIFF_CONFIG.healthCheckInterval);
};

/**
 * 執行健康檢查
 */
const performHealthCheck = (): void => {
  try {
    if (!liffState.initialized) return;
    
    // 檢查網路狀態
    const currentNetworkStatus = checkNetworkStatus();
    if (currentNetworkStatus !== liffState.networkStatus) {
      console.log('網路狀態變化:', liffState.networkStatus, '->', currentNetworkStatus);
      liffState.networkStatus = currentNetworkStatus;
    }
    
    // 檢查登入狀態
    const currentLoginStatus = liff.isLoggedIn();
    if (currentLoginStatus !== liffState.loggedIn) {
      console.log('登入狀態變化:', liffState.loggedIn, '->', currentLoginStatus);
      liffState.loggedIn = currentLoginStatus;
      
      if (currentLoginStatus) {
        // 重新獲取使用者資料
        updateUserProfile();
        updateUserPermissions();
      } else {
        // 清除使用者資料
        liffState.profile = null;
        liffState.permissions = [];
      }
    }
    
    liffState.lastHealthCheck = new Date();
    
  } catch (error) {
    console.error('健康檢查失敗:', error);
    liffState.lastError = error as Error;
  }
};

/**
 * 增強的權限檢查
 */
export const checkPermissions = async (requiredScopes: string[] = ['profile', 'openid']): Promise<ApiResponse<string[]>> => {
  try {
    if (!liffState.initialized) {
      const error = createAppError('LIFF 尚未初始化', 'LIFF_NOT_INITIALIZED');
      throw error;
    }
    
    if (!liffState.loggedIn) {
      const error = createAppError('使用者尚未登入', 'USER_NOT_LOGGED_IN');
      throw error;
    }
    
    // 檢查網路狀態
    if (liffState.networkStatus === 'offline') {
      const error = createAppError('網路連線中斷，無法檢查權限', 'NETWORK_OFFLINE');
      throw error;
    }
    
    // 獲取已授權的權限
    const grantedScopes = liff.getPermissionGrantedAll();
    
    // 檢查缺少的權限
    const missingScopes = requiredScopes.filter(
      scope => !grantedScopes.includes(scope)
    );
    
    console.log('權限檢查結果:', {
      granted: grantedScopes,
      required: requiredScopes,
      missing: missingScopes
    });
    
    // 更新狀態
    liffState.permissions = grantedScopes;
    
    if (missingScopes.length > 0) {
      const error = createAppError(
        `缺少必要權限: ${missingScopes.join(', ')}`,
        'MISSING_PERMISSIONS',
        403,
        { grantedScopes, requiredScopes, missingScopes }
      );
      
      return {
        success: false,
        data: grantedScopes,
        message: error.message,
        code: 'MISSING_PERMISSIONS',
        timestamp: new Date().toISOString(),
      };
    }
    
    return {
      success: true,
      data: grantedScopes,
      message: '權限檢查通過',
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    const appError = error as Error;
    logError(appError, { requiredScopes });
    
    return {
      success: false,
      message: `權限檢查失敗: ${appError.message}`,
      code: appError.name || 'PERMISSION_CHECK_FAILED',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * 增強的權限請求
 */
export const requestPermissions = async (requiredScopes: string[] = ['profile', 'openid']): Promise<ApiResponse<string[]>> => {
  let retryCount = 0;
  
  const attemptPermissionRequest = async (): Promise<ApiResponse<string[]>> => {
    try {
      if (!liffState.initialized) {
        const error = createAppError('LIFF 尚未初始化', 'LIFF_NOT_INITIALIZED');
        throw error;
      }
      
      if (!liffState.loggedIn) {
        const error = createAppError('使用者尚未登入', 'USER_NOT_LOGGED_IN');
        throw error;
      }
      
      // 檢查網路狀態
      if (liffState.networkStatus === 'offline') {
        const error = createAppError('網路連線中斷，無法請求權限', 'NETWORK_OFFLINE');
        throw error;
      }
      
      console.log('請求權限:', requiredScopes);
      
      // 先檢查當前權限狀態
      const currentPermissions = liff.getPermissionGrantedAll();
      const missingScopes = requiredScopes.filter(
        scope => !currentPermissions.includes(scope)
      );
      
      if (missingScopes.length === 0) {
        // 所有權限都已授權
        liffState.permissions = currentPermissions;
        return {
          success: true,
          data: currentPermissions,
          message: '所有權限都已授權',
          timestamp: new Date().toISOString(),
        };
      }
      
      console.log('需要請求的權限:', missingScopes);
      
      // 檢查是否在 LINE 客戶端中
      if (!liffState.isInClient) {
        console.warn('不在 LINE 客戶端中，權限請求可能無法正常運作');
      }
      
      // 請求權限
      liff.requestPermissionGrantedAll(requiredScopes);
      
      // 注意：requestPermissionGrantedAll 可能會重新導向，所以這裡可能不會執行到
      return {
        success: true,
        message: '正在請求權限，請稍候...',
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      const appError = error as Error;
      logError(appError, { requiredScopes, retryCount });
      
      // 如果是網路錯誤且還有重試次數，則重試
      if (isNetworkError(appError) && retryCount < LIFF_CONFIG.permissionRetryAttempts) {
        retryCount++;
        console.log(`權限請求失敗，重試 ${retryCount}/${LIFF_CONFIG.permissionRetryAttempts}`);
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, LIFF_CONFIG.retryDelay));
        
        // 重新檢查網路狀態
        liffState.networkStatus = checkNetworkStatus();
        if (liffState.networkStatus !== 'offline') {
          return attemptPermissionRequest();
        }
      }
      
      return {
        success: false,
        message: `請求權限失敗: ${appError.message}`,
        code: appError.name || 'REQUEST_PERMISSIONS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  };
  
  return attemptPermissionRequest();
};

/**
 * 獲取存取權杖
 */
export const getAccessToken = (): string | null => {
  try {
    if (!liffState.initialized || !liffState.loggedIn) {
      return null;
    }
    
    return liff.getAccessToken();
  } catch (error) {
    console.error('獲取存取權杖失敗:', error);
    return null;
  }
};

/**
 * 登出
 */
export const logout = (): void => {
  try {
    if (liffState.initialized && liffState.loggedIn) {
      liff.logout();
      
      // 重置狀態
      liffState.loggedIn = false;
      liffState.profile = null;
      liffState.permissions = [];
      
      console.log('使用者已登出');
    }
  } catch (error) {
    console.error('登出失敗:', error);
  }
};

/**
 * 獲取當前 LIFF 狀態
 */
export const getLiffState = (): LiffState => {
  return { ...liffState };
};

/**
 * 檢查是否在 LINE 應用程式中
 */
export const isInClient = (): boolean => {
  try {
    return liffState.initialized ? liff.isInClient() : false;
  } catch (error) {
    console.error('檢查客戶端環境失敗:', error);
    return false;
  }
};

/**
 * 關閉 LIFF 視窗
 */
export const closeLiffWindow = (): void => {
  try {
    if (liffState.initialized && isInClient()) {
      liff.closeWindow();
    }
  } catch (error) {
    console.error('關閉視窗失敗:', error);
  }
};

/**
 * 獲取 LIFF 環境資訊
 */
export const getLiffEnvironmentInfo = (): {
  isInClient: boolean;
  isLoggedIn: boolean;
  isInitialized: boolean;
  networkStatus: string;
  lastHealthCheck: Date | null;
  initializationAttempts: number;
  hasError: boolean;
  errorMessage?: string;
} => {
  return {
    isInClient: liffState.isInClient,
    isLoggedIn: liffState.loggedIn,
    isInitialized: liffState.initialized,
    networkStatus: liffState.networkStatus,
    lastHealthCheck: liffState.lastHealthCheck,
    initializationAttempts: liffState.initializationAttempts,
    hasError: liffState.lastError !== null,
    errorMessage: liffState.lastError?.message,
  };
};

/**
 * 強制重新初始化 LIFF
 */
export const forceReinitialize = async (): Promise<ApiResponse<LiffState>> => {
  console.log('強制重新初始化 LIFF...');
  
  // 重置狀態
  resetLiffState();
  
  // 重新初始化
  return await initializeLiff();
};

/**
 * 檢查 LIFF 是否健康
 */
export const checkLiffHealth = (): {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // 檢查初始化狀態
  if (!liffState.initialized) {
    issues.push('LIFF 尚未初始化');
    recommendations.push('重新載入頁面或點擊重試');
  }
  
  // 檢查網路狀態
  if (liffState.networkStatus === 'offline') {
    issues.push('網路連線中斷');
    recommendations.push('檢查網路連線');
  } else if (liffState.networkStatus === 'slow') {
    issues.push('網路連線速度較慢');
    recommendations.push('等待載入完成或切換到更好的網路環境');
  }
  
  // 檢查登入狀態
  if (liffState.initialized && !liffState.loggedIn) {
    issues.push('使用者尚未登入');
    recommendations.push('點擊登入按鈕');
  }
  
  // 檢查權限
  if (liffState.loggedIn && liffState.permissions.length === 0) {
    issues.push('尚未獲取使用者權限');
    recommendations.push('允許應用程式存取您的基本資料');
  }
  
  // 檢查健康檢查時間
  if (liffState.lastHealthCheck) {
    const timeSinceLastCheck = Date.now() - liffState.lastHealthCheck.getTime();
    if (timeSinceLastCheck > LIFF_CONFIG.healthCheckInterval * 2) {
      issues.push('健康檢查逾時');
      recommendations.push('重新載入頁面');
    }
  }
  
  // 檢查錯誤狀態
  if (liffState.lastError) {
    issues.push(`系統錯誤: ${liffState.lastError.message}`);
    recommendations.push('重新載入頁面或聯絡客服');
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations,
  };
};

/**
 * 獲取友善的狀態訊息
 */
export const getFriendlyStatusMessage = (): {
  status: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  actions: Array<{ label: string; action: string }>;
} => {
  const health = checkLiffHealth();
  
  if (health.isHealthy && liffState.loggedIn) {
    return {
      status: 'success',
      title: '系統運作正常',
      message: '您已成功登入，可以開始使用報名功能',
      actions: [],
    };
  }
  
  if (!liffState.initialized) {
    return {
      status: 'error',
      title: '系統初始化中',
      message: '正在初始化 LINE 應用程式，請稍候...',
      actions: [
        { label: '重新載入', action: 'reload' },
        { label: '重試', action: 'retry' }
      ],
    };
  }
  
  if (liffState.networkStatus === 'offline') {
    return {
      status: 'error',
      title: '網路連線中斷',
      message: '請檢查您的網路連線後重試',
      actions: [
        { label: '重新檢查', action: 'check-network' },
        { label: '重新載入', action: 'reload' }
      ],
    };
  }
  
  if (!liffState.loggedIn) {
    return {
      status: 'warning',
      title: '需要登入',
      message: '請登入您的 LINE 帳號以使用報名功能',
      actions: [
        { label: '登入', action: 'login' }
      ],
    };
  }
  
  if (liffState.permissions.length === 0) {
    return {
      status: 'warning',
      title: '需要權限',
      message: '請允許應用程式存取您的基本資料',
      actions: [
        { label: '授權', action: 'request-permissions' }
      ],
    };
  }
  
  return {
    status: 'info',
    title: '系統檢查中',
    message: '正在檢查系統狀態...',
    actions: [],
  };
};

// 內部輔助函數

/**
 * 更新使用者資料
 */
const updateUserProfile = async (): Promise<void> => {
  try {
    const profileResult = await getUserProfile();
    if (profileResult.success && profileResult.data) {
      liffState.profile = profileResult.data;
    }
  } catch (error) {
    console.error('更新使用者資料失敗:', error);
  }
};

/**
 * 更新使用者權限
 */
const updateUserPermissions = async (): Promise<void> => {
  try {
    const permissionResult = await checkPermissions();
    if (permissionResult.success && permissionResult.data) {
      liffState.permissions = permissionResult.data;
    }
  } catch (error) {
    console.error('更新使用者權限失敗:', error);
  }
};

/**
 * 清理資源
 */
export const cleanup = (): void => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  resetLiffState();
};