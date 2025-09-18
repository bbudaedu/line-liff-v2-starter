import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import styles from './OfflineDetector.module.css';

interface OfflineDetectorProps {
  onRetry?: () => void;
  showConnectionType?: boolean;
  className?: string;
}

export const OfflineDetector: React.FC<OfflineDetectorProps> = ({
  onRetry,
  showConnectionType = false,
  className = ''
}) => {
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnectedMessage, setShowReconnectedMessage] = useState(false);

  // 追蹤離線狀態變化
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnectedMessage(false);
    } else if (wasOffline && isOnline) {
      // 從離線恢復到線上
      setShowReconnectedMessage(true);
      setWasOffline(false);
      
      // 3秒後隱藏重新連線訊息
      const timer = setTimeout(() => {
        setShowReconnectedMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // 處理重試
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // 預設重試行為：重新載入頁面
      window.location.reload();
    }
  };

  // 獲取連線狀態描述
  const getConnectionDescription = () => {
    if (!isOnline) {
      return '網路連線中斷';
    }
    
    if (isSlowConnection) {
      return `網路連線較慢 (${connectionType})`;
    }
    
    if (showConnectionType) {
      return `網路連線正常 (${connectionType})`;
    }
    
    return '網路連線正常';
  };

  // 獲取建議訊息
  const getSuggestions = () => {
    if (!isOnline) {
      return [
        '檢查您的 Wi-Fi 或行動數據連線',
        '確認您的裝置未開啟飛航模式',
        '嘗試移動到訊號較好的位置',
        '重新啟動您的網路連線'
      ];
    }
    
    if (isSlowConnection) {
      return [
        '請耐心等待頁面載入完成',
        '避免同時開啟多個應用程式',
        '考慮切換到更快的網路環境',
        '如果可能，請使用 Wi-Fi 連線'
      ];
    }
    
    return [];
  };

  // 如果網路正常且沒有重新連線訊息，不顯示任何內容
  if (isOnline && !isSlowConnection && !showReconnectedMessage) {
    return null;
  }

  // 顯示重新連線成功訊息
  if (showReconnectedMessage) {
    return (
      <div className={`${styles.offlineDetector} ${className}`}>
        <Alert variant="success" title="網路連線已恢復">
          <p>您的網路連線已恢復正常，可以繼續使用應用程式。</p>
          <Button
            variant="outline"
            size="small"
            onClick={() => setShowReconnectedMessage(false)}
            className={styles.dismissButton}
          >
            知道了
          </Button>
        </Alert>
      </div>
    );
  }

  // 顯示離線或慢速連線警告
  const variant = !isOnline ? 'error' : 'warning';
  const title = getConnectionDescription();
  const suggestions = getSuggestions();

  return (
    <div className={`${styles.offlineDetector} ${className}`}>
      <Alert variant={variant} title={title}>
        <div className={styles.content}>
          {!isOnline ? (
            <p>目前無法連接到網路，部分功能可能無法正常使用。</p>
          ) : (
            <p>偵測到網路連線速度較慢，載入時間可能會較長。</p>
          )}
          
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <h4>建議解決方案：</h4>
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className={styles.actions}>
            <Button
              variant={!isOnline ? 'primary' : 'outline'}
              size="small"
              onClick={handleRetry}
              className={styles.retryButton}
            >
              {!isOnline ? '重新檢查連線' : '重新載入'}
            </Button>
            
            {!isOnline && (
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  // 嘗試開啟網路設定（僅在支援的裝置上）
                  if ('navigator' in window && 'connection' in navigator) {
                    // 這裡可以添加開啟網路設定的邏輯
                    alert('請前往裝置設定檢查網路連線');
                  }
                }}
                className={styles.settingsButton}
              >
                網路設定
              </Button>
            )}
          </div>
          
          {showConnectionType && (
            <div className={styles.technicalInfo}>
              <details>
                <summary>技術資訊</summary>
                <div className={styles.techDetails}>
                  <p><strong>連線類型:</strong> {connectionType}</p>
                  <p><strong>線上狀態:</strong> {isOnline ? '是' : '否'}</p>
                  <p><strong>慢速連線:</strong> {isSlowConnection ? '是' : '否'}</p>
                  <p><strong>檢查時間:</strong> {new Date().toLocaleTimeString()}</p>
                </div>
              </details>
            </div>
          )}
        </div>
      </Alert>
    </div>
  );
};