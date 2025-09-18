import React, { useState, useEffect, useCallback } from 'react';
import { TransportOption } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { TransportService } from '../../services/transport';
import styles from './TransportSelection.module.css';

interface TransportSelectionProps {
  eventId: string;
  selectedLocationId?: string | null;
  onLocationSelect: (locationId: string | null) => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string;
}

export const TransportSelection: React.FC<TransportSelectionProps> = ({
  eventId,
  selectedLocationId,
  onLocationSelect,
  onConfirm,
  loading = false,
  error
}) => {
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchTransportOptions();
  }, [eventId]);

  // 即時更新座位資訊
  useEffect(() => {
    if (!transportOptions || transportOptions.length === 0) return;

    const updateSeats = async () => {
      try {
        setIsUpdating(true);
        const locationIds = transportOptions.map(option => option.id);
        const updatedOptions = await TransportService.batchUpdateSeatAvailability(locationIds);
        
        // 更新座位資訊但保持其他資料不變
        setTransportOptions(prevOptions => 
          prevOptions.map(option => {
            const updated = updatedOptions.find(u => u.id === option.id);
            return updated ? { ...option, bookedSeats: updated.bookedSeats } : option;
          })
        );
      } catch (error) {
        console.error('Failed to update seat availability:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    // 立即更新一次
    updateSeats();
    
    // 每 30 秒更新一次座位資訊
    const interval = setInterval(updateSeats, 30000);
    
    return () => clearInterval(interval);
  }, [transportOptions?.length]);

  const fetchTransportOptions = async () => {
    try {
      setIsLoading(true);
      setFetchError('');
      
      // Try to fetch from API first, fallback to mock data
      try {
        const options = await TransportService.getTransportOptions(eventId);
        setTransportOptions(options);
      } catch (apiError) {
        console.warn('API call failed, using mock data:', apiError);
        
        // Mock data fallback
        const mockOptions: TransportOption[] = [
          {
            id: 'location-1',
            eventId,
            name: '彰化火車站',
            address: '彰化縣彰化市三民路1號',
            pickupTime: new Date('2024-01-15T07:30:00'),
            maxSeats: 45,
            bookedSeats: 32,
            coordinates: { lat: 24.0818, lng: 120.5387 }
          },
          {
            id: 'location-2',
            eventId,
            name: '員林轉運站',
            address: '彰化縣員林市中山路二段556號',
            pickupTime: new Date('2024-01-15T08:00:00'),
            maxSeats: 45,
            bookedSeats: 45,
            coordinates: { lat: 23.9588, lng: 120.5736 }
          },
          {
            id: 'location-3',
            eventId,
            name: '鹿港老街',
            address: '彰化縣鹿港鎮中山路',
            pickupTime: new Date('2024-01-15T07:45:00'),
            maxSeats: 35,
            bookedSeats: 28,
            coordinates: { lat: 24.0576, lng: 120.4342 }
          }
        ];
        
        setTransportOptions(mockOptions);
      }
    } catch (err) {
      setFetchError('無法載入交通車資訊，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = useCallback(async (locationId: string) => {
    // 檢查地點是否仍然可用
    if (!transportOptions) return;
    const option = transportOptions.find(opt => opt.id === locationId);
    if (option && isLocationFull(option)) {
      setFetchError('此地點已額滿，請選擇其他地點');
      return;
    }

    // 即時檢查可用性
    try {
      const isAvailable = await TransportService.checkLocationAvailability(locationId);
      if (!isAvailable) {
        setFetchError('此地點已額滿，請選擇其他地點');
        // 更新該地點的座位資訊
        const updatedOption = await TransportService.updateSeatAvailability(locationId);
        setTransportOptions(prev => 
          prev.map(opt => opt.id === locationId ? updatedOption : opt)
        );
        return;
      }
    } catch (error) {
      console.warn('Failed to check location availability:', error);
    }

    if (selectedLocationId === locationId) {
      onLocationSelect(null); // 取消選擇
    } else {
      onLocationSelect(locationId);
    }
    
    setFetchError(''); // 清除錯誤訊息
  }, [selectedLocationId, transportOptions, onLocationSelect]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getAvailableSeats = (option: TransportOption) => {
    return option.maxSeats - option.bookedSeats;
  };

  const isLocationFull = (option: TransportOption) => {
    return getAvailableSeats(option) <= 0;
  };

  const getAlternativeOptions = (fullLocationId: string) => {
    if (!transportOptions) return [];
    return transportOptions.filter(option => 
      option.id !== fullLocationId && !isLocationFull(option)
    ).slice(0, 2); // 最多顯示 2 個替代選項
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <LoadingSpinner text="載入交通車資訊中..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>選擇上車地點</h2>
        <p className={styles.subtitle}>請選擇最方便的上車地點，我們將為您安排交通車</p>
        {isUpdating && (
          <div className={styles.updateIndicator}>
            <span className={styles.updateText}>更新座位資訊中...</span>
          </div>
        )}
      </div>

      {(error || fetchError) && (
        <Alert variant="error">{error || fetchError}</Alert>
      )}

      <div className={styles.optionsList}>
        {transportOptions && transportOptions.map((option) => {
          const availableSeats = getAvailableSeats(option);
          const isFull = isLocationFull(option);
          const isSelected = selectedLocationId === option.id;

          return (
            <Card
              key={option.id}
              className={`${styles.optionCard} ${
                isSelected ? styles.selected : ''
              } ${isFull ? styles.full : ''}`}
              onClick={() => !isFull && handleLocationSelect(option.id)}
            >
              <div className={styles.optionHeader}>
                <h3 className={styles.locationName}>{option.name}</h3>
                <div className={styles.statusBadge}>
                  {isFull ? (
                    <span className={styles.fullBadge}>已額滿</span>
                  ) : (
                    <span className={styles.availableBadge}>
                      剩餘 {availableSeats} 位
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.optionDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>上車時間：</span>
                  <span className={styles.detailValue}>
                    {formatTime(option.pickupTime)}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>上車地點：</span>
                  <span className={styles.detailValue}>{option.address}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>座位狀況：</span>
                  <span className={styles.detailValue}>
                    {option.bookedSeats}/{option.maxSeats} 已預訂
                  </span>
                </div>
              </div>

              {isFull && (
                <div className={styles.fullMessage}>
                  此地點已額滿，請選擇其他地點
                  {getAlternativeOptions(option.id).length > 0 && (
                    <div className={styles.alternatives}>
                      建議選擇：{getAlternativeOptions(option.id).map(alt => alt.name).join('、')}
                    </div>
                  )}
                </div>
              )}

              {isSelected && !isFull && (
                <div className={styles.selectedIndicator}>
                  ✓ 已選擇此地點
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className={styles.noTransportOption}>
        <Card
          className={`${styles.optionCard} ${
            selectedLocationId === null ? styles.selected : ''
          }`}
          onClick={() => onLocationSelect(null)}
        >
          <div className={styles.optionHeader}>
            <h3 className={styles.locationName}>不需要交通車</h3>
          </div>
          <div className={styles.optionDetails}>
            <p className={styles.noTransportText}>
              我將自行前往活動地點
            </p>
          </div>
          {selectedLocationId === null && (
            <div className={styles.selectedIndicator}>
              ✓ 已選擇自行前往
            </div>
          )}
        </Card>
      </div>

      <div className={styles.actions}>
        <Button
          onClick={onConfirm}
          disabled={loading}
          loading={loading}
          className={styles.confirmButton}
        >
          確認選擇
        </Button>
      </div>
    </div>
  );
};

export default TransportSelection;