import React from 'react';
import { TransportOption } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import styles from './TransportConfirmation.module.css';

interface TransportConfirmationProps {
  selectedTransport: TransportOption | null;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const TransportConfirmation: React.FC<TransportConfirmationProps> = ({
  selectedTransport,
  onEdit,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>確認交通車登記</h2>
        <p className={styles.subtitle}>請確認您的交通車登記資訊</p>
      </div>

      <Card className={styles.confirmationCard}>
        {selectedTransport ? (
          <div className={styles.transportDetails}>
            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>上車地點</h3>
              <div className={styles.locationInfo}>
                <div className={styles.locationName}>
                  {selectedTransport.name}
                </div>
                <div className={styles.locationAddress}>
                  {selectedTransport.address}
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>上車時間</h3>
              <div className={styles.timeInfo}>
                <div className={styles.date}>
                  {formatDate(selectedTransport.pickupTime)}
                </div>
                <div className={styles.time}>
                  {formatTime(selectedTransport.pickupTime)}
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>座位資訊</h3>
              <div className={styles.seatInfo}>
                <div className={styles.seatStatus}>
                  已預訂：{selectedTransport.bookedSeats + 1}/{selectedTransport.maxSeats}
                </div>
                <div className={styles.seatNote}>
                  ※ 包含您的座位
                </div>
              </div>
            </div>

            <div className={styles.importantNotes}>
              <h4 className={styles.notesTitle}>重要提醒</h4>
              <ul className={styles.notesList}>
                <li>請提前 10 分鐘到達上車地點</li>
                <li>請攜帶身分證明文件以便核對身份</li>
                <li>如需取消或變更，請於活動前 3 天聯繫主辦單位</li>
                <li>交通車將準時發車，請勿遲到</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className={styles.noTransportDetails}>
            <div className={styles.noTransportIcon}>🚗</div>
            <h3 className={styles.noTransportTitle}>自行前往</h3>
            <p className={styles.noTransportMessage}>
              您選擇自行前往活動地點，請注意活動時間和地點資訊。
            </p>
            <div className={styles.importantNotes}>
              <h4 className={styles.notesTitle}>重要提醒</h4>
              <ul className={styles.notesList}>
                <li>請提前規劃交通路線</li>
                <li>建議提前 30 分鐘到達活動地點</li>
                <li>如有停車需求，請提前了解停車資訊</li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      <div className={styles.actions}>
        <Button
          onClick={onEdit}
          variant="outline"
          disabled={loading}
          className={styles.editButton}
        >
          重新選擇
        </Button>
        <Button
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
          className={styles.confirmButton}
        >
          確認登記
        </Button>
      </div>

      <div className={styles.cancelSection}>
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={loading}
          className={styles.cancelButton}
        >
          取消交通車登記
        </Button>
        <p className={styles.cancelNote}>
          取消後您可以稍後重新登記交通車
        </p>
      </div>
    </div>
  );
};

export default TransportConfirmation;