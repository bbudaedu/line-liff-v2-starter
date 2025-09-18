import React from 'react';
import { useLiff } from '@/hooks/useLiff';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NetworkStatus } from '@/components/ui/NetworkStatus';
import styles from './LiffStatus.module.css';

interface LiffStatusProps {
  showDetailedInfo?: boolean;
  onRetry?: () => void;
  onLogin?: () => void;
  onRequestPermissions?: () => void;
  className?: string;
}

export const LiffStatus: React.FC<LiffStatusProps> = ({
  showDetailedInfo = false,
  onRetry,
  onLogin,
  onRequestPermissions,
  className = ''
}) => {
  const {
    loading,
    error,
    networkStatus,
    healthStatus,
    environmentInfo,
    retry,
    login,
    requestUserPermissions,
    getFriendlyStatus,
    forceReinitialize
  } = useLiff();

  const friendlyStatus = getFriendlyStatus();

  // 處理動作按鈕點擊
  const handleAction = async (action: string) => {
    switch (action) {
      case 'reload':
        window.location.reload();
        break;
      case 'retry':
        if (onRetry) {
          onRetry();
        } else {
          await retry();
        }
        break;
      case 'login':
        if (onLogin) {
          onLogin();
        } else {
          await login();
        }
        break;
      case 'request-permissions':
        if (onRequestPermissions) {
          onRequestPermissions();
        } else {
          await requestUserPermissions();
        }
        break;
      case 'force-reinit':
        await forceReinitialize();
        break;
      case 'check-network':
        // 觸發網路狀態檢查
        window.location.reload();
        break;
      default:
        console.warn('未知的動作:', action);
    }
  };

  // 如果正在載入
  if (loading.isLoading) {
    return (
      <div className={`${styles.liffStatus} ${className}`}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p className={styles.loadingMessage}>{loading.message}</p>
        </div>
      </div>
    );
  }

  // 如果有錯誤
  if (error.hasError) {
    return (
      <div className={`${styles.liffStatus} ${className}`}>
        <Alert variant="error" title={friendlyStatus.title}>
          <p>{friendlyStatus.message}</p>
          
          {friendlyStatus.actions.length > 0 && (
            <div className={styles.actionButtons}>
              {friendlyStatus.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="small"
                  onClick={() => handleAction(action.action)}
                  className={styles.actionButton}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {showDetailedInfo && error.code && (
            <details className={styles.errorDetails}>
              <summary>技術詳情</summary>
              <p><strong>錯誤代碼:</strong> {error.code}</p>
              <p><strong>錯誤訊息:</strong> {error.message}</p>
              {environmentInfo.hasError && environmentInfo.errorMessage && (
                <p><strong>系統錯誤:</strong> {environmentInfo.errorMessage}</p>
              )}
            </details>
          )}
        </Alert>
        
        <NetworkStatus className={styles.networkStatus} />
      </div>
    );
  }

  // 如果系統不健康
  if (!healthStatus.isHealthy) {
    const variant = friendlyStatus.status === 'error' ? 'error' : 
                   friendlyStatus.status === 'warning' ? 'warning' : 'info';
    
    return (
      <div className={`${styles.liffStatus} ${className}`}>
        <Alert variant={variant} title={friendlyStatus.title}>
          <p>{friendlyStatus.message}</p>
          
          {healthStatus.recommendations.length > 0 && (
            <div className={styles.recommendations}>
              <h4>建議解決方案：</h4>
              <ul>
                {healthStatus.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          )}
          
          {friendlyStatus.actions.length > 0 && (
            <div className={styles.actionButtons}>
              {friendlyStatus.actions.map((action, index) => (
                <Button
                  key={index}
                  variant={variant === 'error' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => handleAction(action.action)}
                  className={styles.actionButton}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {showDetailedInfo && (
            <details className={styles.healthDetails}>
              <summary>系統狀態詳情</summary>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>初始化狀態:</span>
                  <span className={environmentInfo.isInitialized ? styles.statusSuccess : styles.statusError}>
                    {environmentInfo.isInitialized ? '已初始化' : '未初始化'}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>登入狀態:</span>
                  <span className={environmentInfo.isLoggedIn ? styles.statusSuccess : styles.statusWarning}>
                    {environmentInfo.isLoggedIn ? '已登入' : '未登入'}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>客戶端環境:</span>
                  <span className={environmentInfo.isInClient ? styles.statusSuccess : styles.statusInfo}>
                    {environmentInfo.isInClient ? 'LINE 應用程式' : '外部瀏覽器'}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>網路狀態:</span>
                  <span className={
                    networkStatus === 'online' ? styles.statusSuccess :
                    networkStatus === 'slow' ? styles.statusWarning : styles.statusError
                  }>
                    {networkStatus === 'online' ? '正常' :
                     networkStatus === 'slow' ? '較慢' : '離線'}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>初始化嘗試:</span>
                  <span>{environmentInfo.initializationAttempts} 次</span>
                </div>
                {environmentInfo.lastHealthCheck && (
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>最後檢查:</span>
                    <span>{environmentInfo.lastHealthCheck.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              
              {healthStatus.issues.length > 0 && (
                <div className={styles.issuesList}>
                  <h5>發現的問題：</h5>
                  <ul>
                    {healthStatus.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </details>
          )}
        </Alert>
        
        <NetworkStatus className={styles.networkStatus} />
      </div>
    );
  }

  // 系統正常，顯示成功狀態（如果需要）
  if (friendlyStatus.status === 'success' && showDetailedInfo) {
    return (
      <div className={`${styles.liffStatus} ${className}`}>
        <Alert variant="success" title={friendlyStatus.title}>
          <p>{friendlyStatus.message}</p>
        </Alert>
      </div>
    );
  }

  // 系統正常且不需要顯示詳細資訊，不渲染任何內容
  return null;
};