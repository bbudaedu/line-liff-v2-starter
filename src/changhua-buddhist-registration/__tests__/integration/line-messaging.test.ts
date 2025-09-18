import { LineMessagingService } from '@/services/line-messaging';
import { LineClientService } from '@/services/line-client';
import { notificationService } from '@/services/notification';
import { Registration, Event, User } from '@/types';

// Mock LINE Bot SDK
jest.mock('@line/bot-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    getProfile: jest.fn(),
    pushMessage: jest.fn(),
  })),
}));

// Mock API client
jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('LINE Messaging Integration', () => {
  let lineMessagingService: LineMessagingService;
  let lineClientService: LineClientService;
  let mockClient: any;

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
    transportOptions: [{
      id: 'transport_1',
      eventId: 'event_1',
      name: '彰化火車站',
      address: '彰化縣彰化市三民路1號',
      pickupTime: new Date('2024-01-15T07:30:00Z'),
      maxSeats: 45,
      bookedSeats: 20,
      coordinates: { lat: 24.0518, lng: 120.5161 },
    }],
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
      specialRequirements: '素食',
    },
    transport: {
      required: true,
      locationId: 'transport_1',
      pickupTime: new Date('2024-01-15T07:30:00Z'),
    },
    pretixOrderId: 'order_123',
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Set up environment variables
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test_access_token';
    process.env.LINE_CHANNEL_SECRET = 'test_channel_secret';
    process.env.NEXT_PUBLIC_LIFF_URL = 'https://liff.line.me/test';

    jest.clearAllMocks();

    // Create service instances
    lineMessagingService = new LineMessagingService();
    lineClientService = new LineClientService();

    // Get mock client instance
    const { Client } = require('@line/bot-sdk');
    mockClient = new Client();
  });

  describe('Complete Registration Success Flow', () => {
    it('should handle complete registration success notification flow', async () => {
      // Mock friend status check
      mockClient.getProfile.mockResolvedValue({
        userId: 'test_user_id',
        displayName: '測試使用者',
      });

      // Mock message sending
      mockClient.pushMessage.mockResolvedValue({});

      // Test server-side service
      await lineMessagingService.sendRegistrationSuccessNotification(
        'test_user_id',
        mockRegistration,
        mockEvent
      );

      expect(mockClient.getProfile).toHaveBeenCalledWith('test_user_id');
      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test_user_id',
        expect.objectContaining({
          type: 'flex',
          altText: expect.stringContaining('報名成功通知'),
        })
      );

      // Verify message content includes transport information
      const pushMessageCall = mockClient.pushMessage.mock.calls[0];
      const flexMessage = pushMessageCall[1];
      expect(flexMessage.contents.body.contents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '🚌 交通車資訊',
          }),
        ])
      );
    });

    it('should handle non-friend user gracefully', async () => {
      // Mock non-friend status
      mockClient.getProfile.mockRejectedValue({
        statusCode: 403,
        message: 'Forbidden',
      });

      // Should not throw error, just log warning
      await expect(
        lineMessagingService.sendRegistrationSuccessNotification(
          'test_user_id',
          mockRegistration,
          mockEvent
        )
      ).resolves.not.toThrow();

      expect(mockClient.getProfile).toHaveBeenCalledWith('test_user_id');
      expect(mockClient.pushMessage).not.toHaveBeenCalled();
    });
  });

  describe('Event Reminder Flow', () => {
    it('should send day before reminder with transport info', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await lineMessagingService.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'day_before'
      );

      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test_user_id',
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/明日活動提醒.*交通車資訊.*彰化火車站/s),
        })
      );
    });

    it('should send hour before reminder', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await lineMessagingService.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'hour_before'
      );

      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test_user_id',
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('活動即將開始'),
        })
      );
    });
  });

  describe('Bulk Messaging Flow', () => {
    it('should handle bulk message sending with mixed results', async () => {
      const userIds = ['user1', 'user2', 'user3'];

      // Mock different responses for different users
      mockClient.getProfile
        .mockResolvedValueOnce({ userId: 'user1' }) // success
        .mockRejectedValueOnce({ statusCode: 403 }) // not friend
        .mockResolvedValueOnce({ userId: 'user3' }); // success

      mockClient.pushMessage.mockResolvedValue({});

      const messageTemplate = {
        type: 'registration_success' as const,
        data: {
          registration: mockRegistration,
          event: mockEvent,
        },
      };

      const result = await lineMessagingService.sendBulkMessages(userIds, messageTemplate);

      expect(result.success).toEqual(['user1', 'user3']);
      expect(result.failed).toEqual(['user2']);
      expect(mockClient.pushMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Notification Service Integration', () => {
    it('should integrate with notification service for registration success', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      const result = await notificationService.sendRegistrationSuccessNotification(
        mockUser,
        mockRegistration,
        mockEvent
      );

      expect(result).toBe(true);
      expect(mockClient.getProfile).toHaveBeenCalledWith('test_user_id');
      expect(mockClient.pushMessage).toHaveBeenCalled();
    });

    it('should handle friendship check in notification service', async () => {
      mockClient.getProfile.mockRejectedValue({
        statusCode: 403,
        message: 'Forbidden',
      });

      const result = await notificationService.sendRegistrationSuccessNotification(
        mockUser,
        mockRegistration,
        mockEvent
      );

      expect(result).toBe(false);
      expect(mockClient.pushMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle LINE API rate limiting', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockRejectedValue({
        statusCode: 429,
        message: 'Too Many Requests',
      });

      await expect(
        lineMessagingService.sendRegistrationSuccessNotification(
          'test_user_id',
          mockRegistration,
          mockEvent
        )
      ).rejects.toThrow();
    });

    it('should handle LINE API server errors', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockRejectedValue({
        statusCode: 500,
        message: 'Internal Server Error',
      });

      await expect(
        lineMessagingService.sendRegistrationSuccessNotification(
          'test_user_id',
          mockRegistration,
          mockEvent
        )
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      mockClient.getProfile.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await expect(
        lineMessagingService.checkFriendshipStatus('test_user_id')
      ).rejects.toThrow();
    });
  });

  describe('Message Content Validation', () => {
    it('should create proper flex message structure for registration success', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await lineMessagingService.sendRegistrationSuccessNotification(
        'test_user_id',
        mockRegistration,
        mockEvent
      );

      const pushMessageCall = mockClient.pushMessage.mock.calls[0];
      const flexMessage = pushMessageCall[1];

      // Validate flex message structure
      expect(flexMessage).toMatchObject({
        type: 'flex',
        altText: expect.stringContaining('報名成功通知'),
        contents: {
          type: 'bubble',
          hero: expect.objectContaining({
            type: 'image',
          }),
          body: expect.objectContaining({
            type: 'box',
            layout: 'vertical',
          }),
          footer: expect.objectContaining({
            type: 'box',
            layout: 'vertical',
          }),
        },
      });
    });

    it('should create proper text message for event reminder', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await lineMessagingService.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'day_before'
      );

      const pushMessageCall = mockClient.pushMessage.mock.calls[0];
      const textMessage = pushMessageCall[1];

      expect(textMessage).toMatchObject({
        type: 'text',
        text: expect.stringMatching(/🔔 明日活動提醒.*📅 活動名稱.*⏰ 活動時間.*📍 活動地點.*🚌 交通車資訊.*阿彌陀佛 🙏/s),
      });
    });
  });

  describe('Localization and Formatting', () => {
    it('should format dates correctly in Chinese locale', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      const eventWithSpecificDate = {
        ...mockEvent,
        startDate: new Date('2024-01-15T09:30:00Z'),
      };

      await lineMessagingService.sendEventReminder(
        'test_user_id',
        mockRegistration,
        eventWithSpecificDate,
        'day_before'
      );

      const pushMessageCall = mockClient.pushMessage.mock.calls[0];
      const textMessage = pushMessageCall[1];

      // Should contain properly formatted time
      expect(textMessage.text).toMatch(/09:30|9:30/);
    });

    it('should handle different identity types in messages', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      const volunteerRegistration = {
        ...mockRegistration,
        identity: 'volunteer' as const,
        personalInfo: {
          name: '測試志工',
          phone: '0912345678',
          emergencyContact: '0987654321',
        },
      };

      await lineMessagingService.sendRegistrationSuccessNotification(
        'test_user_id',
        volunteerRegistration,
        mockEvent
      );

      const pushMessageCall = mockClient.pushMessage.mock.calls[0];
      const flexMessage = pushMessageCall[1];

      // Should contain volunteer identity
      const bodyContents = JSON.stringify(flexMessage.contents.body.contents);
      expect(bodyContents).toContain('志工');
    });
  });
});