import React from 'react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import styles from './ErrorPage.module.css';

interface ErrorPageProps {
  error?: Error;
  statusCode?: number;
  title?: string;
  message?: string;
  showRetry?: boolean;
  showHome?: boolean;
  onRetry?: () => void;
  onHome?: () => void;
  className?: string;
}

const getErrorInfo = (statusCode?: number, error?: Error) => {
  if (statusCode) {
    switch (statusCode) {
      case 404:
        return {
          title: '頁面不存在',
          message: '您要找的頁面不存在，可能已被移除或網址有誤。',
          suggestions: [
            '檢查網址是否正確',
            '返回首頁重新開始',
            '使用瀏覽器的返回按鈕'
          ]
        };
      case 500:
        return {
          title: '伺服器錯誤',
          message: '伺服器發生內部錯誤，請稍後再試。',
          suggestions: [
            '重新載入頁面',
            '檢查網路連線',
            '稍後再試',
            '如果問題持續，請聯絡客服'
          ]
        };
      case 403:
        return {
          title: '存取被拒絕',
          message: '您沒有權限存取此頁面。',
          suggestions: [
            '確認您已登入',
            '檢查您的權限',
            '聯絡管理員'
          ]
        };
      default:
        return {
          title: '發生錯誤',
          message: '系統發生未預期的錯誤。',
          suggestions: [
            '重新載入頁面',
            '檢查網路連線',
            '清除瀏覽器快取'
          ]
        };
    }
  }

  if (error) {
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return {
        title: '網路連線錯誤',
        message: '無法連接到伺服器，請檢查您的網路連線。',
        suggestions: [
          '檢查網路連線',
          '重新載入頁面',
          '嘗試使用其他網路',
          '稍後再試'
        ]
      };
    }

    if (error.message.includes('timeout')) {
      return {
        title: '連線逾時',
        message: '伺服器回應時間過長，請稍後再試。',
        suggestions: [
          '重新載入頁面',
          '檢查網路連線速度',
          '稍後再試'
        ]
      };
    }
  }

  return {
    title: '系統錯誤',
    message: '系統發生未預期的錯誤，請稍後再試。',
    suggestions: [
      '重新載入頁面',
      '檢查網路連線',
      '清除瀏覽器快取',
      '如果問題持續，請聯絡客服'
    ]
  };
};

export const ErrorPage: React.FC<ErrorPageProps> = ({
  error,
  statusCode,
  title,
  message,
  showRetry = true,
  showHome = true,
  onRetry,
  onHome,
  className = ''
}) => {
  const errorInfo = getErrorInfo(statusCode, error);
  const finalTitle = title || errorInfo.title;
  const finalMessage = message || errorInfo.message;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className={`${styles.errorPage} ${className}`}>
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          {statusCode === 404 ? '🔍' : statusCode === 500 ? '⚠️' : '❌'}
        </div>
        
        <h1 className={styles.errorTitle}>{finalTitle}</h1>
        
        <Alert variant="error" className={styles.errorAlert}>
          <p>{finalMessage}</p>
        </Alert>

        <div className={styles.suggestions}>
          <h3>建議解決方案：</h3>
          <ul>
            {errorInfo.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        <div className={styles.actionButtons}>
          {showRetry && (
            <Button 
              onClick={handleRetry}
              variant="primary"
              className={styles.retryButton}
            >
              重新嘗試
            </Button>
          )}
          {showHome && (
            <Button 
              onClick={handleHome}
              variant="secondary"
              className={styles.homeButton}
            >
              返回首頁
            </Button>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className={styles.errorDetails}>
            <summary>錯誤詳情 (開發模式)</summary>
            <div className={styles.errorInfo}>
              <p><strong>錯誤訊息：</strong> {error.message}</p>
              {statusCode && <p><strong>狀態碼：</strong> {statusCode}</p>}
              {error.stack && (
                <div>
                  <strong>堆疊追蹤：</strong>
                  <pre className={styles.errorStack}>{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};