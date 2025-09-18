import { LineClientService } from '@/services/line-client';
import { apiClient } from '@/services/api';
import { Registration, Event, User } from '@/types';

// Mock API client
jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('LineClientService', () => {
  let service: LineClientService;

  const mockUser: User = {
    lineUserId: 'test_user_id',
    displayName: '測試使用者',
    identity: 'monk',
    phone: '0912345678',
    templeName: '測試寺院',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent: Event = {
    id: 'event_1',
    name: '彰化供佛齋僧活動',
    description: '年度供佛齋僧活動',
    startDate: new Date('2024-01-15T09:00:00Z'),
    endDate: new Date('2024-01-15T16:00:00Z'),
    location: '彰化縣某寺院',
    maxParticipants: 100,
    currentParticipants: 50,
    registrationDeadline: new Date('2024-01-10T23:59:59Z'),
    status: 'open',
    pretixEventSlug: 'test-event',
    transportOptions: [],
  };

  const mockRegistration: Registration = {
    id: 'reg_1',
    userId: 'test_user_id',
    eventId: 'event_1',
    identity: 'monk',
    personalInfo: {
      name: '測試法師',
      phone: '0912345678',
      templeName: '測試寺院',
    },
    transport: {
      required: false,
    },
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LineClientService();
  });

  describe('checkFriendshipStatus', () => {
    it('should return friendship status when API call succeeds', async () => {
      const mockResponse = {
        success: true,
        data: {
          isFriend: true,
          canSendMessage: true,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await service.checkFriendshipStatus('test_user_id');

      expect(result).toEqual({
        isFriend: true,
        canSendMessage: true,
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/line/friendship?userId=test_user_id'
      );
    });

    it('should return default status when API call fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await service.checkFriendshipStatus('test_user_id');

      expect(result).toEqual({
        isFriend: false,
        canSendMessage: false,
        guidanceMessage: expect.stringContaining('加入我們的官方帳號為好友'),
      });
    });

    it('should return default status when API returns error', async () => {
      const mockResponse = {
        success: false,
        message: 'API error',
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await service.checkFriendshipStatus('test_user_id');

      expect(result).toEqual({
        isFriend: false,
        canSendMessage: false,
        guidanceMessage: expect.stringContaining('加入我們的官方帳號為好友'),
      });
    });
  });

  describe('sendRegistrationSuccessNotification', () => {
    it('should send notification successfully', async () => {
      const mockResponse = {
        success: true,
        data: { sent: true },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.sendRegistrationSuccessNotification(
        'test_user_id',
        mockRegistration,
        mockEvent
      );

      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/line/notify',
        {
          userId: 'test_user_id',
          type: 'registration_success',
          data: {
            registration: mockRegistration,
            event: mockEvent,
          },
        }
      );
    });

    it('should return false when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.sendRegistrationSuccessNotification(
        'test_user_id',
        mockRegistration,
        mockEvent
      );

      expect(result).toBe(false);
    });

    it('should return false when user is not a friend', async () => {
      const error = new Error('Not friend');
      (error as any).code = 'NOT_FRIEND';
      mockApiClient.post.mockRejectedValue(error);

      const result = await service.sendRegistrationSuccessNotification(
        'test_user_id',
        mockRegistration,
        mockEvent
      );

      expect(result).toBe(false);
    });
  });

  describe('sendEventReminder', () => {
    it('should send reminder successfully', async () => {
      const mockResponse = {
        success: true,
        data: { sent: true },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'day_before'
      );

      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/line/notify',
        {
          userId: 'test_user_id',
          type: 'event_reminder',
          data: {
            registration: mockRegistration,
            event: mockEvent,
            reminderType: 'day_before',
          },
        }
      );
    });

    it('should return false when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'hour_before'
      );

      expect(result).toBe(false);
    });
  });

  describe('sendImportantInfo', () => {
    it('should send important info successfully', async () => {
      const mockResponse = {
        success: true,
        data: { sent: true },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.sendImportantInfo(
        'test_user_id',
        '重要通知',
        '活動異動',
        'https://example.com'
      );

      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/line/notify',
        {
          userId: 'test_user_id',
          type: 'important_info',
          data: {
            title: '重要通知',
            content: '活動異動',
            actionUrl: 'https://example.com',
          },
        }
      );
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send bulk notifications successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          successCount: 2,
          failedCount: 1,
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.sendBulkNotifications(
        ['user1', 'user2', 'user3'],
        'transport_info',
        { title: '交通車異動', content: '時間調整' }
      );

      expect(result).toEqual({ success: 2, failed: 1 });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/line/bulk-notify',
        {
          userIds: ['user1', 'user2', 'user3'],
          messageTemplate: {
            type: 'transport_info',
            data: { title: '交通車異動', content: '時間調整' },
          },
        }
      );
    });

    it('should return all failed when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.sendBulkNotifications(
        ['user1', 'user2'],
        'transport_info',
        { title: '測試', content: '測試' }
      );

      expect(result).toEqual({ success: 0, failed: 2 });
    });
  });

  describe('triggerEventReminders', () => {
    it('should trigger reminders successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          totalSuccess: 5,
          totalFailed: 1,
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.triggerEventReminders('event_1', 'day_before');

      expect(result).toEqual({ success: 5, failed: 1 });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/line/send-reminders',
        {
          eventId: 'event_1',
          reminderType: 'day_before',
        }
      );
    });
  });

  describe('checkAndGuideFriendship', () => {
    it('should return no guidance needed for friends', async () => {
      const mockResponse = {
        success: true,
        data: {
          isFriend: true,
          canSendMessage: true,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await service.checkAndGuideFriendship('test_user_id');

      expect(result).toEqual({
        needsGuidance: false,
      });
    });

    it('should return guidance needed for non-friends', async () => {
      const mockResponse = {
        success: true,
        data: {
          isFriend: false,
          canSendMessage: false,
          guidanceMessage: '請加入好友',
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await service.checkAndGuideFriendship('test_user_id');

      expect(result).toEqual({
        needsGuidance: true,
        guidanceMessage: '請加入好友',
      });
    });
  });

  describe('handleRegistrationSuccess', () => {
    it('should handle registration success for friend user', async () => {
      // Mock friendship check
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: {
          isFriend: true,
          canSendMessage: true,
        },
      });

      // Mock notification send
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { sent: true },
      });

      const result = await service.handleRegistrationSuccess(
        mockUser,
        mockRegistration,
        mockEvent
      );

      expect(result).toEqual({
        notificationSent: true,
      });
    });

    it('should handle registration success for non-friend user', async () => {
      // Mock friendship check
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: {
          isFriend: false,
          canSendMessage: false,
          guidanceMessage: '請加入好友',
        },
      });

      const result = await service.handleRegistrationSuccess(
        mockUser,
        mockRegistration,
        mockEvent
      );

      expect(result).toEqual({
        notificationSent: false,
        friendshipGuidance: '請加入好友',
      });
    });

    it('should handle errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await service.handleRegistrationSuccess(
        mockUser,
        mockRegistration,
        mockEvent
      );

      expect(result).toEqual({
        notificationSent: false,
        friendshipGuidance: expect.stringContaining('加入我們的官方帳號為好友'),
      });
    });
  });
});