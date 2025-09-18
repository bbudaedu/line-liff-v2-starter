import React, { createContext, useContext, useEffect, useState } from 'react';
import { useIdentity, UseIdentityReturn } from '@/hooks/useIdentity';

interface IdentityContextValue extends UseIdentityReturn {
  // 額外的上下文方法
  requireIdentity: () => boolean;
  getIdentityDisplayName: () => string;
  isMonk: boolean;
  isVolunteer: boolean;
}

const IdentityContext = createContext<IdentityContextValue | undefined>(undefined);

interface IdentityProviderProps {
  children: React.ReactNode;
}

export function IdentityProvider({ children }: IdentityProviderProps) {
  const identityHook = useIdentity();
  const [contextReady, setContextReady] = useState(false);

  useEffect(() => {
    // 等待身份狀態初始化完成
    if (!identityHook.isLoading) {
      setContextReady(true);
    }
  }, [identityHook.isLoading]);

  const requireIdentity = (): boolean => {
    return identityHook.hasSelectedIdentity;
  };

  const getIdentityDisplayName = (): string => {
    switch (identityHook.identity) {
      case 'monk':
        return '法師';
      case 'volunteer':
        return '志工';
      default:
        return '未選擇';
    }
  };

  const contextValue: IdentityContextValue = {
    ...identityHook,
    requireIdentity,
    getIdentityDisplayName,
    isMonk: identityHook.identity === 'monk',
    isVolunteer: identityHook.identity === 'volunteer'
  };

  // 在上下文準備好之前顯示載入狀態
  if (!contextReady) {
    return (
      <div className="identity-context-loading">
        <div className="loading-spinner"></div>
        <p>初始化身份系統...</p>
      </div>
    );
  }

  return (
    <IdentityContext.Provider value={contextValue}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentityContext(): IdentityContextValue {
  const context = useContext(IdentityContext);
  
  if (context === undefined) {
    throw new Error('useIdentityContext must be used within an IdentityProvider');
  }
  
  return context;
}

// 高階元件：需要身份驗證的頁面
export function withIdentityRequired<P extends object>(
  Component: React.ComponentType<P>
) {
  return function IdentityRequiredComponent(props: P) {
    const { hasSelectedIdentity, isLoading } = useIdentityContext();
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
      if (!isLoading && !hasSelectedIdentity) {
        setShouldRedirect(true);
        // 重定向到身份選擇頁面
        const currentPath = window.location.pathname;
        const redirectUrl = `/identity?returnTo=${encodeURIComponent(currentPath)}`;
        window.location.href = redirectUrl;
      }
    }, [isLoading, hasSelectedIdentity]);

    if (isLoading) {
      return (
        <div className="identity-loading">
          <div className="loading-spinner"></div>
          <p>檢查身份狀態...</p>
        </div>
      );
    }

    if (shouldRedirect || !hasSelectedIdentity) {
      return (
        <div className="identity-redirect">
          <div className="redirect-message">
            <h2>需要選擇身份</h2>
            <p>正在跳轉到身份選擇頁面...</p>
            <div className="loading-spinner"></div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// 身份守衛元件
interface IdentityGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function IdentityGuard({ 
  children, 
  fallback,
  redirectTo = '/identity'
}: IdentityGuardProps) {
  const { hasSelectedIdentity, isLoading } = useIdentityContext();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasSelectedIdentity) {
      setShouldRedirect(true);
      const currentPath = window.location.pathname;
      const redirectUrl = `${redirectTo}?returnTo=${encodeURIComponent(currentPath)}`;
      
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    }
  }, [isLoading, hasSelectedIdentity, redirectTo]);

  if (isLoading) {
    return (
      <div className="identity-guard-loading">
        <div className="loading-spinner"></div>
        <p>檢查身份狀態...</p>
      </div>
    );
  }

  if (shouldRedirect || !hasSelectedIdentity) {
    return fallback || (
      <div className="identity-guard-redirect">
        <div className="redirect-message">
          <h2>需要選擇身份</h2>
          <p>正在跳轉到身份選擇頁面...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 身份特定內容元件
interface IdentitySpecificProps {
  children: React.ReactNode;
  identity: 'monk' | 'volunteer';
  fallback?: React.ReactNode;
}

export function IdentitySpecific({ 
  children, 
  identity, 
  fallback 
}: IdentitySpecificProps) {
  const { identity: currentIdentity } = useIdentityContext();

  if (currentIdentity === identity) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

// 身份切換元件
interface IdentitySwitcherProps {
  className?: string;
  onIdentityChanged?: (identity: 'monk' | 'volunteer') => void;
}

export function IdentitySwitcher({ 
  className, 
  onIdentityChanged 
}: IdentitySwitcherProps) {
  const { 
    identity, 
    switchIdentity, 
    isLoading, 
    getIdentityDisplayName 
  } = useIdentityContext();

  const handleSwitch = async () => {
    if (isLoading || !identity) return;

    const newIdentity = identity === 'monk' ? 'volunteer' : 'monk';
    
    try {
      await switchIdentity(newIdentity);
      onIdentityChanged?.(newIdentity);
    } catch (error) {
      console.error('Error switching identity:', error);
    }
  };

  if (!identity) {
    return null;
  }

  return (
    <div className={`identity-switcher ${className || ''}`}>
      <div className="current-identity">
        <span className="identity-label">目前身份：</span>
        <span className="identity-value">{getIdentityDisplayName()}</span>
      </div>
      <button 
        onClick={handleSwitch}
        disabled={isLoading}
        className="switch-button"
      >
        {isLoading ? '切換中...' : '切換身份'}
      </button>
    </div>
  );
}