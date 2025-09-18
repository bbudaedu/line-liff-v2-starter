import React from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Alert } from './Alert';
import styles from './NetworkStatus.module.css';

interface NetworkStatusProps {
  showOnlineStatus?: boolean;
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showOnlineStatus = false,
  className = ''
}) => {
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();

  if (isOnline && !showOnlineStatus && !isSlowConnection) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className={`${styles.networkStatus} ${className}`}>
        <Alert variant="error" title="網路連線中斷">
          <p>目前無法連接到網路，請檢查您的網路連線。</p>
          <p>離線時無法進行報名或查詢，請在恢復連線後重試。</p>
        </Alert>
      </div>
    );
  }

  if (isSlowConnection) {
    return (
      <div className={`${styles.networkStatus} ${className}`}>
        <Alert variant="warning" title="網路連線較慢">
          <p>偵測到網路連線速度較慢 ({connectionType})，載入可能需要較長時間。</p>
        </Alert>
      </div>
    );
  }

  if (showOnlineStatus) {
    return (
      <div className={`${styles.networkStatus} ${className}`}>
        <Alert variant="success" title="網路連線正常">
          <p>網路連線狀態良好 ({connectionType})</p>
        </Alert>
      </div>
    );
  }

  return null;
};