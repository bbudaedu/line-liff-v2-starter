import { LineMessagingService } from '@/services/line-messaging';
import { Registration, Event, TransportOption } from '@/types';

// Mock LINE Bot SDK
jest.mock('@line/bot-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    getProfile: jest.fn(),
    pushMessage: jest.fn(),
  })),
}));

// Mock environment variables
const mockEnv = {
  LINE_CHANNEL_ACCESS_TOKEN: 'test_access_token',
  LINE_CHANNEL_SECRET: 'test_channel_secret',
  NEXT_PUBLIC_LIFF_URL: 'https://liff.line.me/test',
};

Object.assign(process.env, mockEnv);

describe('LineMessagingService', () => {
  let service: LineMessagingService;
  let mockClient: any;

  const mockUser = {
    lineUserId: 'test_user_id',
    displayName: '測試使用者',
    identity: 'monk' as const,
    phone: '0912345678',
    templeName: '測試寺院',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransportOption: TransportOption = {
    id: 'transport_1',
    eventId: 'event_1',
    name: '彰化火車站',
    address: '彰化縣彰化市三民路1號',
    pickupTime: new Date('2024-01-15T07:30:00Z'),
    maxSeats: 45,
    bookedSeats: 20,
    coordinates: { lat: 24.0518, lng: 120.5161 },
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
    transportOptions: [mockTransportOption],
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
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new LineMessagingService();
    
    // Get mock client instance
    const { Client } = require('@line/bot-sdk');
    mockClient = new Client();
  });

  describe('checkFriendshipStatus', () => {
    it('should return friend status when user is a friend', async () => {
      mockClient.getProfile.mockResolvedValue({
        userId: 'test_user_id',
        displayName: '測試使用者',
      });

      const result = await service.checkFriendshipStatus('test_user_id');

      expect(result).toEqual({
        isFriend: true,
        canSendMessage: true,
      });
      expect(mockClient.getProfile).toHaveBeenCalledWith('test_user_id');
    });

    it('should return not friend status when user is not a friend', async () => {
      mockClient.getProfile.mockRejectedValue({
        statusCode: 403,
        message: 'Forbidden',
      });

      const result = await service.checkFriendshipStatus('test_user_id');

      expect(result).toEqual({
        isFriend: false,
        canSendMessage: false,
      });
    });

    it('should throw error for other API errors', async () => {
      mockClient.getProfile.mockRejectedValue({
        statusCode: 500,
        message: 'Internal Server Error',
      });

      await expect(service.checkFriendshipStatus('test_user_id')).rejects.toThrow();
    });
  });

  describe('sendRegistrationSuccessNotification', () => {
    it('should send registration success notification to friend', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await service.sendRegistrationSuccessNotification(
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
    });

    it('should not send notification to non-friend', async () => {
      mockClient.getProfile.mockRejectedValue({
        statusCode: 403,
        message: 'Forbidden',
      });

      await service.sendRegistrationSuccessNotification(
        'test_user_id',
        mockRegistration,
        mockEvent
      );

      expect(mockClient.getProfile).toHaveBeenCalledWith('test_user_id');
      expect(mockClient.pushMessage).not.toHaveBeenCalled();
    });

    it('should handle push message errors', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockRejectedValue(new Error('Push message failed'));

      await expect(
        service.sendRegistrationSuccessNotification(
          'test_user_id',
          mockRegistration,
          mockEvent
        )
      ).rejects.toThrow('Push message failed');
    });
  });

  describe('sendEventReminder', () => {
    it('should send day before reminder', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await service.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'day_before'
      );

      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test_user_id',
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('明日活動提醒'),
        })
      );
    });

    it('should send hour before reminder', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await service.sendEventReminder(
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

    it('should include transport information in reminder', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await service.sendEventReminder(
        'test_user_id',
        mockRegistration,
        mockEvent,
        'day_before'
      );

      const pushMessageCall = mockClient.pushMessage.mock.calls[0];
      const message = pushMessageCall[1];
      
      expect(message.text).toContain('交通車資訊');
      expect(message.text).toContain('彰化火車站');
    });
  });

  describe('sendImportantInfo', () => {
    it('should send important info with action URL', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await service.sendImportantInfo(
        'test_user_id',
        '重要通知',
        '活動時間異動',
        'https://example.com/info'
      );

      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test_user_id',
        expect.objectContaining({
          type: 'flex',
          altText: expect.stringContaining('重要通知'),
        })
      );
    });

    it('should send important info without action URL', async () => {
      mockClient.getProfile.mockResolvedValue({ userId: 'test_user_id' });
      mockClient.pushMessage.mockResolvedValue({});

      await service.sendImportantInfo(
        'test_user_id',
        '重要通知',
        '活動時間異動'
      );

      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test_user_id',
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('重要通知'),
        })
      );
    });
  });

  describe('sendBulkMessages', () => {
    it('should send messages to multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      
      mockClient.getProfile.mockResolvedValue({ userId: 'test' });
      mockClient.pushMessage.mockResolvedValue({});

      const messageTemplate = {
        type: 'registration_success' as const,
        data: {
          registration: mockRegistration,
          event: mockEvent,
        },
      };

      const result = await service.sendBulkMessages(userIds, messageTemplate);

      expect(result.success).toEqual(userIds);
      expect(result.failed).toEqual([]);
      expect(mockClient.pushMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk send', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      
      mockClient.getProfile
        .mockResolvedValueOnce({ userId: 'user1' })
        .mockRejectedValueOnce({ statusCode: 403 }) // user2 not friend
        .mockResolvedValueOnce({ userId: 'user3' });
      
      mockClient.pushMessage.mockResolvedValue({});

      const messageTemplate = {
        type: 'registration_success' as const,
        data: {
          registration: mockRegistration,
          event: mockEvent,
        },
      };

      const result = await service.sendBulkMessages(userIds, messageTemplate);

      expect(result.success).toEqual(['user1', 'user3']);
      expect(result.failed).toEqual(['user2']);
    });

    it('should handle unknown message template type', async () => {
      const userIds = ['user1'];
      
      const messageTemplate = {
        type: 'unknown_type' as any,
        data: {},
      };

      const result = await service.sendBulkMessages(userIds, messageTemplate);

      expect(result.success).toEqual([]);
      expect(result.failed).toEqual(['user1']);
    });
  });

  describe('createFriendRequestGuidance', () => {
    it('should return friend request guidance message', () => {
      const guidance = service.createFriendRequestGuidance();
      
      expect(guidance).toContain('加入我們的官方帳號為好友');
      expect(guidance).toContain('接收活動通知');
    });
  });

  describe('message creation methods', () => {
    it('should create registration success message with transport info', () => {
      const message = (service as any).createRegistrationSuccessMessage(
        mockRegistration,
        mockEvent
      );

      expect(message.type).toBe('flex');
      expect(message.altText).toContain('報名成功通知');
      expect(message.contents.body.contents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '🎉 報名成功！',
          }),
        ])
      );
    });

    it('should create event reminder message', () => {
      const message = (service as any).createEventReminderMessage(
        mockRegistration,
        mockEvent,
        'day_before'
      );

      expect(message.type).toBe('text');
      expect(message.text).toContain('明日活動提醒');
      expect(message.text).toContain(mockEvent.name);
      expect(message.text).toContain('交通車資訊');
    });

    it('should create important info message with action URL', () => {
      const message = (service as any).createImportantInfoMessage(
        '測試標題',
        '測試內容',
        'https://example.com'
      );

      expect(message.type).toBe('flex');
      expect(message.altText).toContain('測試標題');
    });

    it('should create important info message without action URL', () => {
      const message = (service as any).createImportantInfoMessage(
        '測試標題',
        '測試內容'
      );

      expect(message.type).toBe('text');
      expect(message.text).toContain('測試標題');
      expect(message.text).toContain('測試內容');
    });
  });
});

describe('LineMessagingService initialization', () => {
  it('should throw error when credentials are missing', () => {
    const originalEnv = process.env;
    
    // Remove credentials
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_CHANNEL_SECRET;

    expect(() => new LineMessagingService()).toThrow('LINE Channel credentials are required');
    
    // Restore environment
    process.env = originalEnv;
  });
});