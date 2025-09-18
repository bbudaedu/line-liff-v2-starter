import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useRegistrationFlow } from '@/contexts/RegistrationFlowContext';
import { RegistrationProgress } from '@/components/registration/RegistrationProgress';
import { Container } from '@/components/layout/Grid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLiff } from '@/hooks/useLiff';
import { Event } from '@/types';
import { apiClient } from '@/services/api';
import { formatDate, formatTime } from '@/utils/helpers';
import styles from './confirmation.module.css';

export default function RegistrationConfirmationPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const { profile } = useLiff();
  
  const {
    state,
    goToStep,
    completeStep,
    setEvent,
  } = useRegistrationFlow();

  const {
    currentStep,
    identity,
    selectedEventId,
    personalInfo,
    transportSelection,
    isLoading,
    error,
  } = state;

  const [eventData, setEventData] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // 初始化和資料載入
  useEffect(() => {
    // 如果有 eventId 參數但流程中沒有，設定它
    if (eventId && typeof eventId === 'string' && !selectedEventId) {
      setEvent(eventId);
    }

    // 如果不在確認步驟，導航到確認步驟
    if (currentStep !== 'confirmation') {
      goToStep('confirmation');
    }
  }, [eventId, selectedEventId, currentStep]);

  // 載入活動資料
  useEffect(() => {
    const eventIdToLoad = selectedEventId || (typeof eventId === 'string' ? eventId : null);
    if (eventIdToLoad) {
      loadEventData(eventIdToLoad);
    }
  }, [selectedEventId, eventId]);

  const loadEventData = async (eventId: string) => {
    try {
      const response = await apiClient.get<Event>(`/api/v1/events/${eventId}`);
      if (response.success && response.data) {
        setEventData(response.data);
      }
    } catch (error) {
      console.error('Failed to load event data:', error);
      setSubmitError('無法載入活動資料，請重新嘗試');
    }
  };

  // 提交報名
  const handleSubmitRegistration = async () => {
    if (!profile?.userId) {
      setSubmitError('使用者資訊不完整，請重新登入');
      return;
    }

    if (!selectedEventId || !identity || !personalInfo) {
      setSubmitError('報名資料不完整，請返回檢查');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // 準備提交資料
      const registrationData = {
        eventId: selectedEventId,
        userId: profile.userId,
        identity,
        personalInfo: {
          name: personalInfo.name,
          phone: personalInfo.phone,
          idNumber: personalInfo.idNumber,
          birthDate: personalInfo.birthDate,
          specialRequirements: personalInfo.specialRequirements,
          // 法師專用欄位
          ...(identity === 'monk' && {
            dharmaName: personalInfo.dharmaName,
            templeName: personalInfo.templeName,
          }),
        },
        transport: transportSelection ? {
          required: transportSelection.locationId !== null,
          locationId: transportSelection.locationId,
          pickupTime: transportSelection.transport?.pickupTime,
        } : {
          required: false,
          locationId: null,
          pickupTime: null,
        },
        submittedAt: new Date().toISOString(),
      };

      console.log('Submitting registration data:', registrationData);

      // 呼叫報名 API
      const response = await apiClient.post('/api/v1/registration', registrationData);

      if (response.success) {
        // 報名成功
        completeStep('confirmation');
        goToStep('success');
        
        // 清除暫存資料
        localStorage.removeItem('registrationFlow');
        
        // 導航到成功頁面
        router.push('/registration/success');
      } else {
        throw new Error(response.message || '報名提交失敗');
      }

    } catch (error) {
      console.error('Registration submission failed:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : '報名提交失敗，請檢查網路連線後重試'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 修改資料
  const handleEditData = (step: 'personal-info' | 'transport') => {
    goToStep(step);
    router.push(`/registration?step=${step}`);
  };

  // 取消報名
  const handleCancel = () => {
    if (confirm('確定要取消報名嗎？已填寫的資料將會遺失。')) {
      router.push('/events');
    }
  };

  // 檢查資料完整性
  const isDataComplete = () => {
    return selectedEventId && identity && personalInfo && personalInfo.name && personalInfo.phone;
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>載入中 - 確認報名資料</title>
        </Head>
        <Container className={styles.loadingContainer}>
          <LoadingSpinner text="載入確認頁面中..." />
        </Container>
      </>
    );
  }

  if (!isDataComplete()) {
    return (
      <>
        <Head>
          <title>資料不完整 - 確認報名資料</title>
        </Head>
        <Container className={styles.errorContainer}>
          <Alert variant="error">
            <h3>報名資料不完整</h3>
            <p>請返回填寫完整的報名資料</p>
            <Button 
              variant="primary" 
              onClick={() => router.push('/registration')}
              className={styles.backToFormButton}
            >
              返回報名表單
            </Button>
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>確認報名資料 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="確認您的報名資料並提交報名申請" />
      </Head>

      <Container className={styles.confirmationContainer}>
        {/* 頁面標題 */}
        <div className={styles.pageHeader}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/registration')}
            className={styles.backButton}
          >
            ← 返回報名流程
          </Button>
          <h1 className={styles.pageTitle}>確認報名資料</h1>
        </div>

        {/* 進度指示器 */}
        <RegistrationProgress compact />

        {/* 錯誤提示 */}
        {(error || submitError) && (
          <Alert variant="error" className={styles.errorAlert}>
            {error || submitError}
          </Alert>
        )}

        {/* 確認內容 */}
        <Card className={styles.confirmationCard}>
          <div className={styles.confirmationHeader}>
            <h2 className={styles.confirmationTitle}>請確認以下報名資料</h2>
            <p className={styles.confirmationDescription}>
              請仔細檢查所有資料是否正確，提交後將無法修改
            </p>
          </div>

          <div className={styles.confirmationContent}>
            {/* 活動資訊 */}
            {eventData && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>活動資訊</h3>
                </div>
                <div className={styles.sectionContent}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>活動名稱</span>
                    <span className={styles.infoValue}>{eventData.name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>活動日期</span>
                    <span className={styles.infoValue}>{formatDate(eventData.startDate)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>活動時間</span>
                    <span className={styles.infoValue}>
                      {formatTime(eventData.startDate)} - {formatTime(eventData.endDate)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>活動地點</span>
                    <span className={styles.infoValue}>{eventData.location}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 個人資料 */}
            {personalInfo && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>個人資料</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditData('personal-info')}
                    disabled={submitting}
                    className={styles.editButton}
                  >
                    修改
                  </Button>
                </div>
                <div className={styles.sectionContent}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>身份類型</span>
                    <span className={styles.infoValue}>
                      {identity === 'monk' ? '法師' : '志工'}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>姓名</span>
                    <span className={styles.infoValue}>{personalInfo.name}</span>
                  </div>
                  {identity === 'monk' && personalInfo.dharmaName && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>法名</span>
                      <span className={styles.infoValue}>{personalInfo.dharmaName}</span>
                    </div>
                  )}
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>聯絡電話</span>
                    <span className={styles.infoValue}>{personalInfo.phone}</span>
                  </div>
                  {personalInfo.idNumber && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>身分證字號</span>
                      <span className={styles.infoValue}>
                        {personalInfo.idNumber.replace(/(.{2})(.*)(.{4})/, '$1****$3')}
                      </span>
                    </div>
                  )}
                  {personalInfo.birthDate && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>出生年月日</span>
                      <span className={styles.infoValue}>{personalInfo.birthDate}</span>
                    </div>
                  )}
                  {identity === 'monk' && personalInfo.templeName && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>寺院名稱</span>
                      <span className={styles.infoValue}>{personalInfo.templeName}</span>
                    </div>
                  )}
                  {personalInfo.specialRequirements && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>特殊需求</span>
                      <span className={styles.infoValue}>{personalInfo.specialRequirements}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 交通安排 */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>交通安排</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditData('transport')}
                  disabled={submitting}
                  className={styles.editButton}
                >
                  修改
                </Button>
              </div>
              <div className={styles.sectionContent}>
                {transportSelection?.transport ? (
                  <>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>交通方式</span>
                      <span className={styles.infoValue}>搭乘交通車</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>上車地點</span>
                      <span className={styles.infoValue}>{transportSelection.transport.name}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>上車時間</span>
                      <span className={styles.infoValue}>
                        {formatTime(transportSelection.transport.pickupTime)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>地址</span>
                      <span className={styles.infoValue}>{transportSelection.transport.address}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>交通方式</span>
                    <span className={styles.infoValue}>自行前往</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 提交按鈕 */}
          <div className={styles.submitSection}>
            <div className={styles.submitNotice}>
              <p className={styles.noticeText}>
                ⚠️ 提交後將無法修改報名資料，請確認所有資訊正確無誤
              </p>
            </div>
            
            <div className={styles.submitActions}>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className={styles.cancelButton}
              >
                取消報名
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitRegistration}
                loading={submitting}
                className={styles.submitButton}
              >
                {submitting ? '提交中...' : '確認提交報名'}
              </Button>
            </div>
          </div>
        </Card>

        {/* 幫助資訊 */}
        <div className={styles.helpSection}>
          <h3 className={styles.helpTitle}>提交後會發生什麼？</h3>
          <div className={styles.helpContent}>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>📧</span>
              <span className={styles.helpText}>系統將發送確認訊息到您的 LINE</span>
            </div>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>🎫</span>
              <span className={styles.helpText}>您將收到報名編號和活動詳細資訊</span>
            </div>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>📱</span>
              <span className={styles.helpText}>可隨時透過系統查詢報名狀態</span>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}