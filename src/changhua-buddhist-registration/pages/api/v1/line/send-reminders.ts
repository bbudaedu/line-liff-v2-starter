import { NextApiRequest, NextApiResponse } from 'next';
import { notificationService } from '@/services/notification';
import { withBasicMiddleware } from '@/lib/middleware';
import { ApiResponse } from '@/types';

/**
 * 發送活動提醒的排程 API
 * 這個 API 可以被 cron job 或其他排程服務呼叫
 */
interface SendRemindersRequest {
  eventId?: string;
  reminderType: 'day_before' | 'hour_before';
  authToken?: string; // 用於驗證排程呼叫的權限
}

interface SendRemindersResponse {
  processedEvents: number;
  totalSuccess: number;
  totalFailed: number;
  eventResults: Array<{
    eventId: string;
    eventName: string;
    success: number;
    failed: number;
  }>;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<SendRemindersResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { eventId, reminderType, authToken }: SendRemindersRequest = req.body;

    // 驗證排程呼叫權限
    const expectedToken = process.env.CRON_AUTH_TOKEN;
    if (expectedToken && authToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    if (!reminderType || !['day_before', 'hour_before'].includes(reminderType)) {
      return res.status(400).json({
        success: false,
        message: 'reminderType 必須是 day_before 或 hour_before',
        timestamp: new Date().toISOString(),
      });
    }

    let eventsToProcess: string[] = [];
    
    if (eventId) {
      // 處理特定活動
      eventsToProcess = [eventId];
    } else {
      // 獲取需要發送提醒的活動列表
      eventsToProcess = await getEventsNeedingReminders(reminderType);
    }

    if (eventsToProcess.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          processedEvents: 0,
          totalSuccess: 0,
          totalFailed: 0,
          eventResults: [],
        },
        message: '沒有需要發送提醒的活動',
        timestamp: new Date().toISOString(),
      });
    }

    const eventResults: Array<{
      eventId: string;
      eventName: string;
      success: number;
      failed: number;
    }> = [];

    let totalSuccess = 0;
    let totalFailed = 0;

    // 為每個活動發送提醒
    for (const currentEventId of eventsToProcess) {
      try {
        console.log(`Processing reminders for event ${currentEventId} (${reminderType})`);
        
        const result = await notificationService.sendEventRemindersForEvent(
          currentEventId,
          reminderType
        );

        // 獲取活動名稱用於回應
        const eventName = await getEventName(currentEventId);

        eventResults.push({
          eventId: currentEventId,
          eventName,
          success: result.success,
          failed: result.failed,
        });

        totalSuccess += result.success;
        totalFailed += result.failed;

        console.log(`Reminders sent for event ${currentEventId}: ${result.success} success, ${result.failed} failed`);
      } catch (error) {
        console.error(`Error processing reminders for event ${currentEventId}:`, error);
        
        const eventName = await getEventName(currentEventId);
        eventResults.push({
          eventId: currentEventId,
          eventName,
          success: 0,
          failed: 1, // 整個活動處理失敗
        });
        
        totalFailed += 1;
      }
    }

    const response: SendRemindersResponse = {
      processedEvents: eventsToProcess.length,
      totalSuccess,
      totalFailed,
      eventResults,
    };

    console.log(`Reminder batch completed: ${totalSuccess} success, ${totalFailed} failed across ${eventsToProcess.length} events`);

    res.status(200).json({
      success: true,
      data: response,
      message: `提醒發送完成，處理 ${eventsToProcess.length} 個活動，成功 ${totalSuccess} 人，失敗 ${totalFailed} 人`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Send reminders API error:', error);

    res.status(500).json({
      success: false,
      message: '提醒發送失敗',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 獲取需要發送提醒的活動列表
 */
async function getEventsNeedingReminders(reminderType: 'day_before' | 'hour_before'): Promise<string[]> {
  try {
    // 計算目標時間範圍
    const now = new Date();
    let targetStart: Date;
    let targetEnd: Date;

    if (reminderType === 'day_before') {
      // 明天的活動（24小時後 ± 1小時）
      targetStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23小時後
      targetEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25小時後
    } else {
      // 1小時後的活動（1小時後 ± 15分鐘）
      targetStart = new Date(now.getTime() + 45 * 60 * 1000);      // 45分鐘後
      targetEnd = new Date(now.getTime() + 75 * 60 * 1000);        // 75分鐘後
    }

    // 這裡應該查詢資料庫獲取在目標時間範圍內的活動
    // 目前返回空陣列，實際實作時需要連接資料庫
    console.log(`Looking for events between ${targetStart.toISOString()} and ${targetEnd.toISOString()}`);
    
    // TODO: 實作資料庫查詢
    // const events = await db.events.findMany({
    //   where: {
    //     startDate: {
    //       gte: targetStart,
    //       lte: targetEnd,
    //     },
    //     status: 'open',
    //   },
    //   select: {
    //     id: true,
    //   },
    // });
    // 
    // return events.map(event => event.id);

    return [];
  } catch (error) {
    console.error('Error getting events needing reminders:', error);
    return [];
  }
}

/**
 * 獲取活動名稱
 */
async function getEventName(eventId: string): Promise<string> {
  try {
    // 這裡應該查詢資料庫獲取活動名稱
    // 目前返回預設值
    return `活動 ${eventId}`;
  } catch (error) {
    console.error(`Error getting event name for ${eventId}:`, error);
    return `活動 ${eventId}`;
  }
}

export default withBasicMiddleware(handler);