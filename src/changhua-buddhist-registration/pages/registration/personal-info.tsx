import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useIdentityContext, IdentityGuard } from '@/contexts/IdentityContext';
import { PersonalInfoForm } from '@/components/forms/PersonalInfoForm';
import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PersonalInfoFormData } from '@/utils/form-validation';
import { useLiff } from '@/hooks/useLiff';
import styles from './personal-info.module.css';

export default function PersonalInfoPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const { identity, getIdentityDisplayName } = useIdentityContext();
  const { profile, isInLineClient } = useLiff();
  
  // 表單狀態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [initialData, setInitialData] = useState<Partial<PersonalInfoFormData>>({});

  // 載入使用者現有資料
  useEffect(() => {
    if (profile) {
      setInitialData({
        name: profile.displayName || '',
        // 其他欄位可以從 API 載入已儲存的資料
      });
    }
  }, [profile]);

  // 處理表單提交
  const handleSubmit = async (formData: PersonalInfoFormData) => {
    if (!eventId) {
      setSubmitError('缺少活動資訊，請重新選擇活動');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // 準備提交資料
      const registrationData = {
        eventId: eventId as string,
        identity,
        personalInfo: {
          name: formData.name,
          phone: formData.phone,
          idNumber: formData.idNumber,
          birthDate: formData.birthDate,
          specialRequirements: formData.specialRequirements,
          // 法師專用欄位
          ...(identity === 'monk' && {
            dharmaName: formData.dharmaName,
            templeName: formData.templeName,
          }),
        },
      };

      // 模擬 API 呼叫
      console.log('Submitting registration data:', registrationData);
      
      // 這裡應該呼叫實際的 API
      // const response = await fetch('/api/registration/personal-info', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(registrationData),
      // });
      
      // if (!response.ok) {
      //   throw new Error('提交失敗，請稍後再試');
      // }
      
      // 模擬延遲
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 成功後跳轉到下一步（交通車登記）
      router.push(`/registration/transport?eventId=${eventId}`);
      
    } catch (error) {
      console.error('Registration submission failed:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : '提交失敗，請檢查網路連線後重試'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理取消
  const handleCancel = () => {
    router.back();
  };

  // 處理返回活動選擇
  const handleBackToEvents = () => {
    router.push('/events');
  };

  return (
    <>
      <Head>
        <title>個人資料填寫 - 彰化供佛齋僧活動報名</title>
        <meta name="description" content="填寫個人資料以完成活動報名" />
      </Head>

      <IdentityGuard>
        <Container className={styles.pageContainer}>
          {/* 頁面標題 */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>個人資料填寫</h1>
            <div className={styles.stepIndicator}>
              <div className={styles.step}>
                <div className={`${styles.stepNumber} ${styles.completed}`}>1</div>
                <span className={styles.stepLabel}>選擇活動</span>
              </div>
              <div className={styles.stepConnector}></div>
              <div className={styles.step}>
                <div className={`${styles.stepNumber} ${styles.active}`}>2</div>
                <span className={styles.stepLabel}>個人資料</span>
              </div>
              <div className={styles.stepConnector}></div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <span className={styles.stepLabel}>交通安排</span>
              </div>
              <div className={styles.stepConnector}></div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>4</div>
                <span className={styles.stepLabel}>確認提交</span>
              </div>
            </div>
          </div>

          {/* 使用者資訊顯示 */}
          {profile && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {profile.pictureUrl ? (
                  <img src={profile.pictureUrl} alt="使用者頭像" />
                ) : (
                  <div className={styles.defaultAvatar}>
                    {profile.displayName?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div className={styles.userDetails}>
                <h3 className={styles.userName}>{profile.displayName}</h3>
                <p className={styles.userIdentity}>身份：{getIdentityDisplayName()}</p>
              </div>
            </div>
          )}

          {/* 說明文字 */}
          <Alert type="info" className={styles.infoAlert}>
            <strong>填寫說明：</strong>
            <ul>
              <li>請確實填寫所有必填欄位</li>
              <li>身分證字號將用於報名確認，請務必正確填寫</li>
              <li>聯絡電話將用於活動通知，請填寫常用號碼</li>
              <li>表單資料會自動儲存，避免意外遺失</li>
            </ul>
          </Alert>

          {/* 個人資料表單 */}
          <PersonalInfoForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={initialData}
            isLoading={isSubmitting}
            submitError={submitError}
            className={styles.form}
          />

          {/* 頁面操作按鈕 */}
          <div className={styles.pageActions}>
            <Button
              variant="outline"
              onClick={handleBackToEvents}
              disabled={isSubmitting}
            >
              返回活動選擇
            </Button>
          </div>

          {/* 幫助資訊 */}
          <div className={styles.helpSection}>
            <h3 className={styles.helpTitle}>需要協助？</h3>
            <div className={styles.helpContent}>
              <p>如果您在填寫過程中遇到問題，請聯絡我們：</p>
              <ul>
                <li>電話：04-1234-5678</li>
                <li>LINE 官方帳號：@changhua-buddhist</li>
                <li>服務時間：週一至週五 09:00-17:00</li>
              </ul>
            </div>
          </div>
        </Container>
      </IdentityGuard>
    </>
  );
}