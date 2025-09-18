/**
 * 報名記錄卡片元件
 * Registration Record Card Component
 */

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Registration, RegistrationStatus } from '../../types';
import styles from './RegistrationCard.module.css';

interface RegistrationWithDetails extends Registration {
  eventName?: string;
  eventDate?: Date;
  eventLocation?: string;
  canEdit?: boolean;
  canCancel?: boolean;
  reminders?: string[];
}

interface RegistrationCardProps {
  registration: RegistrationWithDetails;
  onEdit?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const RegistrationCard: React.FC<RegistrationCardProps> = ({
  registration,
  onEdit,
  onCancel,
  loading = false
}) => {
  // 狀態顯示配置
  const getStatusConfig = (status: RegistrationStatus) => {
    switch (status) {
      case 'confirmed':
        return {
          label: '已確認',
          className: styles.statusConfirmed,
          icon: '✓'
        };
      case 'pending':
        return {
          label: '處理中',
          className: styles.statusPending,
          icon: '⏳'
        };
      case 'cancelled':
        return {
          label: '已取消',
          className: styles.statusCancelled,
          icon: '✗'
        };
      default:
        return {
          label: '未知',
          className: styles.statusUnknown,
          icon: '?'
        };
    }
  };

  const statusConfig = getStatusConfig(registration.status);

  // 格式化日期
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 格式化時間
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 身份顯示
  const getIdentityLabel = (identity: string) => {
    return identity === 'monk' ? '法師' : '志工';
  };

  return (
    <Card className={styles.registrationCard}>
      {/* 卡片標題 */}
      <div className={styles.cardHeader}>
        <div className={styles.eventInfo}>
          <h3 className={styles.eventName}>
            {registration.eventName || `活動 ${registration.eventId}`}
          </h3>
          <div className={`${styles.status} ${statusConfig.className}`}>
            <span className={styles.statusIcon}>{statusConfig.icon}</span>
            <span className={styles.statusLabel}>{statusConfig.label}</span>
          </div>
        </div>
        
        {registration.pretixOrderId && (
          <div className={styles.orderCode}>
            訂單號：{registration.pretixOrderId}
          </div>
        )}
      </div>

      {/* 活動詳情 */}
      <div className={styles.eventDetails}>
        {registration.eventDate && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>活動日期：</span>
            <span className={styles.detailValue}>
              {formatDate(registration.eventDate)}
            </span>
          </div>
        )}

        {registration.eventLocation && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>活動地點：</span>
            <span className={styles.detailValue}>
              {registration.eventLocation}
            </span>
          </div>
        )}

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>報名身份：</span>
          <span className={styles.detailValue}>
            {getIdentityLabel(registration.identity)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>報名時間：</span>
          <span className={styles.detailValue}>
            {formatDate(registration.createdAt)} {formatTime(registration.createdAt)}
          </span>
        </div>
      </div>

      {/* 個人資料 */}
      <div className={styles.personalInfo}>
        <h4>個人資料</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>姓名：</span>
            <span className={styles.infoValue}>{registration.personalInfo.name}</span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>電話：</span>
            <span className={styles.infoValue}>{registration.personalInfo.phone}</span>
          </div>

          {registration.personalInfo.templeName && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>寺院：</span>
              <span className={styles.infoValue}>{registration.personalInfo.templeName}</span>
            </div>
          )}

          {registration.personalInfo.emergencyContact && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>緊急聯絡人：</span>
              <span className={styles.infoValue}>{registration.personalInfo.emergencyContact}</span>
            </div>
          )}

          {registration.personalInfo.specialRequirements && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>特殊需求：</span>
              <span className={styles.infoValue}>{registration.personalInfo.specialRequirements}</span>
            </div>
          )}
        </div>
      </div>

      {/* 交通車資訊 */}
      {registration.transport && (
        <div className={styles.transportInfo}>
          <h4>交通車資訊</h4>
          {registration.transport.required ? (
            <div className={styles.transportDetails}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>需要交通車：</span>
                <span className={styles.infoValue}>是</span>
              </div>
              {registration.transport.locationId && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>上車地點：</span>
                  <span className={styles.infoValue}>{registration.transport.locationId}</span>
                </div>
              )}
              {registration.transport.pickupTime && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>上車時間：</span>
                  <span className={styles.infoValue}>
                    {formatTime(registration.transport.pickupTime)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.noTransport}>不需要交通車</p>
          )}
        </div>
      )}

      {/* 提醒訊息 */}
      {registration.reminders && registration.reminders.length > 0 && (
        <div className={styles.reminders}>
          <Alert variant="info" title="重要提醒">
            <ul className={styles.remindersList}>
              {registration.reminders.map((reminder, index) => (
                <li key={index}>{reminder}</li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      {/* 操作按鈕 */}
      {(onEdit || onCancel) && registration.status !== 'cancelled' && (
        <div className={styles.actions}>
          {onEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              disabled={loading}
              className={styles.editButton}
            >
              {loading ? '處理中...' : '修改資料'}
            </Button>
          )}
          
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              className={styles.cancelButton}
            >
              {loading ? '處理中...' : '取消報名'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default RegistrationCard;