import { NextApiRequest, NextApiResponse } from 'next';
import { lineMessagingService } from '@/services/line-messaging';
import { withBasicMiddleware } from '@/lib/middleware';
import { ApiResponse } from '@/types';

/**
 * 檢查 LINE 好友狀態 API
 */
interface FriendshipRequest {
  userId: string;
}

interface FriendshipResponse {
  isFriend: boolean;
  canSendMessage: boolean;
  guidanceMessage?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<FriendshipResponse>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數：userId',
        timestamp: new Date().toISOString(),
      });
    }

    const friendshipStatus = await lineMessagingService.checkFriendshipStatus(userId);
    
    const response: FriendshipResponse = {
      isFriend: friendshipStatus.isFriend,
      canSendMessage: friendshipStatus.canSendMessage,
    };

    // 如果不是好友，提供加好友引導訊息
    if (!friendshipStatus.isFriend) {
      response.guidanceMessage = lineMessagingService.createFriendRequestGuidance();
    }

    res.status(200).json({
      success: true,
      data: response,
      message: '好友狀態檢查完成',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('LINE friendship API error:', error);

    // 處理 LINE API 特定錯誤
    if (error.statusCode === 403) {
      // 403 錯誤表示不是好友，這是正常情況
      return res.status(200).json({
        success: true,
        data: {
          isFriend: false,
          canSendMessage: false,
          guidanceMessage: lineMessagingService.createFriendRequestGuidance(),
        },
        message: '使用者尚未加入好友',
        timestamp: new Date().toISOString(),
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: 'LINE API 請求參數錯誤',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      message: '好友狀態檢查失敗',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

export default withBasicMiddleware(handler);