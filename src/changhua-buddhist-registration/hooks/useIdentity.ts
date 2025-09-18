import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, USER_IDENTITY } from '@/utils/constants';
import { storage } from '@/utils/helpers';

export interface IdentityState {
  identity: 'monk' | 'volunteer' | null;
  isFirstVisit: boolean;
  hasSelectedIdentity: boolean;
  isLoading: boolean;
}

export interface IdentityActions {
  setIdentity: (identity: 'monk' | 'volunteer') => Promise<void>;
  clearIdentity: () => void;
  switchIdentity: (newIdentity: 'monk' | 'volunteer') => Promise<void>;
  refreshIdentity: () => void;
}

export interface UseIdentityReturn extends IdentityState, IdentityActions {}

/**
 * 身份管理 Hook
 * 處理使用者身份的儲存、讀取和狀態管理
 */
export function useIdentity(): UseIdentityReturn {
  const [state, setState] = useState<IdentityState>({
    identity: null,
    isFirstVisit: true,
    hasSelectedIdentity: false,
    isLoading: true
  });

  // 初始化身份狀態
  const initializeIdentity = useCallback(() => {
    try {
      const savedIdentity = storage.get<'monk' | 'volunteer'>(STORAGE_KEYS.USER_IDENTITY);
      const hasVisited = storage.get<boolean>('hasVisitedBefore', false);
      
      setState({
        identity: savedIdentity,
        isFirstVisit: !hasVisited,
        hasSelectedIdentity: !!savedIdentity,
        isLoading: false
      });
    } catch (error) {
      console.error('Error initializing identity:', error);
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, []);

  // 設定身份
  const setIdentity = useCallback(async (identity: 'monk' | 'volunteer') => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // 驗證身份值
      if (!Object.values(USER_IDENTITY).includes(identity)) {
        throw new Error('Invalid identity value');
      }
      
      // 儲存到本地儲存
      storage.set(STORAGE_KEYS.USER_IDENTITY, identity);
      storage.set('hasVisitedBefore', true);
      
      // 更新狀態
      setState({
        identity,
        isFirstVisit: false,
        hasSelectedIdentity: true,
        isLoading: false
      });
      
      // 觸發自定義事件，通知其他元件
      window.dispatchEvent(new CustomEvent('identityChanged', {
        detail: { identity }
      }));
      
    } catch (error) {
      console.error('Error setting identity:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // 清除身份
  const clearIdentity = useCallback(() => {
    try {
      storage.remove(STORAGE_KEYS.USER_IDENTITY);
      
      setState({
        identity: null,
        isFirstVisit: false, // 保持已訪問狀態
        hasSelectedIdentity: false,
        isLoading: false
      });
      
      // 觸發自定義事件
      window.dispatchEvent(new CustomEvent('identityChanged', {
        detail: { identity: null }
      }));
      
    } catch (error) {
      console.error('Error clearing identity:', error);
    }
  }, []);

  // 切換身份
  const switchIdentity = useCallback(async (newIdentity: 'monk' | 'volunteer') => {
    if (state.identity === newIdentity) {
      return; // 相同身份，不需要切換
    }
    
    await setIdentity(newIdentity);
  }, [state.identity, setIdentity]);

  // 重新整理身份狀態
  const refreshIdentity = useCallback(() => {
    initializeIdentity();
  }, [initializeIdentity]);

  // 初始化
  useEffect(() => {
    initializeIdentity();
  }, [initializeIdentity]);

  // 監聽儲存變化（跨分頁同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER_IDENTITY) {
        const newIdentity = e.newValue ? JSON.parse(e.newValue) : null;
        setState(prev => ({
          ...prev,
          identity: newIdentity,
          hasSelectedIdentity: !!newIdentity
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    ...state,
    setIdentity,
    clearIdentity,
    switchIdentity,
    refreshIdentity
  };
}

/**
 * 身份驗證 Hook
 * 檢查使用者是否已選擇身份，並提供重定向功能
 */
export function useIdentityGuard(redirectTo?: string) {
  const { identity, hasSelectedIdentity, isLoading } = useIdentity();
  
  useEffect(() => {
    if (!isLoading && !hasSelectedIdentity && redirectTo) {
      // 如果需要重定向且未選擇身份，執行重定向
      window.location.href = redirectTo;
    }
  }, [isLoading, hasSelectedIdentity, redirectTo]);
  
  return {
    identity,
    hasSelectedIdentity,
    isLoading,
    isReady: !isLoading && hasSelectedIdentity
  };
}

/**
 * 身份標籤 Hook
 * 提供身份相關的顯示標籤和樣式
 */
export function useIdentityLabels(identity: 'monk' | 'volunteer' | null) {
  const getIdentityLabel = useCallback((id: 'monk' | 'volunteer' | null): string => {
    switch (id) {
      case USER_IDENTITY.MONK:
        return '法師';
      case USER_IDENTITY.VOLUNTEER:
        return '志工';
      default:
        return '未選擇';
    }
  }, []);

  const getIdentityDescription = useCallback((id: 'monk' | 'volunteer' | null): string => {
    switch (id) {
      case USER_IDENTITY.MONK:
        return '寺院法師報名';
      case USER_IDENTITY.VOLUNTEER:
        return '護持志工報名';
      default:
        return '請選擇身份類型';
    }
  }, []);

  const getIdentityIcon = useCallback((id: 'monk' | 'volunteer' | null): string => {
    switch (id) {
      case USER_IDENTITY.MONK:
        return '🙏';
      case USER_IDENTITY.VOLUNTEER:
        return '🤝';
      default:
        return '👤';
    }
  }, []);

  const getIdentityColor = useCallback((id: 'monk' | 'volunteer' | null): string => {
    switch (id) {
      case USER_IDENTITY.MONK:
        return 'var(--primary-color)';
      case USER_IDENTITY.VOLUNTEER:
        return 'var(--secondary-color)';
      default:
        return 'var(--text-secondary)';
    }
  }, []);

  return {
    label: getIdentityLabel(identity),
    description: getIdentityDescription(identity),
    icon: getIdentityIcon(identity),
    color: getIdentityColor(identity),
    getIdentityLabel,
    getIdentityDescription,
    getIdentityIcon,
    getIdentityColor
  };
}