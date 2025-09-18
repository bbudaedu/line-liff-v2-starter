import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { IdentitySelection } from '@/components/identity/IdentitySelection';
import { useIdentity } from '@/hooks/useIdentity';
import { PageProps } from '@/types';

interface IdentityPageProps extends PageProps {
  returnTo?: string;
}

export default function IdentityPage({ 
  className, 
  liffProfile, 
  isInLineClient,
  returnTo 
}: IdentityPageProps) {
  const router = useRouter();
  const { identity, hasSelectedIdentity, isLoading } = useIdentity();

  // 從 URL 查詢參數獲取返回路徑
  const returnPath = (router.query.returnTo as string) || returnTo || '/';

  useEffect(() => {
    // 如果已經選擇身份且有返回路徑，自動跳轉
    if (!isLoading && hasSelectedIdentity && returnPath !== '/identity') {
      router.push(returnPath);
    }
  }, [isLoading, hasSelectedIdentity, returnPath, router]);

  const handleIdentitySelected = (selectedIdentity: 'monk' | 'volunteer') => {
    // 身份選擇完成後跳轉
    setTimeout(() => {
      router.push(returnPath);
    }, 1000);
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>身份選擇 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="請選擇您的身份類型以開始使用報名系統" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={`identity-page ${className || ''}`}>
        {/* 導航列 */}
        <nav className="page-nav">
          <button 
            onClick={handleBackToHome}
            className="nav-back-button"
            aria-label="返回首頁"
          >
            ← 返回首頁
          </button>
          
          {liffProfile && (
            <div className="nav-user-info">
              {liffProfile.pictureUrl && (
                <img 
                  src={liffProfile.pictureUrl} 
                  alt="使用者頭像"
                  className="nav-user-avatar"
                />
              )}
              <span className="nav-user-name">{liffProfile.displayName}</span>
            </div>
          )}
        </nav>

        {/* 主要內容 */}
        <main className="page-main">
          <IdentitySelection
            onIdentitySelected={handleIdentitySelected}
            currentIdentity={identity}
            showWelcome={!hasSelectedIdentity}
            className="identity-selection-container"
          />
        </main>

        {/* 頁腳資訊 */}
        <footer className="page-footer">
          <div className="footer-content">
            <p className="footer-text">
              彰化供佛齋僧活動報名系統
            </p>
            {isInLineClient && (
              <p className="footer-platform">
                在 LINE 應用程式中執行
              </p>
            )}
          </div>
        </footer>
      </div>

      <style jsx>{`
        .identity-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .page-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: 20px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: 'Noto Sans TC', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-back-button:hover {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .nav-user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .nav-user-name {
          font-size: 14px;
          color: var(--text-primary);
          font-family: 'Noto Sans TC', sans-serif;
          font-weight: 500;
        }

        .page-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .identity-selection-container {
          width: 100%;
          max-width: 600px;
        }

        .page-footer {
          padding: 20px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }

        .footer-content {
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .footer-text {
          font-size: 14px;
          color: var(--text-secondary);
          font-family: 'Noto Serif TC', serif;
          margin-bottom: 4px;
        }

        .footer-platform {
          font-size: 12px;
          color: var(--text-tertiary);
          font-family: 'Noto Sans TC', sans-serif;
        }

        /* 響應式設計 */
        @media (max-width: 768px) {
          .page-nav {
            padding: 12px 16px;
          }

          .nav-back-button {
            padding: 6px 12px;
            font-size: 13px;
          }

          .nav-user-name {
            display: none;
          }

          .page-main {
            padding: 16px;
          }

          .page-footer {
            padding: 16px;
          }
        }

        @media (max-width: 480px) {
          .page-nav {
            padding: 10px 12px;
          }

          .nav-user-avatar {
            width: 28px;
            height: 28px;
          }

          .page-main {
            padding: 12px;
          }
        }
      `}</style>
    </>
  );
}

// 獲取伺服器端 props（如果需要）
export async function getServerSideProps(context: any) {
  const { returnTo } = context.query;
  
  return {
    props: {
      returnTo: returnTo || null
    }
  };
}