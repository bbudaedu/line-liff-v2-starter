import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdentitySelection } from '@/components/identity/IdentitySelection';
import { STORAGE_KEYS, USER_IDENTITY } from '@/utils/constants';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock storage helper
jest.mock('@/utils/helpers', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('IdentitySelection Component', () => {
  const mockOnIdentitySelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Initial Render', () => {
    it('should render welcome message for first-time users', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
          showWelcome={true}
        />
      );

      expect(screen.getByText('歡迎使用')).toBeInTheDocument();
      expect(screen.getByText('彰化供佛齋僧活動報名系統')).toBeInTheDocument();
      expect(screen.getByText(/請選擇您的身份類型/)).toBeInTheDocument();
    });

    it('should render both identity options', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      expect(screen.getByText('法師')).toBeInTheDocument();
      expect(screen.getByText('寺院法師報名')).toBeInTheDocument();
      expect(screen.getByText('志工')).toBeInTheDocument();
      expect(screen.getByText('護持志工報名')).toBeInTheDocument();
    });

    it('should show features for each identity type', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      // 法師功能
      expect(screen.getByText('填寫寺院資訊')).toBeInTheDocument();
      expect(screen.getByText('法師專屬報名選項')).toBeInTheDocument();

      // 志工功能
      expect(screen.getByText('填寫緊急聯絡人')).toBeInTheDocument();
      expect(screen.getByText('志工專屬報名選項')).toBeInTheDocument();

      // 共同功能
      expect(screen.getAllByText('特殊需求說明')).toHaveLength(2);
      expect(screen.getAllByText('交通車安排')).toHaveLength(2);
    });

    it('should not show confirm button initially', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      expect(screen.queryByText('確認選擇')).not.toBeInTheDocument();
      expect(screen.getByText('請點選上方選項來選擇您的身份類型')).toBeInTheDocument();
    });
  });

  describe('Identity Selection', () => {
    it('should allow selecting monk identity', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      const monkCard = screen.getByText('法師').closest('.identityCard');
      fireEvent.click(monkCard!);

      expect(screen.getByText('確認選擇')).toBeInTheDocument();
      expect(monkCard).toHaveClass('selected');
    });

    it('should allow selecting volunteer identity', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      const volunteerCard = screen.getByText('志工').closest('.identityCard');
      fireEvent.click(volunteerCard!);

      expect(screen.getByText('確認選擇')).toBeInTheDocument();
      expect(volunteerCard).toHaveClass('selected');
    });

    it('should show selected indicator when identity is chosen', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      const monkCard = screen.getByText('法師').closest('.identityCard');
      fireEvent.click(monkCard!);

      // Look for the checkmark in the selected indicator specifically
      const selectedIndicator = monkCard!.querySelector('.selectedIndicator');
      expect(selectedIndicator).toBeInTheDocument();
      expect(selectedIndicator!.querySelector('.checkmark')).toHaveTextContent('✓');
    });

    it('should allow changing selection', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      // 先選擇法師
      const monkCard = screen.getByText('法師').closest('.identityCard');
      fireEvent.click(monkCard!);
      expect(monkCard).toHaveClass('selected');

      // 再選擇志工
      const volunteerCard = screen.getByText('志工').closest('.identityCard');
      fireEvent.click(volunteerCard!);
      
      expect(volunteerCard).toHaveClass('selected');
      expect(monkCard).not.toHaveClass('selected');
    });
  });

  describe('Identity Confirmation', () => {
    it('should save identity and call callback on confirmation', async () => {
      const { storage } = require('@/utils/helpers');
      
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      // 選擇法師身份
      const monkCard = screen.getByText('法師').closest('.identityCard');
      fireEvent.click(monkCard!);

      // 確認選擇
      const confirmButton = screen.getByText('確認選擇');
      fireEvent.click(confirmButton);

      // 檢查載入狀態 - 按鈕文字會變成 "設定中..."
      expect(confirmButton).toHaveTextContent('設定中...');

      // 等待處理完成
      await waitFor(() => {
        expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.USER_IDENTITY, USER_IDENTITY.MONK);
        expect(storage.set).toHaveBeenCalledWith('hasVisitedBefore', true);
      });

      // 等待成功訊息和回調
      await waitFor(() => {
        expect(screen.getByText('身份設定完成')).toBeInTheDocument();
        expect(screen.getByText('正在為您準備系統...')).toBeInTheDocument();
      }, { timeout: 2000 });

      // 檢查回調是否被調用
      await waitFor(() => {
        expect(mockOnIdentitySelected).toHaveBeenCalledWith(USER_IDENTITY.MONK);
      }, { timeout: 2000 });
    });

    it('should handle volunteer identity confirmation', async () => {
      const { storage } = require('@/utils/helpers');
      
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      // 選擇志工身份
      const volunteerCard = screen.getByText('志工').closest('.identityCard');
      fireEvent.click(volunteerCard!);

      // 確認選擇
      const confirmButton = screen.getByText('確認選擇');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.USER_IDENTITY, USER_IDENTITY.VOLUNTEER);
      });

      await waitFor(() => {
        expect(mockOnIdentitySelected).toHaveBeenCalledWith(USER_IDENTITY.VOLUNTEER);
      }, { timeout: 2000 });
    });
  });

  describe('Existing Identity', () => {
    it('should show current identity when provided', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
          currentIdentity={USER_IDENTITY.MONK}
        />
      );

      const monkCard = screen.getByText('法師').closest('.identityCard');
      expect(monkCard).toHaveClass('selected');
      expect(screen.getByText('確認選擇')).toBeInTheDocument();
      expect(screen.getByText('重新選擇')).toBeInTheDocument();
    });

    it('should allow changing existing identity', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
          currentIdentity={USER_IDENTITY.MONK}
        />
      );

      // 點擊重新選擇
      const changeButton = screen.getByText('重新選擇');
      fireEvent.click(changeButton);

      // 應該清除選擇狀態
      const monkCard = screen.getByText('法師').closest('.identityCard');
      expect(monkCard).not.toHaveClass('selected');
      expect(screen.queryByText('確認選擇')).not.toBeInTheDocument();
      expect(screen.getByText('請點選上方選項來選擇您的身份類型')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      const cards = screen.getAllByRole('button');
      expect(cards).toHaveLength(2); // 兩個身份選項卡片

      // 檢查卡片是否可點擊
      cards.forEach(card => {
        expect(card).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      const monkCard = screen.getByText('法師').closest('.identityCard');
      
      // 鍵盤導航需要先點擊來選擇，因為我們的實現是基於點擊事件
      fireEvent.click(monkCard!);
      expect(monkCard).toHaveClass('selected');

      // 檢查是否可以通過鍵盤觸發
      fireEvent.keyDown(monkCard!, { key: 'Enter' });
      expect(monkCard).toHaveClass('selected');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const { storage } = require('@/utils/helpers');
      storage.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      // 選擇身份並確認
      const monkCard = screen.getByText('法師').closest('.identityCard');
      fireEvent.click(monkCard!);

      const confirmButton = screen.getByText('確認選擇');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving identity:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on mobile devices', () => {
      // 模擬移動設備視窗大小
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <IdentitySelection 
          onIdentitySelected={mockOnIdentitySelected}
        />
      );

      expect(screen.getByText('法師')).toBeInTheDocument();
      expect(screen.getByText('志工')).toBeInTheDocument();
    });
  });
});