import React, { Component, ReactNode } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // This would typically send to an error reporting service like Sentry
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    console.error('Application Error:', errorData);
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContainer}>
            <Alert 
              variant="error" 
              title="系統發生錯誤"
              className={styles.errorAlert}
            >
              <p>很抱歉，系統遇到了一個問題。請嘗試以下解決方案：</p>
              <ul className={styles.solutionList}>
                <li>重新載入頁面</li>
                <li>檢查網路連線</li>
                <li>清除瀏覽器快取</li>
                <li>如果問題持續，請聯絡客服</li>
              </ul>
            </Alert>

            <div className={styles.actionButtons}>
              <Button 
                onClick={this.handleRetry}
                variant="secondary"
                className={styles.retryButton}
              >
                重新嘗試
              </Button>
              <Button 
                onClick={this.handleReload}
                variant="primary"
                className={styles.reloadButton}
              >
                重新載入頁面
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>錯誤詳情 (開發模式)</summary>
                <pre className={styles.errorStack}>
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className={styles.componentStack}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;