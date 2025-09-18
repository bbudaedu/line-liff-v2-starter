import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/v1/line/notify';
import { lineMessagingService } from '@/services/line-messaging';

// Mock LINE messaging service
jest.mock('@/services/line-messaging', () => ({
  LineMessagingService: jest.fn(),
  getLineMessagingService: jest.fn(),
  lineMessagingService: {
    sendRegistrationSuccessNotification: jest.fn(),
    sendEventReminder: jest.fn(),
    sendImportantInfo: jest.fn(),
  },
}));

const mockLineMessagingService = lineMessagingService as jest.Mocked<typeof lineMessagingService>;

describe('/api/v1/line/notify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle registration success notification', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'registration_success',
        data: {
          registration: {
            id: 'reg_1',
            userId: 'test_user_id',
            eventId: 'event_1',
            identity: 'monk',
            personalInfo: { name: '測試法師', phone: '0912345678' },
            transport: { required: false },
            status: 'confirmed',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          event: {
            id: 'event_1',
            name: '測試活動',
            description: '測試描述',
            startDate: new Date(),
            endDate: new Date(),
            location: '測試地點',
            maxParticipants: 100,
            currentParticipants: 50,
            registrationDeadline: new Date(),
            status: 'open',
            pretixEventSlug: 'test-event',
            transportOptions: [],
          },
        },
      },
    });

    mockLineMessagingService.sendRegistrationSuccessNotification.mockResolvedValue();

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: { sent: true },
      message: 'LINE 通知發送成功',
      timestamp: expect.any(String),
    });

    expect(mockLineMessagingService.sendRegistrationSuccessNotification).toHaveBeenCalledWith(
      'test_user_id',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should handle event reminder notification', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'event_reminder',
        data: {
          registration: {
            id: 'reg_1',
            userId: 'test_user_id',
            eventId: 'event_1',
            identity: 'monk',
            personalInfo: { name: '測試法師', phone: '0912345678' },
            transport: { required: false },
            status: 'confirmed',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          event: {
            id: 'event_1',
            name: '測試活動',
            description: '測試描述',
            startDate: new Date(),
            endDate: new Date(),
            location: '測試地點',
            maxParticipants: 100,
            currentParticipants: 50,
            registrationDeadline: new Date(),
            status: 'open',
            pretixEventSlug: 'test-event',
            transportOptions: [],
          },
          reminderType: 'day_before',
        },
      },
    });

    mockLineMessagingService.sendEventReminder.mockResolvedValue();

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: { sent: true },
      message: 'LINE 通知發送成功',
      timestamp: expect.any(String),
    });

    expect(mockLineMessagingService.sendEventReminder).toHaveBeenCalledWith(
      'test_user_id',
      expect.any(Object),
      expect.any(Object),
      'day_before'
    );
  });

  it('should handle important info notification', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'important_info',
        data: {
          title: '重要通知',
          content: '活動異動',
          actionUrl: 'https://example.com',
        },
      },
    });

    mockLineMessagingService.sendImportantInfo.mockResolvedValue();

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockLineMessagingService.sendImportantInfo).toHaveBeenCalledWith(
      'test_user_id',
      '重要通知',
      '活動異動',
      'https://example.com'
    );
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: 'Method not allowed',
      timestamp: expect.any(String),
    });
  });

  it('should return 400 for missing parameters', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        // missing type and data
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '缺少必要參數：userId, type, data',
      timestamp: expect.any(String),
    });
  });

  it('should return 400 for invalid notification type', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'invalid_type',
        data: {},
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '不支援的通知類型：invalid_type',
      timestamp: expect.any(String),
    });
  });

  it('should handle LINE API not friend error', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'registration_success',
        data: {
          registration: { id: 'reg_1' },
          event: { id: 'event_1' },
        },
      },
    });

    const error = new Error('Forbidden');
    (error as any).statusCode = 403;
    mockLineMessagingService.sendRegistrationSuccessNotification.mockRejectedValue(error);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '使用者尚未加入好友，無法發送訊息',
      code: 'NOT_FRIEND',
      timestamp: expect.any(String),
    });
  });

  it('should handle LINE API bad request error', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'registration_success',
        data: {
          registration: { id: 'reg_1' },
          event: { id: 'event_1' },
        },
      },
    });

    const error = new Error('Bad Request');
    (error as any).statusCode = 400;
    mockLineMessagingService.sendRegistrationSuccessNotification.mockRejectedValue(error);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: 'LINE API 請求參數錯誤',
      code: 'INVALID_REQUEST',
      timestamp: expect.any(String),
    });
  });

  it('should handle internal server errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'registration_success',
        data: {
          registration: { id: 'reg_1' },
          event: { id: 'event_1' },
        },
      },
    });

    mockLineMessagingService.sendRegistrationSuccessNotification.mockRejectedValue(
      new Error('Internal error')
    );

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: 'LINE 通知發送失敗',
      code: 'INTERNAL_ERROR',
      timestamp: expect.any(String),
    });
  });

  it('should validate registration success data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'registration_success',
        data: {
          // missing registration and event
        },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '報名成功通知需要 registration 和 event 資料',
      timestamp: expect.any(String),
    });
  });

  it('should validate event reminder data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'event_reminder',
        data: {
          registration: { id: 'reg_1' },
          // missing event and reminderType
        },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '活動提醒需要 registration, event 和 reminderType 資料',
      timestamp: expect.any(String),
    });
  });

  it('should validate important info data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test_user_id',
        type: 'important_info',
        data: {
          title: '重要通知',
          // missing content
        },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '重要資訊通知需要 title 和 content',
      timestamp: expect.any(String),
    });
  });
});