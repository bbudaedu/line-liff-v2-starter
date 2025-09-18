/**
 * 報名記錄卡片元件測試
 * Registration Card Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RegistrationCard from '../../../components/registration/RegistrationCard';
import { Registration } from '../../../types';

describe('RegistrationCard Component', () => {
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
    eventLocation: '彰化某寺院',
    canEdit: true,
    canCancel: true,
    reminders: ['活動將在 7 天後舉行', '請準時到達指定的交通車上車地點']
  };

  const mockOnEdit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本顯示', () => {
    it('應該正確顯示活動資訊', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText('供佛齋僧活動')).toBeInTheDocument();
      expect(screen.getByText(/ORDER-123/)).toBeInTheDocument();
      expect(screen.getByText('已確認')).toBeInTheDocument();
      expect(screen.getByText('彰化某寺院')).toBeInTheDocument();
    });

    it('應該正確顯示個人資料', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText('測試使用者')).toBeInTheDocument();
      expect(screen.getByText('0912345678')).toBeInTheDocument();
      expect(screen.getByText('0987654321')).toBeInTheDocument();
      expect(screen.getByText('素食')).toBeInTheDocument();
      expect(screen.getByText('志工')).toBeInTheDocument();
    });

    it('應該正確顯示交通車資訊', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText('需要交通車：')).toBeInTheDocument();
      expect(screen.getByText('是')).toBeInTheDocument();
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();
      expect(screen.getByText('下午03:30')).toBeInTheDocument(); // UTC+8 時間
    });

    it('應該正確顯示不需要交通車的情況', () => {
      // Arrange
      const registrationWithoutTransport = {
        ...mockRegistration,
        transport: { required: false }
      };

      // Act
      render(<RegistrationCard registration={registrationWithoutTransport} />);

      // Assert
      expect(screen.getByText('不需要交通車')).toBeInTheDocument();
    });
  });

  describe('狀態顯示', () => {
    it('應該正確顯示已確認狀態', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      const statusElement = screen.getByText('已確認');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement.parentElement).toHaveClass('statusConfirmed');
    });

    it('應該正確顯示處理中狀態', () => {
      // Arrange
      const pendingRegistration = {
        ...mockRegistration,
        status: 'pending' as const
      };

      // Act
      render(<RegistrationCard registration={pendingRegistration} />);

      // Assert
      const statusElement = screen.getByText('處理中');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement.parentElement).toHaveClass('statusPending');
    });

    it('應該正確顯示已取消狀態', () => {
      // Arrange
      const cancelledRegistration = {
        ...mockRegistration,
        status: 'cancelled' as const
      };

      // Act
      render(<RegistrationCard registration={cancelledRegistration} />);

      // Assert
      const statusElement = screen.getByText('已取消');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement.parentElement).toHaveClass('statusCancelled');
    });
  });

  describe('身份類型顯示', () => {
    it('應該正確顯示法師身份和相關資訊', () => {
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
      render(<RegistrationCard registration={monkRegistration} />);

      // Assert
      expect(screen.getByText('法師')).toBeInTheDocument();
      expect(screen.getByText('測試寺院')).toBeInTheDocument();
      expect(screen.queryByText('緊急聯絡人')).not.toBeInTheDocument();
    });

    it('應該正確顯示志工身份和相關資訊', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText('志工')).toBeInTheDocument();
      expect(screen.getByText('0987654321')).toBeInTheDocument();
      expect(screen.queryByText('寺院')).not.toBeInTheDocument();
    });
  });

  describe('提醒訊息', () => {
    it('應該正確顯示提醒訊息', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText('重要提醒')).toBeInTheDocument();
      expect(screen.getByText('活動將在 7 天後舉行')).toBeInTheDocument();
      expect(screen.getByText('請準時到達指定的交通車上車地點')).toBeInTheDocument();
    });

    it('應該隱藏提醒區塊當沒有提醒時', () => {
      // Arrange
      const registrationWithoutReminders = {
        ...mockRegistration,
        reminders: []
      };

      // Act
      render(<RegistrationCard registration={registrationWithoutReminders} />);

      // Assert
      expect(screen.queryByText('重要提醒')).not.toBeInTheDocument();
    });
  });

  describe('操作按鈕', () => {
    it('應該顯示編輯和取消按鈕當可操作時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.getByText('修改資料')).toBeInTheDocument();
      expect(screen.getByText('取消報名')).toBeInTheDocument();
    });

    it('應該隱藏操作按鈕當報名已取消時', () => {
      // Arrange
      const cancelledRegistration = {
        ...mockRegistration,
        status: 'cancelled' as const
      };

      // Act
      render(
        <RegistrationCard
          registration={cancelledRegistration}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.queryByText('修改資料')).not.toBeInTheDocument();
      expect(screen.queryByText('取消報名')).not.toBeInTheDocument();
    });

    it('應該只顯示編輯按鈕當只提供編輯功能時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onEdit={mockOnEdit}
        />
      );

      // Assert
      expect(screen.getByText('修改資料')).toBeInTheDocument();
      expect(screen.queryByText('取消報名')).not.toBeInTheDocument();
    });

    it('應該只顯示取消按鈕當只提供取消功能時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onCancel={mockOnCancel}
        />
      );

      // Assert
      expect(screen.queryByText('修改資料')).not.toBeInTheDocument();
      expect(screen.getByText('取消報名')).toBeInTheDocument();
    });

    it('應該調用編輯回調當點擊編輯按鈕時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onEdit={mockOnEdit}
        />
      );

      fireEvent.click(screen.getByText('修改資料'));

      // Assert
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('應該調用取消回調當點擊取消按鈕時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('取消報名'));

      // Assert
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('載入狀態', () => {
    it('應該禁用按鈕當載入中時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      // Assert
      const buttons = screen.getAllByText('處理中...');
      expect(buttons).toHaveLength(2);
      
      buttons.forEach(button => {
        expect(button.closest('button')).toBeDisabled();
      });
    });

    it('應該顯示正常按鈕文字當未載入時', () => {
      // Act
      render(
        <RegistrationCard
          registration={mockRegistration}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
          loading={false}
        />
      );

      // Assert
      expect(screen.getByText('修改資料')).toBeInTheDocument();
      expect(screen.getByText('取消報名')).toBeInTheDocument();
    });
  });

  describe('日期格式化', () => {
    it('應該正確格式化活動日期', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText(/2024年12月25日/)).toBeInTheDocument();
    });

    it('應該正確格式化報名時間', () => {
      // Act
      render(<RegistrationCard registration={mockRegistration} />);

      // Assert
      expect(screen.getByText(/2024年12月1日/)).toBeInTheDocument();
      expect(screen.getByText(/下午06:00/)).toBeInTheDocument(); // UTC+8 時間
    });
  });

  describe('缺失資料處理', () => {
    it('應該處理缺失的活動名稱', () => {
      // Arrange
      const registrationWithoutEventName = {
        ...mockRegistration,
        eventName: undefined
      };

      // Act
      render(<RegistrationCard registration={registrationWithoutEventName} />);

      // Assert
      expect(screen.getByText('活動 event-123')).toBeInTheDocument();
    });

    it('應該處理缺失的訂單號', () => {
      // Arrange
      const registrationWithoutOrderCode = {
        ...mockRegistration,
        pretixOrderId: undefined
      };

      // Act
      render(<RegistrationCard registration={registrationWithoutOrderCode} />);

      // Assert
      expect(screen.queryByText(/訂單號/)).not.toBeInTheDocument();
    });

    it('應該處理缺失的特殊需求', () => {
      // Arrange
      const registrationWithoutSpecialRequirements = {
        ...mockRegistration,
        personalInfo: {
          ...mockRegistration.personalInfo,
          specialRequirements: undefined
        }
      };

      // Act
      render(<RegistrationCard registration={registrationWithoutSpecialRequirements} />);

      // Assert
      expect(screen.queryByText('特殊需求')).not.toBeInTheDocument();
    });
  });
});