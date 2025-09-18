import { NextApiRequest, NextApiResponse } from 'next';
import { lineMessagingService } from '@/services/line-messaging';
import { withBasicMiddleware } from '@/lib/middleware';
import { ApiResponse } from '@/types';

/**
 * 發送 LINE 通知 API
 */
interface NotifyRequest {
  userId: string;
  type: 'registration_success' | 'event_reminder' | 'important_info';
  data: any;
}

interface NotifyResponse {
  sent: boolean;
  messageId?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<NotifyResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { userId, type, data }: NotifyRequest = req.body;

    if (!userId || !type || !data) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數：userId, type, data',
        timestamp: new Date().toISOString(),
      });
    }

    let result: any;

    switch (type) {
      case 'registration_success':
        if (!data.registration || !data.event) {
          return res.status(400).json({
            success: false,
            message: '報名成功通知需要 registration 和 event 資料',
            timestamp: new Date().toISOString(),
          });
        }
        
        await lineMessagingService.sendRegistrationSuccessNotification(
          userId,
          data.registration,
          data.event
        );
        result = { sent: true };
        break;

      case 'event_reminder':
        if (!data.registration || !data.event || !data.reminderType) {
          return res.status(400).json({
            success: false,
            message: '活動提醒需要 registration, event 和 reminderType 資料',
            timestamp: new Date().toISOString(),
          });
        }
        
        await lineMessagingService.sendEventReminder(
          userId,
          data.registration,
          data.event,
          data.reminderType
        );
        result = { sent: true };
        break;

      case 'important_info':
        if (!data.title || !data.content) {
          return res.status(400).json({
            success: false,
            message: '重要資訊通知需要 title 和 content',
            timestamp: new Date().toISOString(),
          });
        }
        
        await lineMessagingService.sendImportantInfo(
          userId,
          data.title,
          data.content,
          data.actionUrl
        );
        result = { sent: true };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `不支援的通知類型：${type}`,
          timestamp: new Date().toISOString(),
        });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'LINE 通知發送成功',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('LINE notify API error:', error);

    // 處理 LINE API 特定錯誤
    if (error.statusCode === 403) {
      return res.status(400).json({
        success: false,
        message: '使用者尚未加入好友，無法發送訊息',
        code: 'NOT_FRIEND',
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
      message: 'LINE 通知發送失敗',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

export default withBasicMiddleware(handler);