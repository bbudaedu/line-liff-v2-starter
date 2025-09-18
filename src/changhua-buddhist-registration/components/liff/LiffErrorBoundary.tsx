import React, { Component, ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { logError, formatErrorForUI } from '@/utils/error-handling';
import styles from './LiffErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReloadButton?: boolean;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

export class LiffErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 生成錯誤 ID 用於追蹤
    const errorId = `liff-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 記錄錯誤
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'LiffErrorBoundary',
      retryCount: this.retryCount,
      errorId: this.state.errorId,
    });

    // 更新狀態
    this.setState({
      errorInfo,
    });

    // 呼叫自定義錯誤處理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 如果是 LIFF 相關錯誤，嘗試重新初始化
    if (this.isLiffError(error) && this.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  private isLiffError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('liff') ||
      message.includes('line') ||
      message.includes('not in client') ||
      error.name.includes('LIFF')
    );
  }

  private scheduleRetry = () => {
    this.retryCount++;
    console.log(`LIFF 錯誤邊界：安排重試 ${this.retryCount}/${this.maxRetries}`);
    
    // 延遲重試，給系統時間恢復
    setTimeout(() => {
      this.handleRetry();
    }, 2000 * this.retryCount); // 遞增延遲
  };

  private handleRetry = () => {
    console.log('LIFF 錯誤邊界：執行重試');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error || !errorId) return;

    // 準備錯誤報告資料
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
    };

    // 這裡可以發送錯誤報告到錯誤追蹤服務
    console.log('錯誤報告:', errorReport);
    
    // 複製錯誤 ID 到剪貼簿
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorId).then(() => {
        alert(`錯誤 ID 已複製到剪貼簿: ${errorId}\n請提供此 ID 給客服人員以協助解決問題。`);
      }).catch(() => {
        alert(`錯誤 ID: ${errorId}\n請記下此 ID 並提供給客服人員。`);
      });
    } else {
      alert(`錯誤 ID: ${errorId}\n請記下此 ID 並提供給客服人員。`);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;
      const { fallback, showReloadButton = true, showErrorDetails = false } = this.props;

      // 如果提供了自定義 fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 格式化錯誤資訊
      const errorUI = error ? formatErrorForUI(error) : null;
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className={styles.errorBoundary}>
          <Alert 
            variant="error" 
            title={errorUI?.title || 'LIFF 應用程式發生錯誤'}
          >
            <div className={styles.errorContent}>
              <p className={styles.errorMessage}>
                {errorUI?.message || '應用程式遇到未預期的錯誤，請嘗試重新載入頁面。'}
              </p>

              {errorUI?.suggestions && errorUI.suggestions.length > 0 && (
                <div className={styles.suggestions}>
                  <h4>建議解決方案：</h4>
                  <ul>
                    {errorUI.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.actions}>
                {canRetry && (
                  <Button
                    variant="primary"
                    onClick={this.handleRetry}
                    className={styles.retryButton}
                  >
                    重試 ({this.maxRetries - this.retryCount} 次機會)
                  </Button>
                )}
                
                {showReloadButton && (
                  <Button
                    variant={canRetry ? "outline" : "primary"}
                    onClick={this.handleReload}
                    className={styles.reloadButton}
                  >
                    重新載入頁面
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={this.handleReportError}
                  className={styles.reportButton}
                >
                  回報問題
                </Button>
              </div>

              {showErrorDetails && error && (
                <details className={styles.errorDetails}>
                  <summary>技術詳情</summary>
                  <div className={styles.technicalInfo}>
                    {errorId && (
                      <div className={styles.errorId}>
                        <strong>錯誤 ID:</strong> {errorId}
                      </div>
                    )}
                    <div className={styles.errorName}>
                      <strong>錯誤類型:</strong> {error.name}
                    </div>
                    <div className={styles.errorMessage}>
                      <strong>錯誤訊息:</strong> {error.message}
                    </div>
                    <div className={styles.retryInfo}>
                      <strong>重試次數:</strong> {this.retryCount}/{this.maxRetries}
                    </div>
                    {error.stack && (
                      <div className={styles.errorStack}>
                        <strong>錯誤堆疊:</strong>
                        <pre>{error.stack}</pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div className={styles.componentStack}>
                        <strong>元件堆疊:</strong>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className={styles.helpText}>
                <p>
                  如果問題持續發生，請嘗試：
                </p>
                <ul>
                  <li>確認網路連線正常</li>
                  <li>更新 LINE 應用程式到最新版本</li>
                  <li>清除瀏覽器快取</li>
                  <li>重新啟動 LINE 應用程式</li>
                </ul>
              </div>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}