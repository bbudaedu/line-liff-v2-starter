import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useRegistrationFlow, RegistrationStep } from '@/contexts/RegistrationFlowContext';
import { RegistrationProgress } from '@/components/registration/RegistrationProgress';
import { IdentitySelection } from '@/components/identity/IdentitySelection';
import { PersonalInfoForm } from '@/components/forms/PersonalInfoForm';
import { TransportSelection } from '@/components/transport/TransportSelection';
import { TransportConfirmation } from '@/components/transport/TransportConfirmation';
import { Container } from '@/components/layout/Grid';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { useLiff } from '@/hooks/useLiff';
import { useIdentity } from '@/hooks/useIdentity';
import { PersonalInfoFormData } from '@/utils/form-validation';
import { Event, TransportOption } from '@/types';
import { apiClient } from '@/services/api';
import styles from './index.module.css';

export default function RegistrationFlowPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const { profile, isInLineClient } = useLiff();
  const { identity: contextIdentity } = useIdentity();
  
  const {
    state,
    goToStep,
    completeStep,
    setIdentity,
    setEvent,
    setPersonalInfo,
    setTransport,
    resetFlow,
    loadFromStorage,
  } = useRegistrationFlow();

  const {
    currentStep,
    completedSteps,
    identity,
    selectedEventId,
    personalInfo,
    transportSelection,
    isLoading,
    error,
  } = state;

  // 載入事件資料
  const [eventData, setEventData] = React.useState<Event | null>(null);
  const [transportOptions, setTransportOptions] = React.useState<TransportOption[]>([]);

  // 初始化流程
  useEffect(() => {
    // 嘗試從儲存載入狀態
    const restored = loadFromStorage();
    
    // 如果有 eventId 參數，設定選中的活動
    if (eventId && typeof eventId === 'string') {
      setEvent(eventId);
    }
    
    // 如果有身份上下文，同步到流程狀態
    if (contextIdentity && !identity) {
      setIdentity(contextIdentity);
    }
    
    // 如果沒有恢復狀態且沒有身份，從身份選擇開始
    if (!restored && !identity && !contextIdentity) {
      goToStep('identity');
    }
  }, [eventId, contextIdentity, identity]);

  // 載入活動資料
  useEffect(() => {
    if (selectedEventId) {
      loadEventData(selectedEventId);
      loadTransportOptions(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEventData = async (eventId: string) => {
    try {
      const response = await apiClient.get<Event>(`/api/v1/events/${eventId}`);
      if (response.success && response.data) {
        setEventData(response.data);
      }
    } catch (error) {
      console.error('Failed to load event data:', error);
    }
  };

  const loadTransportOptions = async (eventId: string) => {
    try {
      const response = await apiClient.get<TransportOption[]>(`/api/v1/events/${eventId}/transport`);
      if (response.success && response.data) {
        setTransportOptions(response.data);
      }
    } catch (error) {
      console.error('Failed to load transport options:', error);
      // 使用模擬資料作為後備
      setTransportOptions([
        {
          id: 'location-1',
          eventId: eventId,
          name: '彰化火車站',
          address: '彰化縣彰化市三民路1號',
          pickupTime: new Date('2024-01-15T07:30:00'),
          maxSeats: 45,
          bookedSeats: 32,
          coordinates: { lat: 24.0818, lng: 120.5387 }
        },
        {
          id: 'location-2',
          eventId: eventId,
          name: '員林轉運站',
          address: '彰化縣員林市中山路二段556號',
          pickupTime: new Date('2024-01-15T08:00:00'),
          maxSeats: 45,
          bookedSeats: 45,
          coordinates: { lat: 23.9588, lng: 120.5736 }
        },
        {
          id: 'location-3',
          eventId: eventId,
          name: '鹿港老街',
          address: '彰化縣鹿港鎮中山路',
          pickupTime: new Date('2024-01-15T07:45:00'),
          maxSeats: 35,
          bookedSeats: 28,
          coordinates: { lat: 24.0576, lng: 120.4342 }
        }
      ]);
    }
  };

  // 步驟處理函數
  const handleIdentitySelected = (selectedIdentity: 'monk' | 'volunteer') => {
    setIdentity(selectedIdentity);
    completeStep('identity');
    
    // 如果已有選中的活動，跳到個人資料填寫
    if (selectedEventId) {
      completeStep('event');
      goToStep('personal-info');
    } else {
      goToStep('event');
    }
  };

  const handleEventSelected = (eventId: string) => {
    setEvent(eventId);
    completeStep('event');
    goToStep('personal-info');
  };

  const handlePersonalInfoSubmit = (formData: PersonalInfoFormData) => {
    setPersonalInfo(formData);
    completeStep('personal-info');
    goToStep('transport');
  };

  const handleTransportSelected = (locationId: string | null, transport: TransportOption | null) => {
    setTransport({ locationId, transport });
    completeStep('transport');
    goToStep('confirmation');
  };

  const handleConfirmRegistration = async () => {
    try {
      // 提交完整的報名資料
      const registrationData = {
        eventId: selectedEventId,
        identity,
        personalInfo,
        transport: transportSelection,
        userId: profile?.userId,
      };

      console.log('Submitting registration:', registrationData);
      
      // 這裡應該呼叫實際的 API
      // const response = await apiClient.post('/api/v1/registration', registrationData);
      
      // 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      completeStep('confirmation');
      goToStep('success');
      
    } catch (error) {
      console.error('Registration failed:', error);
      // 錯誤處理會由 context 處理
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleStartNewRegistration = () => {
    resetFlow();
    goToStep('identity');
  };

  // 渲染當前步驟內容
  const renderStepContent = () => {
    switch (currentStep) {
      case 'identity':
        return (
          <Card className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>選擇您的身份</h2>
              <p className={styles.stepDescription}>
                請選擇您的身份類型，系統將根據您的身份提供相應的報名選項
              </p>
            </div>
            <IdentitySelection
              onIdentitySelected={handleIdentitySelected}
              currentIdentity={identity}
              showWelcome={false}
            />
          </Card>
        );

      case 'event':
        return (
          <Card className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>選擇活動</h2>
              <p className={styles.stepDescription}>
                請選擇您要報名的供佛齋僧活動
              </p>
            </div>
            <div className={styles.eventSelection}>
              <Button
                variant="primary"
                onClick={() => router.push('/events')}
                className={styles.selectEventButton}
              >
                瀏覽活動列表
              </Button>
              {eventData && (
                <div className={styles.selectedEvent}>
                  <h3>已選擇活動：{eventData.name}</h3>
                  <p>時間：{new Date(eventData.startDate).toLocaleDateString()}</p>
                  <p>地點：{eventData.location}</p>
                  <Button
                    variant="primary"
                    onClick={() => handleEventSelected(eventData.id)}
                  >
                    確認選擇此活動
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );

      case 'personal-info':
        return (
          <Card className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>填寫個人資料</h2>
              <p className={styles.stepDescription}>
                請填寫您的個人基本資料以完成報名
              </p>
            </div>
            <PersonalInfoForm
              onSubmit={handlePersonalInfoSubmit}
              onCancel={() => goToStep('event')}
              initialData={personalInfo || {}}
              isLoading={isLoading}
            />
          </Card>
        );

      case 'transport':
        return (
          <Card className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>交通安排</h2>
              <p className={styles.stepDescription}>
                請選擇您的交通車上車地點，或選擇自行前往
              </p>
            </div>
            <TransportSelection
              eventId={selectedEventId || ''}
              selectedLocationId={transportSelection?.locationId || null}
              onLocationSelect={(locationId) => {
                const transport = transportOptions.find(t => t.id === locationId) || null;
                handleTransportSelected(locationId, transport);
              }}
              onConfirm={() => {
                const transport = transportSelection?.transport || null;
                handleTransportSelected(transportSelection?.locationId || null, transport);
              }}
              loading={isLoading}
              error={error}
            />
          </Card>
        );

      case 'confirmation':
        return (
          <Card className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>確認報名資料</h2>
              <p className={styles.stepDescription}>
                請確認以下報名資料無誤後提交
              </p>
            </div>
            <div className={styles.confirmationContent}>
              {/* 活動資訊 */}
              {eventData && (
                <div className={styles.confirmationSection}>
                  <h3>活動資訊</h3>
                  <div className={styles.confirmationItem}>
                    <span>活動名稱：</span>
                    <span>{eventData.name}</span>
                  </div>
                  <div className={styles.confirmationItem}>
                    <span>活動時間：</span>
                    <span>{new Date(eventData.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.confirmationItem}>
                    <span>活動地點：</span>
                    <span>{eventData.location}</span>
                  </div>
                </div>
              )}

              {/* 個人資料 */}
              {personalInfo && (
                <div className={styles.confirmationSection}>
                  <h3>個人資料</h3>
                  <div className={styles.confirmationItem}>
                    <span>姓名：</span>
                    <span>{personalInfo.name}</span>
                  </div>
                  <div className={styles.confirmationItem}>
                    <span>聯絡電話：</span>
                    <span>{personalInfo.phone}</span>
                  </div>
                  {identity === 'monk' && personalInfo.dharmaName && (
                    <div className={styles.confirmationItem}>
                      <span>法名：</span>
                      <span>{personalInfo.dharmaName}</span>
                    </div>
                  )}
                  {identity === 'monk' && personalInfo.templeName && (
                    <div className={styles.confirmationItem}>
                      <span>寺院名稱：</span>
                      <span>{personalInfo.templeName}</span>
                    </div>
                  )}
                  {personalInfo.specialRequirements && (
                    <div className={styles.confirmationItem}>
                      <span>特殊需求：</span>
                      <span>{personalInfo.specialRequirements}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 交通安排 */}
              <div className={styles.confirmationSection}>
                <h3>交通安排</h3>
                {transportSelection?.transport ? (
                  <>
                    <div className={styles.confirmationItem}>
                      <span>上車地點：</span>
                      <span>{transportSelection.transport.name}</span>
                    </div>
                    <div className={styles.confirmationItem}>
                      <span>上車時間：</span>
                      <span>{transportSelection.transport.pickupTime.toLocaleTimeString()}</span>
                    </div>
                    <div className={styles.confirmationItem}>
                      <span>地址：</span>
                      <span>{transportSelection.transport.address}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.confirmationItem}>
                    <span>交通方式：</span>
                    <span>自行前往</span>
                  </div>
                )}
              </div>

              <div className={styles.confirmationActions}>
                <Button
                  variant="outline"
                  onClick={() => goToStep('transport')}
                  disabled={isLoading}
                >
                  修改資料
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmRegistration}
                  loading={isLoading}
                >
                  確認提交報名
                </Button>
              </div>
            </div>
          </Card>
        );

      case 'success':
        return (
          <Card className={styles.stepCard}>
            <div className={styles.successContent}>
              <div className={styles.successIcon}>✅</div>
              <h2 className={styles.successTitle}>報名成功！</h2>
              <p className={styles.successDescription}>
                您的報名已成功提交，我們將透過 LINE 發送確認訊息給您
              </p>
              
              <div className={styles.successInfo}>
                <div className={styles.successItem}>
                  <span>報名編號：</span>
                  <span className={styles.registrationId}>REG-{Date.now()}</span>
                </div>
                <div className={styles.successItem}>
                  <span>報名時間：</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className={styles.successActions}>
                <Button
                  variant="primary"
                  onClick={() => router.push('/registrations')}
                >
                  查看報名狀態
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartNewRegistration}
                >
                  報名其他活動
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBackToHome}
                >
                  返回首頁
                </Button>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isLoading && currentStep !== 'confirmation') {
    return (
      <>
        <Head>
          <title>載入中 - 活動報名</title>
        </Head>
        <Container className={styles.loadingContainer}>
          <LoadingSpinner text="載入報名流程中..." />
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>活動報名 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="完成供佛齋僧活動報名流程" />
      </Head>

      <Container className={styles.registrationContainer}>
        {/* 頁面標題 */}
        <div className={styles.pageHeader}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToHome}
            className={styles.backButton}
          >
            ← 返回首頁
          </Button>
          <h1 className={styles.pageTitle}>活動報名</h1>
        </div>

        {/* 進度指示器 */}
        <RegistrationProgress />

        {/* 錯誤提示 */}
        {error && (
          <Alert variant="error" className={styles.errorAlert}>
            {error}
          </Alert>
        )}

        {/* 步驟內容 */}
        <div className={styles.stepContent}>
          {renderStepContent()}
        </div>

        {/* 幫助資訊 */}
        {currentStep !== 'success' && (
          <div className={styles.helpSection}>
            <h3 className={styles.helpTitle}>需要協助？</h3>
            <p className={styles.helpText}>
              如果您在報名過程中遇到問題，請聯絡我們：
            </p>
            <div className={styles.helpContact}>
              <span>📞 04-1234-5678</span>
              <span>💬 LINE 官方帳號：@changhua-buddhist</span>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}