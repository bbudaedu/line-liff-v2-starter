import React, { useState, useCallback, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import styles from './RetryWrapper.module.css';

interface RetryWrapperProps {
  children: ReactNode;
  onRetry: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
  showRetryButton?: boolean;
  errorMessage?: string;
  className?: string;
  hasError?: boolean; // For testing purposes
}

export const RetryWrapper: React.FC<RetryWrapperProps> = ({
  children,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  showRetryButton = true,
  errorMessage = '操作失敗，請重試',
  className = '',
  hasError: propHasError = false
}) => {
  const [hasError, setHasError] = useState(propHasError);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const handleRetry = useCallback(async () => {
    try {
      setHasError(false);
      setIsRetrying(true);
      setLastError(null);
      
      await onRetry();
      
      setIsRetrying(false);
      setRetryCount(0);
    } catch (error) {
      setHasError(true);
      setIsRetrying(false);
      setLastError(error as Error);
      setRetryCount(prev => prev + 1);
      console.error('Retry failed:', error);
    }
  }, [onRetry]);

  const handleManualRetry = () => {
    handleRetry();
  };

  if (isLoading || isRetrying) {
    return (
      <div className={`${styles.retryWrapper} ${className}`}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
          <p className={styles.loadingText}>
            {isRetrying ? `重試中... (第 ${retryCount} 次)` : '載入中...'}
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${styles.retryWrapper} ${className}`}>
        <div className={styles.errorContainer}>
          <Alert variant="error" title="操作失敗">
            <p>{lastError?.message || errorMessage}</p>
            {retryCount > 0 && (
              <p className={styles.retryInfo}>
                已自動重試 {retryCount} 次
              </p>
            )}
          </Alert>
          
          {showRetryButton && (
            <div className={styles.retryActions}>
              <Button 
                onClick={handleManualRetry}
                variant="primary"
                className={styles.retryButton}
              >
                重新嘗試
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};