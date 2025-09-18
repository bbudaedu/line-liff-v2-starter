import { NextApiRequest, NextApiResponse } from 'next';
import { lineMessagingService, MessageTemplate } from '@/services/line-messaging';
import { withBasicMiddleware } from '@/lib/middleware';
import { ApiResponse } from '@/types';

/**
 * 批量發送 LINE 通知 API
 */
interface BulkNotifyRequest {
  userIds: string[];
  messageTemplate: MessageTemplate;
}

interface BulkNotifyResponse {
  totalUsers: number;
  successCount: number;
  failedCount: number;
  successUsers: string[];
  failedUsers: string[];
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BulkNotifyResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { userIds, messageTemplate }: BulkNotifyRequest = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds 必須是非空陣列',
        timestamp: new Date().toISOString(),
      });
    }

    if (!messageTemplate || !messageTemplate.type || !messageTemplate.data) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數：messageTemplate',
        timestamp: new Date().toISOString(),
      });
    }

    // 限制批量發送的使用者數量
    const MAX_BULK_USERS = 100;
    if (userIds.length > MAX_BULK_USERS) {
      return res.status(400).json({
        success: false,
        message: `批量發送使用者數量不能超過 ${MAX_BULK_USERS} 人`,
        timestamp: new Date().toISOString(),
      });
    }

    // 驗證訊息模板資料
    const validationError = validateMessageTemplate(messageTemplate);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Starting bulk message send to ${userIds.length} users`);
    
    const result = await lineMessagingService.sendBulkMessages(userIds, messageTemplate);

    const response: BulkNotifyResponse = {
      totalUsers: userIds.length,
      successCount: result.success.length,
      failedCount: result.failed.length,
      successUsers: result.success,
      failedUsers: result.failed,
    };

    console.log(`Bulk message send completed: ${result.success.length} success, ${result.failed.length} failed`);

    res.status(200).json({
      success: true,
      data: response,
      message: `批量通知發送完成，成功 ${result.success.length} 人，失敗 ${result.failed.length} 人`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('LINE bulk notify API error:', error);

    res.status(500).json({
      success: false,
      message: '批量通知發送失敗',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 驗證訊息模板資料
 */
function validateMessageTemplate(template: MessageTemplate): string | null {
  switch (template.type) {
    case 'registration_success':
      if (!template.data.registration || !template.data.event) {
        return '報名成功通知需要 registration 和 event 資料';
      }
      break;

    case 'event_reminder':
      if (!template.data.registration || !template.data.event || !template.data.reminderType) {
        return '活動提醒需要 registration, event 和 reminderType 資料';
      }
      if (!['day_before', 'hour_before'].includes(template.data.reminderType)) {
        return 'reminderType 必須是 day_before 或 hour_before';
      }
      break;

    case 'transport_info':
    case 'friend_request':
      if (!template.data.title || !template.data.content) {
        return '重要資訊通知需要 title 和 content';
      }
      break;

    default:
      return `不支援的訊息模板類型：${template.type}`;
  }

  return null;
}

export default withBasicMiddleware(handler);