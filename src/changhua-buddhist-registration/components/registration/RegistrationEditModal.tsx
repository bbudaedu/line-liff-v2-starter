/**
 * 報名資料編輯模態框元件
 * Registration Data Edit Modal Component
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Registration } from '../../types';
import { validatePersonalInfo } from '../../utils/form-validation';
import styles from './RegistrationEditModal.module.css';

interface RegistrationWithDetails extends Registration {
  eventName?: string;
  eventDate?: Date;
  eventLocation?: string;
  canEdit?: boolean;
  canCancel?: boolean;
  reminders?: string[];
}

interface RegistrationEditModalProps {
  registration: RegistrationWithDetails;
  identity: 'monk' | 'volunteer' | null;
  onSave: (updatedData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const RegistrationEditModal: React.FC<RegistrationEditModalProps> = ({
  registration,
  identity,
  onSave,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: registration.personalInfo.name || '',
    phone: registration.personalInfo.phone || '',
    templeName: registration.personalInfo.templeName || '',
    emergencyContact: registration.personalInfo.emergencyContact || '',
    specialRequirements: registration.personalInfo.specialRequirements || '',
    transportRequired: registration.transport?.required || false,
    transportLocationId: registration.transport?.locationId || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 檢查是否有變更
  useEffect(() => {
    const originalData = {
      name: registration.personalInfo.name || '',
      phone: registration.personalInfo.phone || '',
      templeName: registration.personalInfo.templeName || '',
      emergencyContact: registration.personalInfo.emergencyContact || '',
      specialRequirements: registration.personalInfo.specialRequirements || '',
      transportRequired: registration.transport?.required || false,
      transportLocationId: registration.transport?.locationId || '',
    };

    const changed = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== originalData[key as keyof typeof originalData]
    );

    setHasChanges(changed);
  }, [formData, registration]);

  // 處理輸入變更
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除該欄位的錯誤
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 驗證表單
  const validateForm = () => {
    const personalInfo = {
      name: formData.name,
      phone: formData.phone,
      templeName: formData.templeName,
      emergencyContact: formData.emergencyContact,
      specialRequirements: formData.specialRequirements,
    };

    const validationErrors = validatePersonalInfo(personalInfo, identity || 'volunteer');
    setErrors(validationErrors as Record<string, string>);
    return Object.keys(validationErrors).length === 0;
  };

  // 處理保存
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updatedData = {
      personalInfo: {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\s/g, ''),
        templeName: formData.templeName.trim() || undefined,
        emergencyContact: formData.emergencyContact.trim() || undefined,
        specialRequirements: formData.specialRequirements.trim() || undefined,
      },
      transport: {
        required: formData.transportRequired,
        locationId: formData.transportRequired ? formData.transportLocationId : undefined,
      }
    };

    onSave(updatedData);
  };

  // 處理鍵盤事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
        <Card className={styles.modalCard}>
          <div className={styles.modalHeader}>
            <h2>修改報名資料</h2>
            <button 
              className={styles.closeButton}
              onClick={onCancel}
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.eventInfo}>
              <h3>{registration.eventName}</h3>
              {registration.eventDate && (
                <p>活動日期：{registration.eventDate.toLocaleDateString('zh-TW')}</p>
              )}
            </div>

            <form className={styles.form}>
              {/* 基本資料 */}
              <div className={styles.section}>
                <h4>基本資料</h4>
                
                <div className={styles.formGroup}>
                  <Input
                    label="姓名"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={errors.name}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <Input
                    label="聯絡電話"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    error={errors.phone}
                    required
                    disabled={loading}
                  />
                </div>

                {identity === 'monk' && (
                  <div className={styles.formGroup}>
                    <Input
                      label="寺院名稱"
                      value={formData.templeName}
                      onChange={(e) => handleInputChange('templeName', e.target.value)}
                      error={errors.templeName}
                      disabled={loading}
                    />
                  </div>
                )}

                {identity === 'volunteer' && (
                  <div className={styles.formGroup}>
                    <Input
                      label="緊急聯絡人"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      error={errors.emergencyContact}
                      disabled={loading}
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.textareaLabel}>
                    特殊需求
                  </label>
                  <textarea
                    className={styles.textarea}
                    value={formData.specialRequirements}
                    onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                    placeholder="如有特殊飲食需求或身體狀況請說明"
                    disabled={loading}
                    rows={3}
                  />
                  {errors.specialRequirements && (
                    <span className={styles.errorText}>{errors.specialRequirements}</span>
                  )}
                </div>
              </div>

              {/* 交通車資訊 */}
              <div className={styles.section}>
                <h4>交通車資訊</h4>
                
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.transportRequired}
                      onChange={(e) => handleInputChange('transportRequired', e.target.checked)}
                      disabled={loading}
                    />
                    <span className={styles.checkboxText}>需要交通車</span>
                  </label>
                </div>

                {formData.transportRequired && (
                  <div className={styles.formGroup}>
                    <Input
                      label="上車地點"
                      value={formData.transportLocationId}
                      onChange={(e) => handleInputChange('transportLocationId', e.target.value)}
                      error={errors.transportLocationId}
                      placeholder="請選擇上車地點"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className={styles.modalFooter}>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              取消
            </Button>
            
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || !hasChanges}
            >
              {loading ? '儲存中...' : '儲存變更'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationEditModal;