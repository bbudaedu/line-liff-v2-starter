import { useRouter } from 'next/router';
import Head from 'next/head';
import { IdentitySelection } from '@/components/identity/IdentitySelection';
import { useIdentity, useIdentityLabels } from '@/hooks/useIdentity';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageProps } from '@/types';

export default function HomePage({ className, liffProfile, isInLineClient }: PageProps) {
  const router = useRouter();
  const { identity, hasSelectedIdentity, isLoading, clearIdentity } = useIdentity();
  const { label: identityLabel, icon: identityIcon } = useIdentityLabels(identity);

  const handleIdentitySelected = (selectedIdentity: 'monk' | 'volunteer') => {
    // 身份選擇完成，頁面會自動更新
  };

  const handleResetIdentity = () => {
    clearIdentity();
  };

  const handleStartRegistration = () => {
    router.push('/events');
  };

  const handleViewRegistrations = () => {
    router.push('/registrations');
  };

  const handleViewInfo = () => {
    router.push('/info');
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>載入中 - 彰化供佛齋僧活動報名系統</title>
        </Head>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>載入系統中...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>首頁 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="歡迎使用彰化供佛齋僧活動報名系統，請選擇您的身份開始報名" />
      </Head>

      <div className={`home-page ${className || ''}`}>
        <header className="page-header">
          <h1 className="page-title decorated-title traditional-font">彰化供佛齋僧活動</h1>
          <p className="page-subtitle rounded-font">報名系統</p>
        </header>

        <main className="page-content">
          {!hasSelectedIdentity ? (
            // 首次訪問或未選擇身份 - 身份選擇
            <IdentitySelection
              onIdentitySelected={handleIdentitySelected}
              currentIdentity={identity}
              showWelcome={true}
              className="home-identity-selection"
            />
          ) : (
            // 已選擇身份 - 主要功能選單
            <section className="main-menu">
              <div className="user-info">
                {liffProfile && (
                  <div className="user-profile">
                    {liffProfile.pictureUrl && (
                      <img 
                        src={liffProfile.pictureUrl} 
                        alt="使用者頭像"
                        className="user-avatar"
                      />
                    )}
                    <div className="user-details">
                      <h2 className="welcome-message traditional-font">
                        歡迎，{liffProfile.displayName}
                      </h2>
                      <div className="user-identity rounded-font">
                        <span className="identity-icon">{identityIcon}</span>
                        <span className="identity-text">{identityLabel}身份</span>
                      </div>
                    </div>
                  </div>
                )}
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleResetIdentity}
                  className="change-identity-button"
                >
                  切換身份
                </Button>
              </div>

              <div className="menu-options">
                <Card className="menu-item" onClick={handleStartRegistration}>
                  <div className="menu-item-content">
                    <div className="menu-icon">📝</div>
                    <div className="menu-text">
                      <h3 className="traditional-font">活動報名</h3>
                      <p className="rounded-font">瀏覽並報名供佛齋僧活動</p>
                    </div>
                    <div className="menu-arrow">→</div>
                  </div>
                </Card>

                <Card className="menu-item" onClick={handleViewRegistrations}>
                  <div className="menu-item-content">
                    <div className="menu-icon">📋</div>
                    <div className="menu-text">
                      <h3 className="traditional-font">報名查詢</h3>
                      <p className="rounded-font">查看您的報名狀態和詳細資訊</p>
                    </div>
                    <div className="menu-arrow">→</div>
                  </div>
                </Card>

                <Card className="menu-item" onClick={handleViewInfo}>
                  <div className="menu-item-content">
                    <div className="menu-icon">ℹ️</div>
                    <div className="menu-text">
                      <h3 className="traditional-font">活動資訊</h3>
                      <p className="rounded-font">了解最新的活動訊息和注意事項</p>
                    </div>
                    <div className="menu-arrow">→</div>
                  </div>
                </Card>
              </div>
            </section>
          )}
        </main>

        <footer className="page-footer">
          <p className="footer-text traditional-font">
            彰化供佛齋僧活動報名系統
          </p>
          <p className="footer-version rounded-font">
            版本 1.0.0 {isInLineClient && '• LINE 版本'}
          </p>
        </footer>
      </div>

      <style jsx>{`
        .home-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .page-header {
          text-align: center;
          padding: 40px 20px 20px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: white;
          position: relative;
          overflow: hidden;
        }

        .page-header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
          animation: float 20s linear infinite;
          pointer-events: none;
        }

        @keyframes float {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .page-title {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }

        .page-subtitle {
          font-size: 18px;
          opacity: 0.9;
          position: relative;
          z-index: 1;
        }

        .page-content {
          flex: 1;
          padding: 30px 20px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .home-identity-selection {
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 0;
        }

        .main-menu {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .user-info {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--accent-color);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .welcome-message {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .user-identity {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          color: var(--text-secondary);
        }

        .identity-icon {
          font-size: 18px;
        }

        .change-identity-button {
          flex-shrink: 0;
        }

        .menu-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .menu-item {
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
        }

        .menu-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .menu-item-content {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }

        .menu-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .menu-text {
          flex: 1;
        }

        .menu-text h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .menu-text p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .menu-arrow {
          font-size: 20px;
          color: var(--primary-color);
          flex-shrink: 0;
        }

        .page-footer {
          text-align: center;
          padding: 20px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }

        .footer-text {
          font-size: 16px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .footer-version {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 16px;
          padding: 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-light);
          border-top: 4px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 響應式設計 */
        @media (max-width: 768px) {
          .page-header {
            padding: 30px 16px 16px;
          }

          .page-title {
            font-size: 28px;
          }

          .page-subtitle {
            font-size: 16px;
          }

          .page-content {
            padding: 20px 16px;
          }

          .user-info {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .user-profile {
            flex-direction: column;
            gap: 12px;
          }

          .welcome-message {
            font-size: 18px;
          }

          .menu-item-content {
            padding: 16px;
          }

          .menu-text h3 {
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .page-header {
            padding: 24px 12px 12px;
          }

          .page-title {
            font-size: 24px;
          }

          .page-content {
            padding: 16px 12px;
          }

          .user-avatar {
            width: 50px;
            height: 50px;
          }

          .menu-icon {
            font-size: 28px;
          }

          .menu-item-content {
            padding: 14px;
          }
        }
      `}</style>
    </>
  );
}