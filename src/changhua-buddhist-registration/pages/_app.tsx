import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import { useLiff } from '@/hooks/useLiff';
import { IdentityProvider } from '@/contexts/IdentityContext';
import { RegistrationFlowProvider } from '@/contexts/RegistrationFlowContext';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LiffErrorBoundary } from '@/components/liff/LiffErrorBoundary';
import { LiffStatus } from '@/components/liff/LiffStatus';
import { OfflineDetector } from '@/components/liff/OfflineDetector';
import { performanceIntegration } from '@/lib/performance-integration';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const {
    initialized,
    loggedIn,
    profile,
    loading,
    error,
    isInLineClient,
    networkStatus,
    healthStatus,
    login,
    retry,
    getFriendlyStatus
  } = useLiff();

  // 初始化效能優化系統
  useEffect(() => {
    performanceIntegration.initialize().catch(console.error);
  }, []);

  // 監聽路由變化，觸發頁面優化
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      performanceIntegration.optimizePage(url).catch(console.error);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    // 初始頁面優化
    if (router.isReady) {
      handleRouteChange(router.pathname);
    }

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // 使用增強的 LIFF 狀態組件來處理載入、錯誤和未登入狀態
  const friendlyStatus = getFriendlyStatus();
  const shouldShowApp = initialized && loggedIn && healthStatus.isHealthy;

  // 如果系統未準備好，顯示狀態頁面
  if (!shouldShowApp) {
    return (
      <>
        <Head>
          <title>
            {loading.isLoading ? '載入中' : 
             error.hasError ? '系統錯誤' : 
             !loggedIn ? '登入' : '系統狀態'} - 彰化供佛齋僧活動報名系統
          </title>
          <meta name="description" content="彰化供佛齋僧活動報名系統 - LINE LIFF Mini-App" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <div className="app-container">
          <LiffErrorBoundary showErrorDetails={process.env.NODE_ENV === 'development'}>
            <div className="status-page">
              <div className="status-header">
                <h1 className="status-title traditional-font">彰化供佛齋僧活動</h1>
                <p className="status-subtitle rounded-font">報名系統</p>
              </div>
              
              <OfflineDetector showConnectionType={process.env.NODE_ENV === 'development'} />
              <LiffStatus 
                showDetailedInfo={process.env.NODE_ENV === 'development'}
                onRetry={retry}
                onLogin={login}
              />
              
              {!isInLineClient && initialized && (
                <div className="client-info">
                  <p className="client-note rounded-font">
                    💡 建議在 LINE 應用程式中開啟以獲得最佳體驗
                  </p>
                </div>
              )}
            </div>
          </LiffErrorBoundary>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="彰化供佛齋僧活動報名系統 - LINE LIFF Mini-App" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* 佛教風格的主題色彩 */}
        <meta name="theme-color" content="#D4AF37" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Open Graph 標籤 */}
        <meta property="og:title" content="彰化供佛齋僧活動報名系統" />
        <meta property="og:description" content="透過 LINE 輕鬆報名供佛齋僧活動" />
        <meta property="og:type" content="website" />
        
        {/* 字體預載入 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&display=swap" 
          rel="stylesheet" 
        />
      </Head>
      
      <div className="app-container">
        <LiffErrorBoundary 
          showErrorDetails={process.env.NODE_ENV === 'development'}
          showReloadButton={true}
        >
          <ErrorBoundary>
            <OfflineDetector />
            <LiffStatus />
            <IdentityProvider>
              <RegistrationFlowProvider>
                <Component 
                  {...pageProps} 
                  liffProfile={profile}
                  isInLineClient={isInLineClient}
                  networkStatus={networkStatus}
                  healthStatus={healthStatus}
                />
              </RegistrationFlowProvider>
            </IdentityProvider>
          </ErrorBoundary>
        </LiffErrorBoundary>
      </div>
    </>
  );
}