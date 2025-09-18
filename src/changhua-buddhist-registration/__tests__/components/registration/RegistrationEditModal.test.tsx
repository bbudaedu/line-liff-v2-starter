/**
 * 報名資料編輯模態框元件測試
 * Registration Edit Modal Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegistrationEditModal from '../../../components/registration/RegistrationEditModal';
import { Registration } from '../../../types';
import * as formValidation from '../../../utils/form-validation';

// Mock form validation
jest.mock('../../../utils/form-validation');

const mockValidatePersonalInfo = formValidation.validatePersonalInfo as jest.MockedFunction<typeof formValidation.validatePersonalInfo>;

describe('RegistrationEditModal Component', () => {
  const mockRegistration: Registration & {
    eventName?: string;
    eventDate?: Date;
    eventLocation?: string;
    canEdit?: boolean;
    canCancel?: boolean;
    reminders?: string[];
  } = {
    id: 'reg-123',
    userId: 'user-123',
    eventId: 'event-123',
    identity: 'volunteer',
    personalInfo: {
      name: '測試使用者',
      phone: '0912345678',
      emergencyContact: '0987654321',
      specialRequirements: '素食'
    },
    transport: {
      required: true,
      locationId: '彰化火車站',
      pickupTime: new Date('2024-12-25T07:30:00Z')
    },
    pretixOrderId: 'ORDER-123',
    status: 'confirmed',
    createdAt: new Date('2024-12-01T10:00:00Z'),
    updatedAt: new Date('2024-12-01T10:00:00Z'),
    eventName: '供佛齋僧活動',
    eventDate: new Date('2024-12-25T09:00:00Z'),
    eventLocation: '彰化某寺院'
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePersonalInfo.mockReturnValue({});
  });

  describe('基本顯示', () => {
    it('應該正確顯示模態框標題和活動資訊', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByText('修改報名資料')).toBeInTheDocument();
      expect(screen.getByText('供佛齋僧活動')).toBeInTheDocument();
      expect(screen.getByText(/活動日期：.*2024.*12.*25/)).toBeInTheDocument();
    });

    it('應該預填現有的表單資料', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByDisplayValue('測試使用者')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0912345678')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0987654321')).toBeInTheDocument();
      expect(screen.getByDisplayValue('素食')).toBeInTheDocument();
      expect(screen.getByDisplayValue('彰化火車站')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { checked: true })).toBeInTheDocument();
    });

    it('應該顯示關閉按鈕', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('志工身份表單', () => {
    it('應該顯示志工專用欄位', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByLabelText('姓名')).toBeInTheDocument();
      expect(screen.getByLabelText('聯絡電話')).toBeInTheDocument();
      expect(screen.getByLabelText('緊急聯絡人')).toBeInTheDocument();
      expect(screen.getByLabelText('特殊需求')).toBeInTheDocument();
      expect(screen.queryByLabelText('寺院名稱')).not.toBeInTheDocument();
    });
  });

  describe('法師身份表單', () => {
    it('應該顯示法師專用欄位', () => {
      // Arrange
      const monkRegistration = {
        ...mockRegistration,
        identity: 'monk' as const,
        personalInfo: {
          ...mockRegistration.personalInfo,
          templeName: '測試寺院',
          emergencyContact: undefined
        }
      };

      // Act
      render(
        <RegistrationEditModal
          registration={monkRegistration}
          identity="monk"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByLabelText('姓名')).toBeInTheDocument();
      expect(screen.getByLabelText('聯絡電話')).toBeInTheDocument();
      expect(screen.getByLabelText('寺院名稱')).toBeInTheDocument();
      expect(screen.getByLabelText('特殊需求')).toBeInTheDocument();
      expect(screen.queryByLabelText('緊急聯絡人')).not.toBeInTheDocument();
    });
  });

  describe('交通車選項', () => {
    it('應該正確顯示交通車選項', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByText('需要交通車')).toBeInTheDocument();
      expect(screen.getByLabelText('上車地點')).toBeInTheDocument();
    });

    it('應該隱藏上車地點當不需要交通車時', () => {
      // Arrange
      const registrationWithoutTransport = {
        ...mockRegistration,
        transport: { required: false }
      };

      // Act
      render(
        <RegistrationEditModal
          registration={registrationWithoutTransport}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.queryByLabelText('上車地點')).not.toBeInTheDocument();
    });

    it('應該顯示上車地點當勾選需要交通車時', () => {
      // Arrange
      const registrationWithoutTransport = {
        ...mockRegistration,
        transport: { required: false }
      };

      // Act
      render(
        <RegistrationEditModal
          registration={registrationWithoutTransport}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 勾選需要交通車
      fireEvent.click(screen.getByText('需要交通車'));

      // Assert
      expect(screen.getByLabelText('上車地點')).toBeInTheDocument();
    });
  });

  describe('表單驗證', () => {
    it('應該顯示驗證錯誤', () => {
      // Arrange
      mockValidatePersonalInfo.mockReturnValue({
        name: '姓名為必填欄位',
        phone: '請輸入有效的電話號碼'
      });

      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 清空姓名欄位並嘗試儲存
      fireEvent.change(screen.getByDisplayValue('測試使用者'), { target: { value: '' } });
      fireEvent.click(screen.getByText('儲存變更'));

      // Assert
      expect(screen.getByText('姓名為必填欄位')).toBeInTheDocument();
      expect(screen.getByText('請輸入有效的電話號碼')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('應該清除錯誤當修正輸入時', () => {
      // Arrange
      mockValidatePersonalInfo
        .mockReturnValueOnce({ name: '姓名為必填欄位' })
        .mockReturnValueOnce({});

      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 清空姓名並嘗試儲存
      const nameInput = screen.getByDisplayValue('測試使用者');
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.click(screen.getByText('儲存變更'));

      expect(screen.getByText('姓名為必填欄位')).toBeInTheDocument();

      // 重新輸入姓名
      fireEvent.change(nameInput, { target: { value: '新姓名' } });

      // Assert
      expect(screen.queryByText('姓名為必填欄位')).not.toBeInTheDocument();
    });
  });

  describe('變更檢測', () => {
    it('應該禁用儲存按鈕當沒有變更時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByText('儲存變更')).toBeDisabled();
    });

    it('應該啟用儲存按鈕當有變更時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 修改姓名
      fireEvent.change(screen.getByDisplayValue('測試使用者'), { target: { value: '新姓名' } });

      // Assert
      expect(screen.getByText('儲存變更')).not.toBeDisabled();
    });
  });

  describe('儲存功能', () => {
    it('應該調用 onSave 並傳遞正確的資料', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 修改資料
      fireEvent.change(screen.getByDisplayValue('測試使用者'), { target: { value: '新姓名' } });
      fireEvent.change(screen.getByDisplayValue('0912345678'), { target: { value: '0911111111' } });
      fireEvent.change(screen.getByDisplayValue('素食'), { target: { value: '無特殊需求' } });

      // 儲存
      fireEvent.click(screen.getByText('儲存變更'));

      // Assert
      expect(mockOnSave).toHaveBeenCalledWith({
        personalInfo: {
          name: '新姓名',
          phone: '0911111111',
          emergencyContact: '0987654321',
          specialRequirements: '無特殊需求',
          templeName: undefined
        },
        transport: {
          required: true,
          locationId: '彰化火車站'
        }
      });
    });

    it('應該清理空白字串', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 修改為空白字串
      fireEvent.change(screen.getByDisplayValue('素食'), { target: { value: '   ' } });
      fireEvent.click(screen.getByText('儲存變更'));

      // Assert
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            specialRequirements: undefined
          })
        })
      );
    });

    it('應該移除電話號碼中的空格', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 修改電話號碼包含空格
      fireEvent.change(screen.getByDisplayValue('0912345678'), { target: { value: '091 234 5678' } });
      fireEvent.click(screen.getByText('儲存變更'));

      // Assert
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            phone: '0912345678'
          })
        })
      );
    });
  });

  describe('取消功能', () => {
    it('應該調用 onCancel 當點擊取消按鈕時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('取消'));

      // Assert
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('應該調用 onCancel 當點擊關閉按鈕時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('✕'));

      // Assert
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('應該調用 onCancel 當點擊背景時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByRole('dialog').parentElement!);

      // Assert
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('載入狀態', () => {
    it('應該禁用所有輸入和按鈕當載入中時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      // Assert
      expect(screen.getByDisplayValue('測試使用者')).toBeDisabled();
      expect(screen.getByDisplayValue('0912345678')).toBeDisabled();
      expect(screen.getByText('✕')).toBeDisabled();
      expect(screen.getByText('儲存中...')).toBeInTheDocument();
    });

    it('應該啟用所有輸入和按鈕當未載入時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          loading={false}
        />
      );

      // Assert
      expect(screen.getByDisplayValue('測試使用者')).not.toBeDisabled();
      expect(screen.getByDisplayValue('0912345678')).not.toBeDisabled();
      expect(screen.getByText('✕')).not.toBeDisabled();
    });
  });

  describe('鍵盤事件', () => {
    it('應該調用 onCancel 當按下 Escape 鍵時', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      // Assert
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('無障礙功能', () => {
    it('應該有正確的 ARIA 屬性', () => {
      // Act
      render(
        <RegistrationEditModal
          registration={mockRegistration}
          identity="volunteer"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('姓名')).toBeInTheDocument();
      expect(screen.getByLabelText('聯絡電話')).toBeInTheDocument();
    });
  });
});