import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { USER_IDENTITY, STORAGE_KEYS, SUCCESS_MESSAGES } from '@/utils/constants';
import { storage } from '@/utils/helpers';
import styles from './IdentitySelection.module.css';

interface IdentitySelectionProps {
  onIdentitySelected: (identity: 'monk' | 'volunteer') => void;
  currentIdentity?: 'monk' | 'volunteer' | null;
  showWelcome?: boolean;
  className?: string;
}

interface IdentityOption {
  value: 'monk' | 'volunteer';
  label: string;
  description: string;
  icon: string;
  features: string[];
}

const IDENTITY_OPTIONS: IdentityOption[] = [
  {
    value: USER_IDENTITY.MONK,
    label: '法師',
    description: '寺院法師報名',
    icon: '🙏',
    features: [
      '填寫寺院資訊',
      '法師專屬報名選項',
      '特殊需求說明',
      '交通車安排'
    ]
  },
  {
    value: USER_IDENTITY.VOLUNTEER,
    label: '志工',
    description: '護持志工報名',
    icon: '🤝',
    features: [
      '填寫緊急聯絡人',
      '志工專屬報名選項',
      '特殊需求說明',
      '交通車安排'
    ]
  }
];

export function IdentitySelection({
  onIdentitySelected,
  currentIdentity,
  showWelcome = true,
  className
}: IdentitySelectionProps) {
  const [selectedIdentity, setSelectedIdentity] = useState<'monk' | 'volunteer' | null>(currentIdentity || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    // 檢查是否為首次訪問
    const hasVisited = storage.get('hasVisitedBefore');
    setIsFirstVisit(!hasVisited);
    
    // 如果有當前身份，設定選中狀態
    if (currentIdentity) {
      setSelectedIdentity(currentIdentity);
    }
  }, [currentIdentity]);

  const handleIdentitySelect = (identity: 'monk' | 'volunteer') => {
    setSelectedIdentity(identity);
  };

  const handleConfirmSelection = async () => {
    if (!selectedIdentity) return;

    setIsLoading(true);
    
    try {
      // 儲存身份到本地儲存
      storage.set(STORAGE_KEYS.USER_IDENTITY, selectedIdentity);
      
      // 標記已訪問過
      storage.set('hasVisitedBefore', true);
      
      // 顯示成功訊息
      setShowSuccess(true);
      
      // 延遲執行回調，讓使用者看到成功訊息
      setTimeout(() => {
        onIdentitySelected(selectedIdentity);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving identity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeIdentity = () => {
    setSelectedIdentity(null);
    setShowSuccess(false);
  };

  if (showSuccess) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <Alert
          variant="success"
          title="身份設定完成"
          className={styles.successAlert}
        >
          {SUCCESS_MESSAGES.IDENTITY_SAVED}
        </Alert>
        <LoadingSpinner text="正在為您準備系統..." />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {showWelcome && isFirstVisit && (
        <div className={styles.welcome}>
          <h1 className={styles.title}>歡迎使用</h1>
          <h2 className={styles.subtitle}>彰化供佛齋僧活動報名系統</h2>
          <p className={styles.description}>
            請選擇您的身份類型，系統將為您提供相應的報名選項和功能
          </p>
        </div>
      )}

      {!showWelcome && (
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>選擇身份類型</h2>
          <p className={styles.sectionDescription}>
            請選擇您的身份，以便系統提供適合的報名選項
          </p>
        </div>
      )}

      <div className={styles.optionsContainer}>
        {IDENTITY_OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={`${styles.identityCard} ${
              selectedIdentity === option.value ? styles.selected : ''
            }`}
            onClick={() => handleIdentitySelect(option.value)}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.icon}>{option.icon}</div>
                <div className={styles.labelContainer}>
                  <h3 className={styles.label}>{option.label}</h3>
                  <p className={styles.optionDescription}>{option.description}</p>
                </div>
              </div>
              
              <div className={styles.features}>
                <h4 className={styles.featuresTitle}>包含功能：</h4>
                <ul className={styles.featuresList}>
                  {option.features.map((feature, index) => (
                    <li key={index} className={styles.feature}>
                      <span className={styles.featureIcon}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {selectedIdentity === option.value && (
              <div className={styles.selectedIndicator}>
                <span className={styles.checkmark}>✓</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className={styles.actions}>
        {selectedIdentity && (
          <>
            <Button
              onClick={handleConfirmSelection}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              size="lg"
              className={styles.confirmButton}
            >
              {isLoading ? '設定中...' : '確認選擇'}
            </Button>
            
            {currentIdentity && (
              <Button
                onClick={handleChangeIdentity}
                variant="outline"
                size="md"
                className={styles.changeButton}
              >
                重新選擇
              </Button>
            )}
          </>
        )}
      </div>

      {!selectedIdentity && (
        <div className={styles.hint}>
          <p>請點選上方選項來選擇您的身份類型</p>
        </div>
      )}
    </div>
  );
}

export default IdentitySelection;