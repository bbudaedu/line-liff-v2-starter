import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useRegistrationFlow } from '@/contexts/RegistrationFlowContext';
import { Container } from '@/components/layout/Grid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLiff } from '@/hooks/useLiff';
import { formatDate, formatTime } from '@/utils/helpers';
import styles from './success.module.css';

export default function RegistrationSuccessPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const { state, resetFlow } = useRegistrationFlow();
  const { selectedEventId, personalInfo, transportSelection } = state;

  const [registrationId, setRegistrationId] = useState<string>('');
  const [submissionTime, setSubmissionTime] = useState<Date>(new Date());

  // 生成報名編號
  useEffect(() => {
    const generateRegistrationId = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      return `REG-${timestamp}-${random}`;
    };

    setRegistrationId(generateRegistrationId());
    setSubmissionTime(new Date());
  }, []);

  // 處理頁面導航
  const handleViewRegistrations = () => {
    router.push('/registrations');
  };

  const handleRegisterAnother = () => {
    resetFlow();
    router.push('/events');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleShareSuccess = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '彰化供佛齋僧活動報名成功',
          text: `我已成功報名彰化供佛齋僧活動！報名編號：${registrationId}`,
          url: window.location.origin,
        });
      } catch (error) {
        console.log('分享取消或失敗:', error);
      }
    } else {
      // 複製到剪貼簿作為後備
      const shareText = `我已成功報名彰化供佛齋僧活動！報名編號：${registrationId}\n${window.location.origin}`;
      try {
        await navigator.clipboard.writeText(shareText);
        alert('分享內容已複製到剪貼簿');
      } catch (error) {
        console.error('複製失敗:', error);
      }
    }
  };

  return (
    <>
      <Head>
        <title>報名成功 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="您的活動報名已成功提交" />
      </Head>

      <Container className={styles.successContainer}>
        {/* 成功卡片 */}
        <Card className={styles.successCard}>
          {/* 成功圖示和標題 */}
          <div className={styles.successHeader}>
            <div className={styles.successIcon}>
              <div className={styles.checkmark}>
                <svg viewBox="0 0 52 52" className={styles.checkmarkSvg}>
                  <circle 
                    className={styles.checkmarkCircle} 
                    cx="26" 
                    cy="26" 
                    r="25" 
                    fill="none"
                  />
                  <path 
                    className={styles.checkmarkCheck} 
                    fill="none" 
                    d="m14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
            </div>
            <h1 className={styles.successTitle}>報名成功！</h1>
            <p className={styles.successDescription}>
              恭喜您成功完成活動報名，我們將透過 LINE 發送確認訊息給您
            </p>
          </div>

          {/* 報名資訊 */}
          <div className={styles.registrationInfo}>
            <div className={styles.infoSection}>
              <h3 className={styles.infoTitle}>報名資訊</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>報名編號</span>
                  <span className={styles.infoValue}>
                    <code className={styles.registrationCode}>{registrationId}</code>
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>報名時間</span>
                  <span className={styles.infoValue}>
                    {formatDate(submissionTime)} {formatTime(submissionTime)}
                  </span>
                </div>
                {personalInfo && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>報名人</span>
                    <span className={styles.infoValue}>{personalInfo.name}</span>
                  </div>
                )}
                {profile && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>LINE 帳號</span>
                    <span className={styles.infoValue}>{profile.displayName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 交通資訊 */}
            {transportSelection?.transport && (
              <div className={styles.infoSection}>
                <h3 className={styles.infoTitle}>交通安排</h3>
                <div className={styles.transportInfo}>
                  <div className={styles.transportItem}>
                    <span className={styles.transportIcon}>🚌</span>
                    <div className={styles.transportDetails}>
                      <div className={styles.transportLocation}>
                        {transportSelection.transport.name}
                      </div>
                      <div className={styles.transportTime}>
                        上車時間：{formatTime(transportSelection.transport.pickupTime)}
                      </div>
                      <div className={styles.transportAddress}>
                        {transportSelection.transport.address}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 重要提醒 */}
          <div className={styles.importantNotice}>
            <h3 className={styles.noticeTitle}>📋 重要提醒</h3>
            <div className={styles.noticeContent}>
              <div className={styles.noticeItem}>
                <span className={styles.noticeIcon}>📱</span>
                <span className={styles.noticeText}>
                  請保存您的報名編號，查詢報名狀態時需要使用
                </span>
              </div>
              <div className={styles.noticeItem}>
                <span className={styles.noticeIcon}>💬</span>
                <span className={styles.noticeText}>
                  確認訊息將透過 LINE 發送，請注意查收
                </span>
              </div>
              <div className={styles.noticeItem}>
                <span className={styles.noticeIcon}>📅</span>
                <span className={styles.noticeText}>
                  活動前一天會發送提醒訊息，包含詳細注意事項
                </span>
              </div>
              {transportSelection?.transport && (
                <div className={styles.noticeItem}>
                  <span className={styles.noticeIcon}>🚌</span>
                  <span className={styles.noticeText}>
                    請準時到達上車地點，交通車將準時發車
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className={styles.actionButtons}>
            <Button
              variant="primary"
              onClick={handleViewRegistrations}
              className={styles.primaryAction}
            >
              查看報名狀態
            </Button>
            
            <div className={styles.secondaryActions}>
              <Button
                variant="outline"
                onClick={handleRegisterAnother}
                className={styles.secondaryAction}
              >
                報名其他活動
              </Button>
              <Button
                variant="outline"
                onClick={handleShareSuccess}
                className={styles.secondaryAction}
              >
                分享報名成功
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleBackToHome}
              className={styles.backHomeAction}
            >
              返回首頁
            </Button>
          </div>
        </Card>

        {/* 下一步指引 */}
        <Card className={styles.nextStepsCard}>
          <h3 className={styles.nextStepsTitle}>接下來會發生什麼？</h3>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon}>1</div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>立即</div>
                <div className={styles.timelineDescription}>
                  系統發送報名確認訊息到您的 LINE
                </div>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon}>2</div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>活動前 3 天</div>
                <div className={styles.timelineDescription}>
                  發送活動詳細資訊和注意事項
                </div>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon}>3</div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>活動前 1 天</div>
                <div className={styles.timelineDescription}>
                  發送最終提醒和集合資訊
                </div>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon}>4</div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>活動當天</div>
                <div className={styles.timelineDescription}>
                  準時參與供佛齋僧活動
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 聯絡資訊 */}
        <Card className={styles.contactCard}>
          <h3 className={styles.contactTitle}>需要協助？</h3>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>📞</span>
              <div className={styles.contactDetails}>
                <div className={styles.contactMethod}>電話聯絡</div>
                <div className={styles.contactValue}>04-1234-5678</div>
                <div className={styles.contactTime}>服務時間：週一至週五 09:00-17:00</div>
              </div>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>💬</span>
              <div className={styles.contactDetails}>
                <div className={styles.contactMethod}>LINE 官方帳號</div>
                <div className={styles.contactValue}>@changhua-buddhist</div>
                <div className={styles.contactTime}>24小時線上客服</div>
              </div>
            </div>
          </div>
        </Card>
      </Container>
    </>
  );
}