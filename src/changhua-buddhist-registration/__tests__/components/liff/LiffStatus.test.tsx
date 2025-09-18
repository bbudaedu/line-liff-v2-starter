import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiffStatus } from '@/components/liff/LiffStatus';

// Mock the useLiff hook
const mockUseLiff = {
  loading: { isLoading: false, message: '' },
  error: { hasError: false },
  networkStatus: 'online' as const,
  healthStatus: {
    isHealthy: true,
    issues: [],
    recommendations: [],
  },
  environmentInfo: {
    isInClient: true,
    isLoggedIn: true,
    isInitialized: true,
    networkStatus: 'online',
    lastHealthCheck: new Date(),
    initializationAttempts: 1,
    hasError: false,
  },
  retry: jest.fn(),
  login: jest.fn(),
  requestUserPermissions: jest.fn(),
  getFriendlyStatus: jest.fn(),
  forceReinitialize: jest.fn(),
};

jest.mock('@/hooks/useLiff', () => ({
  useLiff: () => mockUseLiff,
}));

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn(),
  },
  writable: true,
});

describe('LiffStatus Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default healthy state
    mockUseLiff.loading = { isLoading: false, message: '' };
    mockUseLiff.error = { hasError: false };
    mockUseLiff.healthStatus = {
      isHealthy: true,
      issues: [],
      recommendations: [],
    };
    mockUseLiff.getFriendlyStatus.mockReturnValue({
      status: 'success',
      title: '系統運作正常',
      message: '您已成功登入，可以開始使用報名功能',
      actions: [],
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseLiff.loading = { isLoading: true, message: '系統初始化中...' };

      render(<LiffStatus />);

      expect(screen.getByText('系統初始化中...')).toBeInTheDocument();
      expect(screen.getByText('系統初始化中...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when there is an error', () => {
      mockUseLiff.error = { hasError: true, message: 'LIFF 初始化失敗', code: 'LIFF_INIT_ERROR' };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'error',
        title: '系統初始化失敗',
        message: 'LIFF 初始化失敗，請重試',
        actions: [
          { label: '重試', action: 'retry' },
          { label: '重新載入', action: 'reload' },
        ],
      });

      render(<LiffStatus />);

      expect(screen.getByText('系統初始化失敗')).toBeInTheDocument();
      expect(screen.getByText('LIFF 初始化失敗，請重試')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重新載入' })).toBeInTheDocument();
    });

    it('should show technical details when showDetailedInfo is true', () => {
      mockUseLiff.error = { hasError: true, message: 'LIFF 初始化失敗', code: 'LIFF_INIT_ERROR' };
      mockUseLiff.environmentInfo.hasError = true;
      mockUseLiff.environmentInfo.errorMessage = '網路連線逾時';
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'error',
        title: '系統初始化失敗',
        message: 'LIFF 初始化失敗，請重試',
        actions: [],
      });

      render(<LiffStatus showDetailedInfo={true} />);

      expect(screen.getByText('技術詳情')).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText('技術詳情'));
      
      expect(screen.getByText('錯誤代碼:')).toBeInTheDocument();
      expect(screen.getByText('LIFF_INIT_ERROR')).toBeInTheDocument();
      expect(screen.getByText('系統錯誤:')).toBeInTheDocument();
      expect(screen.getByText('網路連線逾時')).toBeInTheDocument();
    });
  });

  describe('Unhealthy State', () => {
    it('should show warning when system is unhealthy', () => {
      mockUseLiff.healthStatus = {
        isHealthy: false,
        issues: ['使用者尚未登入'],
        recommendations: ['點擊登入按鈕'],
      };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'warning',
        title: '需要登入',
        message: '請登入您的 LINE 帳號以使用報名功能',
        actions: [{ label: '登入', action: 'login' }],
      });

      render(<LiffStatus />);

      expect(screen.getByText('需要登入')).toBeInTheDocument();
      expect(screen.getByText('請登入您的 LINE 帳號以使用報名功能')).toBeInTheDocument();
      expect(screen.getByText('建議解決方案：')).toBeInTheDocument();
      expect(screen.getByText('點擊登入按鈕')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
    });

    it('should show detailed system status when showDetailedInfo is true', () => {
      mockUseLiff.healthStatus = {
        isHealthy: false,
        issues: ['使用者尚未登入', '缺少必要權限'],
        recommendations: ['點擊登入按鈕', '允許應用程式存取您的基本資料'],
      };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'warning',
        title: '需要登入',
        message: '請登入您的 LINE 帳號以使用報名功能',
        actions: [{ label: '登入', action: 'login' }],
      });

      render(<LiffStatus showDetailedInfo={true} />);

      expect(screen.getByText('系統狀態詳情')).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText('系統狀態詳情'));
      
      expect(screen.getByText('初始化狀態:')).toBeInTheDocument();
      expect(screen.getByText('登入狀態:')).toBeInTheDocument();
      expect(screen.getByText('客戶端環境:')).toBeInTheDocument();
      expect(screen.getByText('網路狀態:')).toBeInTheDocument();
      
      expect(screen.getByText('發現的問題：')).toBeInTheDocument();
      expect(screen.getByText('使用者尚未登入')).toBeInTheDocument();
      expect(screen.getByText('缺少必要權限')).toBeInTheDocument();
    });
  });

  describe('Action Handling', () => {
    it('should handle retry action', async () => {
      mockUseLiff.error = { hasError: true };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'error',
        title: '系統錯誤',
        message: '發生錯誤',
        actions: [{ label: '重試', action: 'retry' }],
      });

      render(<LiffStatus />);

      fireEvent.click(screen.getByRole('button', { name: '重試' }));

      await waitFor(() => {
        expect(mockUseLiff.retry).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle login action', async () => {
      mockUseLiff.healthStatus.isHealthy = false;
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'warning',
        title: '需要登入',
        message: '請登入',
        actions: [{ label: '登入', action: 'login' }],
      });

      render(<LiffStatus />);

      fireEvent.click(screen.getByRole('button', { name: '登入' }));

      await waitFor(() => {
        expect(mockUseLiff.login).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle request permissions action', async () => {
      mockUseLiff.healthStatus.isHealthy = false;
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'warning',
        title: '需要權限',
        message: '請授權',
        actions: [{ label: '授權', action: 'request-permissions' }],
      });

      render(<LiffStatus />);

      fireEvent.click(screen.getByRole('button', { name: '授權' }));

      await waitFor(() => {
        expect(mockUseLiff.requestUserPermissions).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle reload action', () => {
      mockUseLiff.error = { hasError: true };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'error',
        title: '系統錯誤',
        message: '發生錯誤',
        actions: [{ label: '重新載入', action: 'reload' }],
      });

      render(<LiffStatus />);

      fireEvent.click(screen.getByRole('button', { name: '重新載入' }));

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('should handle force reinitialize action', async () => {
      mockUseLiff.error = { hasError: true };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'error',
        title: '系統錯誤',
        message: '發生錯誤',
        actions: [{ label: '強制重新初始化', action: 'force-reinit' }],
      });

      render(<LiffStatus />);

      fireEvent.click(screen.getByRole('button', { name: '強制重新初始化' }));

      await waitFor(() => {
        expect(mockUseLiff.forceReinitialize).toHaveBeenCalledTimes(1);
      });
    });

    it('should call custom action handlers when provided', async () => {
      const mockOnRetry = jest.fn();
      const mockOnLogin = jest.fn();
      const mockOnRequestPermissions = jest.fn();

      mockUseLiff.error = { hasError: true };
      mockUseLiff.getFriendlyStatus.mockReturnValue({
        status: 'error',
        title: '系統錯誤',
        message: '發生錯誤',
        actions: [
          { label: '重試', action: 'retry' },
          { label: '登入', action: 'login' },
          { label: '授權', action: 'request-permissions' },
        ],
      });

      render(
        <LiffStatus
          onRetry={mockOnRetry}
          onLogin={mockOnLogin}
          onRequestPermissions={mockOnRequestPermissions}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '重試' }));
      fireEvent.click(screen.getByRole('button', { name: '登入' }));
      fireEvent.click(screen.getByRole('button', { name: '授權' }));

      await waitFor(() => {
        expect(mockOnRetry).toHaveBeenCalledTimes(1);
        expect(mockOnLogin).toHaveBeenCalledTimes(1);
        expect(mockOnRequestPermissions).toHaveBeenCalledTimes(1);
      });

      // Default handlers should not be called
      expect(mockUseLiff.retry).not.toHaveBeenCalled();
      expect(mockUseLiff.login).not.toHaveBeenCalled();
      expect(mockUseLiff.requestUserPermissions).not.toHaveBeenCalled();
    });
  });

  describe('Success State', () => {
    it('should show success message when showDetailedInfo is true and system is healthy', () => {
      render(<LiffStatus showDetailedInfo={true} />);

      expect(screen.getByText('系統運作正常')).toBeInTheDocument();
      expect(screen.getByText('您已成功登入，可以開始使用報名功能')).toBeInTheDocument();
    });

    it('should not render anything when system is healthy and showDetailedInfo is false', () => {
      const { container } = render(<LiffStatus showDetailedInfo={false} />);

      expect(container.firstChild).toBeNull();
    });
  });
});