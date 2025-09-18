/**
 * 報名狀態查詢功能整合測試
 * Registration Status Query Integration Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import RegistrationsPage from '../../pages/registrations';
import { useLiff } from '../../hooks/useLiff';
import { useIdentity } from '../../hooks/useIdentity';
import { apiClient } from '../../services/api';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));
jest.mock('../../hooks/useLiff');
jest.mock('../../hooks/useIdentity');
jest.mock('../../services/api');

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseLiff = useLiff as jest.MockedFunction<typeof useLiff>;
const mockUseIdentity = useIdentity as jest.MockedFunction<typeof useIdentity>;
const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('Registration Status Query Integration Tests', () => {
  const mockPush = jest.fn();

  const mockRegistrations = [
    {
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
        pickupTime: '2024-12-25T07:30:00Z'
      },
      pretixOrderId: 'ORDER-123',
      status: 'confirmed',
      createdAt: '2024-12-01T10:00:00Z',
      updatedAt: '2024-12-01T10:00:00Z'
    },
    {
      id: 'reg-456',
      userId: 'user-123',
      eventId: 'event-456',
      identity: 'monk',
      personalInfo: {
        name: '測試法師',
        phone: '0911111111',
        templeName: '測試寺院',
        specialRequirements: ''
      },
      transport: {
        required: false
      },
      pretixOrderId: 'ORDER-456',
      status: 'pending',
      createdAt: '2024-12-02T10:00:00Z',
      updatedAt: '2024-12-02T10:00:00Z'
    }
  ];

  const mockEvents = {
    'event-123': {
      id: 'event-123',
      name: '供佛齋僧活動',
      dateFrom: '2024-12-25T09:00:00Z',
      location: '彰化某寺院',
      dateAdmission: '2024-12-25T08:30:00Z'
    },
    'event-456': {
      id: 'event-456',
      name: '法會活動',
      dateFrom: '2024-12-30T10:00:00Z',
      location: '台中某寺院',
      dateAdmission: '2024-12-30T09:30:00Z'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRouter.mockReturnValue({
      push: mockPush,
      pathname: '/registrations',
      query: {},
      asPath: '/registrations'
    } as any);

    mockUseLiff.mockReturnValue({
      initialized: true,
      loggedIn: true,
      profile: null,
      permissions: [],
      isInLineClient: false,
      loading: { isLoading: false },
      error: { hasError: false },
      initialize: jest.fn(),
      login: jest.fn(),
      checkLogin: jest.fn(),
      refreshProfile: jest.fn(),
      checkUserPermissions: jest.fn(),
      requestUserPermissions: jest.fn(),
      getToken: jest.fn(),
      retry: jest.fn()
    });

    mockUseIdentity.mockReturnValue({
      identity: 'volunteer',
      isFirstVisit: false,
      hasSelectedIdentity: true,
      isLoading: false,
      setIdentity: jest.fn(),
      clearIdentity: jest.fn(),
      switchIdentity: jest.fn(),
      refreshIdentity: jest.fn()
    });
  });

  describe('頁面載入和顯示', () => {
    it('應該正確載入和顯示報名記錄', async () => {
      // Arrange
      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            registrations: mockRegistrations,
            pagination: { total: 2, limit: 10, offset: 0, hasMore: false }
          },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-123'],
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-456'],
          timestamp: new Date().toISOString()
        });

      // Act
      render(<RegistrationsPage />);

      // Assert
      expect(screen.getByText('載入報名記錄中...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('我的報名記錄')).toBeInTheDocument();
      });

      expect(screen.getByText('供佛齋僧活動')).toBeInTheDocument();
      expect(screen.getByText('法會活動')).toBeInTheDocument();
      expect(screen.getByText('已確認')).toBeInTheDocument();
      expect(screen.getByText('處理中')).toBeInTheDocument();
    });

    it('應該顯示空狀態當沒有報名記錄時', async () => {
      // Arrange
      mockApi.get.mockResolvedValueOnce({
        success: true,
        data: {
          registrations: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
        },
        timestamp: new Date().toISOString()
      });

      // Act
      render(<RegistrationsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('尚無報名記錄')).toBeInTheDocument();
      });

      expect(screen.getByText('您還沒有報名任何活動')).toBeInTheDocument();
      expect(screen.getByText('瀏覽活動')).toBeInTheDocument();
    });

    it('應該顯示錯誤狀態當載入失敗時', async () => {
      // Arrange
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(<RegistrationsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('載入報名記錄失敗，請稍後再試')).toBeInTheDocument();
      });

      expect(screen.getByText('重新載入')).toBeInTheDocument();
    });
  });

  describe('報名記錄卡片功能', () => {
    beforeEach(async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: {
            registrations: mockRegistrations,
            pagination: { total: 2, limit: 10, offset: 0, hasMore: false }
          }
        })
        .mockResolvedValueOnce({ data: mockEvents['event-123'] })
        .mockResolvedValueOnce({ data: mockEvents['event-456'] });

      render(<RegistrationsPage />);

      await waitFor(() => {
        expect(screen.getByText('我的報名記錄')).toBeInTheDocument();
      });
    });

    it('應該顯示正確的報名資訊', () => {
      // Assert
      expect(screen.getByText('測試使用者')).toBeInTheDocument();
      expect(screen.getByText('0912345678')).toBeInTheDocument();
      expect(screen.getByText('0987654321')).toBeInTheDocument();
      expect(screen.getByText('素食')).toBeInTheDocument();
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();
      expect(screen.getByText('ORDER-123')).toBeInTheDocument();
    });

    it('應該顯示不同身份的資訊', () => {
      // Assert
      expect(screen.getByText('志工')).toBeInTheDocument();
      expect(screen.getByText('法師')).toBeInTheDocument();
      expect(screen.getByText('測試寺院')).toBeInTheDocument();
    });

    it('應該顯示交通車資訊', () => {
      // Assert
      expect(screen.getByText('需要交通車：是')).toBeInTheDocument();
      expect(screen.getByText('不需要交通車')).toBeInTheDocument();
    });
  });

  describe('編輯功能', () => {
    beforeEach(async () => {
      // 設定可編輯的報名記錄（活動日期在未來且超過24小時）
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const editableRegistrations = [
        {
          ...mockRegistrations[0],
          canEdit: true,
          canCancel: true
        }
      ];

      const futureEvent = {
        ...mockEvents['event-123'],
        dateFrom: futureDate.toISOString()
      };

      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            registrations: editableRegistrations,
            pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
          },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: futureEvent,
          timestamp: new Date().toISOString()
        });

      render(<RegistrationsPage />);

      await waitFor(() => {
        expect(screen.getByText('我的報名記錄')).toBeInTheDocument();
      });
    });

    it('應該顯示編輯按鈕當報名可編輯時', () => {
      // Assert
      expect(screen.getByText('修改資料')).toBeInTheDocument();
    });

    it('應該開啟編輯模態框當點擊編輯按鈕時', async () => {
      // Act
      fireEvent.click(screen.getByText('修改資料'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('修改報名資料')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('測試使用者')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0912345678')).toBeInTheDocument();
    });

    it('應該成功提交編輯後的資料', async () => {
      // Arrange
      mockApi.put.mockResolvedValueOnce({ 
        success: true,
        data: { success: true },
        timestamp: new Date().toISOString()
      });
      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            registrations: [{ ...mockRegistrations[0], personalInfo: { ...mockRegistrations[0].personalInfo, phone: '0911111111' } }],
            pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
          },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-123'],
          timestamp: new Date().toISOString()
        });

      // Act
      fireEvent.click(screen.getByText('修改資料'));

      await waitFor(() => {
        expect(screen.getByText('修改報名資料')).toBeInTheDocument();
      });

      const phoneInput = screen.getByDisplayValue('0912345678');
      fireEvent.change(phoneInput, { target: { value: '0911111111' } });

      fireEvent.click(screen.getByText('儲存變更'));

      // Assert
      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/registration/reg-123', expect.any(Object));
      });
    });
  });

  describe('取消功能', () => {
    beforeEach(async () => {
      const cancellableRegistrations = [
        {
          ...mockRegistrations[0],
          canEdit: true,
          canCancel: true
        }
      ];

      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            registrations: cancellableRegistrations,
            pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
          },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-123'],
          timestamp: new Date().toISOString()
        });

      render(<RegistrationsPage />);

      await waitFor(() => {
        expect(screen.getByText('我的報名記錄')).toBeInTheDocument();
      });
    });

    it('應該顯示取消按鈕當報名可取消時', () => {
      // Assert
      expect(screen.getByText('取消報名')).toBeInTheDocument();
    });

    it('應該顯示確認對話框當點擊取消按鈕時', () => {
      // Arrange
      window.confirm = jest.fn().mockReturnValue(false);

      // Act
      fireEvent.click(screen.getByText('取消報名'));

      // Assert
      expect(window.confirm).toHaveBeenCalledWith('確定要取消此報名嗎？取消後將無法恢復。');
    });

    it('應該成功取消報名', async () => {
      // Arrange
      window.confirm = jest.fn().mockReturnValue(true);
      window.alert = jest.fn();
      mockApi.delete.mockResolvedValueOnce({ 
        success: true,
        data: { success: true },
        timestamp: new Date().toISOString()
      });
      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            registrations: [{ ...mockRegistrations[0], status: 'cancelled' }],
            pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
          },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-123'],
          timestamp: new Date().toISOString()
        });

      // Act
      fireEvent.click(screen.getByText('取消報名'));

      // Assert
      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith('/registration/reg-123');
      });

      expect(window.alert).toHaveBeenCalledWith('報名已成功取消');
    });
  });

  describe('導航功能', () => {
    beforeEach(async () => {
      mockApi.get.mockResolvedValueOnce({
        success: true,
        data: {
          registrations: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
        },
        timestamp: new Date().toISOString()
      });

      render(<RegistrationsPage />);

      await waitFor(() => {
        expect(screen.getByText('尚無報名記錄')).toBeInTheDocument();
      });
    });

    it('應該導航到活動頁面當點擊瀏覽活動時', () => {
      // Act
      fireEvent.click(screen.getByText('瀏覽活動'));

      // Assert
      expect(mockPush).toHaveBeenCalledWith('/events');
    });

    it('應該導航到首頁當點擊返回首頁時', () => {
      // Act
      fireEvent.click(screen.getByText('返回首頁'));

      // Assert
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('LIFF 錯誤處理', () => {
    it('應該顯示錯誤訊息當 LIFF 初始化失敗時', () => {
      // Arrange
      mockUseLiff.mockReturnValue({
        initialized: false,
        loggedIn: false,
        profile: null,
        permissions: [],
        isInLineClient: false,
        loading: { isLoading: false },
        error: { hasError: true, message: 'LIFF 初始化失敗' },
        initialize: jest.fn(),
        login: jest.fn(),
        checkLogin: jest.fn(),
        refreshProfile: jest.fn(),
        checkUserPermissions: jest.fn(),
        requestUserPermissions: jest.fn(),
        getToken: jest.fn(),
        retry: jest.fn()
      });

      // Act
      render(<RegistrationsPage />);

      // Assert
      expect(screen.getByText('LIFF 初始化失敗')).toBeInTheDocument();
    });

    it('應該顯示載入狀態當 LIFF 未準備好時', () => {
      // Arrange
      mockUseLiff.mockReturnValue({
        initialized: false,
        loggedIn: false,
        profile: null,
        permissions: [],
        isInLineClient: false,
        loading: { isLoading: true, message: '系統初始化中...' },
        error: { hasError: false },
        initialize: jest.fn(),
        login: jest.fn(),
        checkLogin: jest.fn(),
        refreshProfile: jest.fn(),
        checkUserPermissions: jest.fn(),
        requestUserPermissions: jest.fn(),
        getToken: jest.fn(),
        retry: jest.fn()
      });

      // Act
      render(<RegistrationsPage />);

      // Assert
      expect(screen.getByText('載入報名記錄中...')).toBeInTheDocument();
    });
  });

  describe('重新載入功能', () => {
    it('應該重新載入資料當點擊重新載入按鈕時', async () => {
      // Arrange
      mockApi.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: {
            registrations: mockRegistrations,
            pagination: { total: 2, limit: 10, offset: 0, hasMore: false }
          },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-123'],
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({ 
          success: true,
          data: mockEvents['event-456'],
          timestamp: new Date().toISOString()
        });

      render(<RegistrationsPage />);

      await waitFor(() => {
        expect(screen.getByText('載入報名記錄失敗，請稍後再試')).toBeInTheDocument();
      });

      // Act
      fireEvent.click(screen.getByText('重新載入'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('我的報名記錄')).toBeInTheDocument();
      });

      expect(screen.getByText('供佛齋僧活動')).toBeInTheDocument();
    });
  });
});