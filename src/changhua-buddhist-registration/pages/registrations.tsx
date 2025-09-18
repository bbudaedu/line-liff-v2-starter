/**
 * 報名狀態查詢頁面
 * Registration Status Query Page
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLiff } from '../hooks/useLiff';
import { useIdentity } from '../hooks/useIdentity';
import Container from '../components/layout/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import RegistrationCard from '../components/registration/RegistrationCard';
import RegistrationEditModal from '../components/registration/RegistrationEditModal';
import { apiClient } from '../services/api';
import { Registration, RegistrationStatus } from '../types';
import styles from './registrations.module.css';

interface RegistrationWithDetails extends Registration {
  eventName?: string;
  eventDate?: Date;
  eventLocation?: string;
  canEdit?: boolean;
  canCancel?: boolean;
  reminders?: string[];
}

const RegistrationsPage: React.FC = () => {
  const router = useRouter();
  const { initialized, loading: liffLoading, error: liffError } = useLiff();
  const { identity } = useIdentity();
  
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationWithDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 載入報名記錄
  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/v1/registration/my');
      const { registrations: rawRegistrations } = response.data;

      // 獲取活動詳情並處理報名記錄
      const registrationsWithDetails = await Promise.all(
        rawRegistrations.map(async (registration: Registration) => {
          try {
            // 獲取活動詳情
            const eventResponse = await apiClient.get(`/api/v1/events/${registration.eventId}`);
            const event = eventResponse.data;

            // 檢查是否可以編輯和取消
            const now = new Date();
            const eventDate = new Date(event.dateFrom);
            const canEdit = registration.status !== 'cancelled' && 
                           now < eventDate && 
                           (eventDate.getTime() - now.getTime()) > 24 * 60 * 60 * 1000; // 24小時前
            const canCancel = registration.status !== 'cancelled' && now < eventDate;

            // 生成提醒訊息
            const reminders = generateReminders(registration, event, now);

            return {
              ...registration,
              eventName: event.name,
              eventDate: new Date(event.dateFrom),
              eventLocation: event.location,
              canEdit,
              canCancel,
              reminders
            };
          } catch (eventError) {
            console.warn('無法獲取活動詳情:', eventError);
            return {
              ...registration,
              eventName: `活動 ${registration.eventId}`,
              canEdit: false,
              canCancel: false,
              reminders: []
            };
          }
        })
      );

      setRegistrations(registrationsWithDetails);
    } catch (err) {
      console.error('載入報名記錄失敗:', err);
      setError('載入報名記錄失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 生成提醒訊息
  const generateReminders = (registration: Registration, event: any, now: Date): string[] => {
    const reminders: string[] = [];
    const eventDate = new Date(event.dateFrom);
    const timeDiff = eventDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (registration.status === 'confirmed') {
      if (daysDiff <= 7 && daysDiff > 0) {
        reminders.push(`活動將在 ${daysDiff} 天後舉行`);
      }
      
      if (daysDiff <= 1 && daysDiff > 0) {
        reminders.push('請準備相關證件和個人物品');
        if (registration.transport?.required) {
          reminders.push('請準時到達指定的上車地點');
        }
      }

      if (event.location) {
        reminders.push(`活動地點：${event.location}`);
      }

      if (event.dateAdmission) {
        const admissionTime = new Date(event.dateAdmission);
        reminders.push(`報到時間：${admissionTime.toLocaleString('zh-TW')}`);
      }
    }

    return reminders;
  };

  // 處理編輯報名
  const handleEditRegistration = (registration: RegistrationWithDetails) => {
    setSelectedRegistration(registration);
    setShowEditModal(true);
  };

  // 處理取消報名
  const handleCancelRegistration = async (registrationId: string) => {
    if (!confirm('確定要取消此報名嗎？取消後將無法恢復。')) {
      return;
    }

    try {
      setActionLoading(registrationId);
      await apiClient.delete(`/api/v1/registration/${registrationId}`);
      
      // 重新載入報名記錄
      await loadRegistrations();
      
      alert('報名已成功取消');
    } catch (err) {
      console.error('取消報名失敗:', err);
      alert('取消報名失敗，請稍後再試');
    } finally {
      setActionLoading(null);
    }
  };

  // 處理保存編輯
  const handleSaveEdit = async (updatedData: any) => {
    if (!selectedRegistration) return;

    try {
      setActionLoading(selectedRegistration.id);
      
      await apiClient.put(`/api/v1/registration/${selectedRegistration.id}`, updatedData);
      
      // 重新載入報名記錄
      await loadRegistrations();
      setShowEditModal(false);
      setSelectedRegistration(null);
      
      alert('報名資料已成功更新');
    } catch (err) {
      console.error('更新報名資料失敗:', err);
      alert('更新報名資料失敗，請稍後再試');
    } finally {
      setActionLoading(null);
    }
  };

  // 初始化
  useEffect(() => {
    if (initialized && !liffError.hasError) {
      loadRegistrations();
    }
  }, [initialized, liffError.hasError]);

  // LIFF 錯誤處理
  if (liffError.hasError) {
    return (
      <Container>
        <Alert variant="error" title="系統錯誤">
          {liffError.message || '系統初始化失敗'}
        </Alert>
      </Container>
    );
  }

  // 載入中
  if (!initialized || liffLoading.isLoading || loading) {
    return (
      <Container>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>載入報名記錄中...</p>
        </div>
      </Container>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <Container>
        <Alert variant="error" title="載入失敗">
          {error}
        </Alert>
        <div className={styles.retryContainer}>
          <Button onClick={loadRegistrations}>重新載入</Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className={styles.header}>
        <h1>我的報名記錄</h1>
        <p>查看和管理您的活動報名</p>
      </div>

      {registrations.length === 0 ? (
        <div className={styles.emptyState}>
          <Card>
            <div className={styles.emptyContent}>
              <h3>尚無報名記錄</h3>
              <p>您還沒有報名任何活動</p>
              <Button 
                variant="primary" 
                onClick={() => router.push('/events')}
              >
                瀏覽活動
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className={styles.registrationsList}>
          {registrations.map((registration) => (
            <RegistrationCard
              key={registration.id}
              registration={registration}
              onEdit={registration.canEdit ? () => handleEditRegistration(registration) : undefined}
              onCancel={registration.canCancel ? () => handleCancelRegistration(registration.id) : undefined}
              loading={actionLoading === registration.id}
            />
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
        >
          返回首頁
        </Button>
        <Button 
          variant="primary" 
          onClick={() => router.push('/events')}
        >
          報名新活動
        </Button>
      </div>

      {/* 編輯報名模態框 */}
      {showEditModal && selectedRegistration && (
        <RegistrationEditModal
          registration={selectedRegistration}
          identity={identity}
          onSave={handleSaveEdit}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedRegistration(null);
          }}
          loading={actionLoading === selectedRegistration.id}
        />
      )}
    </Container>
  );
};

export default RegistrationsPage;