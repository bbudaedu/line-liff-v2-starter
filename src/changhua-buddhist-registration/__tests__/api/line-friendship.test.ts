import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/v1/line/friendship';
import { lineMessagingService } from '@/services/line-messaging';

// Mock LINE messaging service
jest.mock('@/services/line-messaging', () => ({
  LineMessagingService: jest.fn(),
  getLineMessagingService: jest.fn(),
  lineMessagingService: {
    checkFriendshipStatus: jest.fn(),
    createFriendRequestGuidance: jest.fn(),
  },
}));

const mockLineMessagingService = lineMessagingService as jest.Mocked<typeof lineMessagingService>;

describe('/api/v1/line/friendship', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return friendship status for friend user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: 'test_user_id',
      },
    });

    mockLineMessagingService.checkFriendshipStatus.mockResolvedValue({
      isFriend: true,
      canSendMessage: true,
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: {
        isFriend: true,
        canSendMessage: true,
      },
      message: '好友狀態檢查完成',
      timestamp: expect.any(String),
    });

    expect(mockLineMessagingService.checkFriendshipStatus).toHaveBeenCalledWith('test_user_id');
  });

  it('should return friendship status for non-friend user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: 'test_user_id',
      },
    });

    mockLineMessagingService.checkFriendshipStatus.mockResolvedValue({
      isFriend: false,
      canSendMessage: false,
    });

    mockLineMessagingService.createFriendRequestGuidance.mockReturnValue(
      '請加入我們的官方帳號為好友'
    );

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: {
        isFriend: false,
        canSendMessage: false,
        guidanceMessage: '請加入我們的官方帳號為好友',
      },
      message: '好友狀態檢查完成',
      timestamp: expect.any(String),
    });
  });

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: 'Method not allowed',
      timestamp: expect.any(String),
    });
  });

  it('should return 400 for missing userId', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '缺少必要參數：userId',
      timestamp: expect.any(String),
    });
  });

  it('should return 400 for invalid userId type', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: ['array', 'value'],
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '缺少必要參數：userId',
      timestamp: expect.any(String),
    });
  });

  it('should handle 403 error as non-friend status', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: 'test_user_id',
      },
    });

    const error = new Error('Forbidden');
    (error as any).statusCode = 403;
    mockLineMessagingService.checkFriendshipStatus.mockRejectedValue(error);

    mockLineMessagingService.createFriendRequestGuidance.mockReturnValue(
      '請加入我們的官方帳號為好友'
    );

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: {
        isFriend: false,
        canSendMessage: false,
        guidanceMessage: '請加入我們的官方帳號為好友',
      },
      message: '使用者尚未加入好友',
      timestamp: expect.any(String),
    });
  });

  it('should handle 400 error from LINE API', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: 'test_user_id',
      },
    });

    const error = new Error('Bad Request');
    (error as any).statusCode = 400;
    mockLineMessagingService.checkFriendshipStatus.mockRejectedValue(error);

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
      method: 'GET',
      query: {
        userId: 'test_user_id',
      },
    });

    mockLineMessagingService.checkFriendshipStatus.mockRejectedValue(
      new Error('Internal error')
    );

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: '好友狀態檢查失敗',
      code: 'INTERNAL_ERROR',
      timestamp: expect.any(String),
    });
  });
});