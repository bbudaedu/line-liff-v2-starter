import { useState } from 'react';
import Head from 'next/head';
import { IdentitySelection } from '@/components/identity/IdentitySelection';
import { useIdentity, useIdentityLabels } from '@/hooks/useIdentity';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function IdentityDemoPage() {
  const { identity, hasSelectedIdentity, clearIdentity } = useIdentity();
  const { label, icon, description } = useIdentityLabels(identity);
  const [showSelection, setShowSelection] = useState(!hasSelectedIdentity);

  const handleIdentitySelected = (selectedIdentity: 'monk' | 'volunteer') => {
    setShowSelection(false);
  };

  const handleShowSelection = () => {
    setShowSelection(true);
  };

  const handleClearIdentity = () => {
    clearIdentity();
    setShowSelection(true);
  };

  return (
    <>
      <Head>
        <title>身份選擇功能展示 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="身份選擇功能展示頁面" />
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        padding: '20px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            textAlign: 'center', 
            marginBottom: '30px',
            color: '#333',
            fontFamily: 'Noto Serif TC, serif'
          }}>
            身份選擇功能展示
          </h1>

          {showSelection ? (
            <IdentitySelection
              onIdentitySelected={handleIdentitySelected}
              currentIdentity={identity}
              showWelcome={!hasSelectedIdentity}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card style={{ padding: '24px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '16px', color: '#333' }}>
                  目前選擇的身份
                </h2>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '16px' 
                }}>
                  {icon}
                </div>
                <h3 style={{ 
                  fontSize: '24px', 
                  marginBottom: '8px',
                  color: '#333'
                }}>
                  {label}
                </h3>
                <p style={{ 
                  color: '#666',
                  marginBottom: '24px'
                }}>
                  {description}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <Button 
                    variant="outline" 
                    onClick={handleShowSelection}
                  >
                    重新選擇身份
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleClearIdentity}
                  >
                    清除身份設定
                  </Button>
                </div>
              </Card>

              <Card style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', color: '#333' }}>
                  身份狀態資訊
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  fontSize: '14px'
                }}>
                  <div>
                    <strong>身份類型：</strong>
                    <span style={{ color: '#666' }}>{identity || '未選擇'}</span>
                  </div>
                  <div>
                    <strong>已選擇身份：</strong>
                    <span style={{ color: hasSelectedIdentity ? '#22c55e' : '#ef4444' }}>
                      {hasSelectedIdentity ? '是' : '否'}
                    </span>
                  </div>
                  <div>
                    <strong>顯示名稱：</strong>
                    <span style={{ color: '#666' }}>{label}</span>
                  </div>
                  <div>
                    <strong>描述：</strong>
                    <span style={{ color: '#666' }}>{description}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div style={{ 
            textAlign: 'center', 
            marginTop: '40px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '12px'
          }}>
            <h3 style={{ marginBottom: '12px', color: '#333' }}>
              功能說明
            </h3>
            <ul style={{ 
              textAlign: 'left', 
              maxWidth: '600px', 
              margin: '0 auto',
              color: '#666',
              lineHeight: '1.6'
            }}>
              <li>✅ 身份選擇介面（法師/志工）</li>
              <li>✅ 本地儲存和狀態管理</li>
              <li>✅ 身份驗證和切換功能</li>
              <li>✅ 首次使用者引導流程</li>
              <li>✅ 響應式設計和無障礙功能</li>
              <li>✅ 載入狀態和成功提示</li>
              <li>✅ 錯誤處理和重試機制</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}