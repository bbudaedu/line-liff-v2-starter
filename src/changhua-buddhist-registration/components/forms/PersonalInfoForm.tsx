import React, { useState, useEffect, useCallback } from 'react';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { validatePersonalInfo, PersonalInfoFormData, PersonalInfoErrors } from '@/utils/form-validation';
import { saveFormData, loadFormData, clearFormData } from '@/utils/form-storage';
import styles from './PersonalInfoForm.module.css';

export interface PersonalInfoFormProps {
  onSubmit: (data: PersonalInfoFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<PersonalInfoFormData>;
  isLoading?: boolean;
  submitError?: string;
  className?: string;
}

export function PersonalInfoForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  submitError,
  className = ''
}: PersonalInfoFormProps) {
  const { identity, isMonk, isVolunteer, getIdentityDisplayName } = useIdentityContext();
  
  // 表單資料狀態
  const [formData, setFormData] = useState<PersonalInfoFormData>({
    // 共同欄位
    name: '',
    idNumber: '',
    birthDate: '',
    phone: '',
    specialRequirements: '',
    
    // 法師專用欄位
    dharmaName: '',
    templeName: '',
    
    // 志工專用欄位 - 無額外欄位，使用共同欄位即可
  });

  // 表單驗證錯誤狀態
  const [errors, setErrors] = useState<PersonalInfoErrors>({});
  
  // 表單是否已修改
  const [isDirty, setIsDirty] = useState(false);
  
  // 自動儲存狀態
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 表單儲存鍵值
  const formStorageKey = `personal-info-${identity}`;

  // 載入初始資料
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    } else {
      // 嘗試從本地儲存載入資料
      const savedData = loadFormData(formStorageKey);
      if (savedData) {
        setFormData(prev => ({ ...prev, ...savedData }));
        setIsDirty(true);
      }
    }
  }, [initialData, formStorageKey]);

  // 自動儲存功能
  const autoSave = useCallback(async () => {
    if (!isDirty) return;
    
    try {
      setAutoSaveStatus('saving');
      await saveFormData(formStorageKey, formData);
      setAutoSaveStatus('saved');
      
      // 2秒後重置狀態
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Auto save failed:', error);
      setAutoSaveStatus('error');
    }
  }, [formStorageKey, formData, isDirty]);

  // 自動儲存定時器
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setTimeout(autoSave, 1000); // 1秒後自動儲存
    return () => clearTimeout(timer);
  }, [formData, autoSave, isDirty]);

  // 處理輸入變更
  const handleInputChange = (field: keyof PersonalInfoFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    setIsDirty(true);
    
    // 清除該欄位的錯誤
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // 即時驗證
  const handleBlur = (field: keyof PersonalInfoFormData) => {
    const fieldErrors = validatePersonalInfo({ [field]: formData[field] }, identity || 'volunteer');
    if (fieldErrors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: fieldErrors[field]
      }));
    }
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 完整表單驗證
    const validationErrors = validatePersonalInfo(formData, identity || 'volunteer');
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // 清除錯誤狀態
    setErrors({});
    
    // 清除本地儲存的資料
    clearFormData(formStorageKey);
    
    // 提交表單
    onSubmit(formData);
  };

  // 處理取消
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // 清除表單
  const handleClear = () => {
    setFormData({
      name: '',
      idNumber: '',
      birthDate: '',
      phone: '',
      specialRequirements: '',
      dharmaName: '',
      templeName: ''
    });
    setErrors({});
    setIsDirty(false);
    clearFormData(formStorageKey);
  };

  if (!identity) {
    return (
      <Alert variant="warning">
        請先選擇您的身份類型
      </Alert>
    );
  }

  return (
    <Card className={`${styles.formContainer} ${className}`}>
      <div className={styles.formHeader}>
        <h2 className={styles.title}>個人資料填寫</h2>
        <div className={styles.identityBadge}>
          <span className={styles.identityLabel}>身份：</span>
          <span className={styles.identityValue}>{getIdentityDisplayName()}</span>
        </div>
        
        {/* 自動儲存狀態指示器 */}
        <div className={styles.autoSaveStatus}>
          {autoSaveStatus === 'saving' && (
            <span className={styles.saving}>
              <LoadingSpinner size="sm" />
              儲存中...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className={styles.saved}>✓ 已自動儲存</span>
          )}
          {autoSaveStatus === 'error' && (
            <span className={styles.saveError}>⚠ 儲存失敗</span>
          )}
        </div>
      </div>

      {submitError && (
        <Alert variant="error" className={styles.submitError}>
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className={styles.form} role="form">
        {/* 法師專用欄位 */}
        {isMonk && (
          <>
            <Input
              label="法名"
              value={formData.dharmaName || ''}
              onChange={(e) => handleInputChange('dharmaName', e.target.value)}
              onBlur={() => handleBlur('dharmaName')}
              error={errors.dharmaName}
              placeholder="請輸入您的法名"
              required
              fullWidth
            />

            <Input
              label="俗名"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              error={errors.name}
              placeholder="請輸入您的俗名"
              required
              fullWidth
            />

            <Input
              label="道場名稱"
              value={formData.templeName || ''}
              onChange={(e) => handleInputChange('templeName', e.target.value)}
              onBlur={() => handleBlur('templeName')}
              error={errors.templeName}
              placeholder="請輸入您所屬的道場名稱"
              required
              fullWidth
            />
          </>
        )}

        {/* 志工專用欄位 */}
        {isVolunteer && (
          <Input
            label="姓名"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            error={errors.name}
            placeholder="請輸入您的姓名"
            required
            fullWidth
          />
        )}

        {/* 共同欄位 */}
        <Input
          label="身分證字號"
          value={formData.idNumber}
          onChange={(e) => handleInputChange('idNumber', e.target.value.toUpperCase())}
          onBlur={() => handleBlur('idNumber')}
          error={errors.idNumber}
          placeholder="請輸入身分證字號"
          required
          fullWidth
          maxLength={10}
        />

        <Input
          label="出生年月日"
          type="date"
          value={formData.birthDate}
          onChange={(e) => handleInputChange('birthDate', e.target.value)}
          onBlur={() => handleBlur('birthDate')}
          error={errors.birthDate}
          required
          fullWidth
        />

        <Input
          label="聯絡電話"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          error={errors.phone}
          placeholder="請輸入聯絡電話"
          required
          fullWidth
        />

        <div className={styles.textareaGroup}>
          <label htmlFor="specialRequirements" className={styles.textareaLabel}>
            特殊需求
          </label>
          <textarea
            id="specialRequirements"
            value={formData.specialRequirements || ''}
            onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
            onBlur={() => handleBlur('specialRequirements')}
            placeholder="如有特殊飲食需求、行動不便或其他需要協助的事項，請在此說明"
            className={styles.textarea}
            rows={4}
          />
          {errors.specialRequirements && (
            <span className={styles.textareaError}>{errors.specialRequirements}</span>
          )}
        </div>

        {/* 表單操作按鈕 */}
        <div className={styles.formActions}>
          <div className={styles.primaryActions}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              loading={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? '提交中...' : '確認提交'}
            </Button>
          </div>

          <div className={styles.secondaryActions}>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                取消
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isLoading}
            >
              清除表單
            </Button>
          </div>
        </div>
      </form>

      {/* 表單說明 */}
      <div className={styles.formFooter}>
        <div className={styles.helpText}>
          <p>• 所有標示 * 的欄位均為必填</p>
          <p>• 表單資料會自動儲存，避免意外遺失</p>
          <p>• 提交前請仔細檢查所有資料是否正確</p>
        </div>
      </div>
    </Card>
  );
}

export default PersonalInfoForm;