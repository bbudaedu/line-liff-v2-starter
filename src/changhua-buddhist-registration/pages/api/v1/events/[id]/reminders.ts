/**
 * 活動提醒和重要資訊 API 端點
 * Event Reminders and Important Information API Endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, NotFoundError, AppError, logger } from '../../../../../lib/errors';
import { db } from '../../../../../lib/database';
import { apiClient } from '../../../../../services/api';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }

  const { id: eventId } = req.query;

  try {
    // 獲取活動詳情
    const eventResponse = await apiClient.get(`/api/v1/events/${eventId}`);
    const event = eventResponse.data;

    if (!event) {
      throw new NotFoundError('找不到指定的活動');
    }

    // 獲取使用者的報名記錄
    const registrations = await db.getRegistrationsByUserId(req.user!.lineUserId);
    const userRegistration = registrations.find(reg => reg.eventId === eventId);

    if (!userRegistration) {
      throw new NotFoundError('您尚未報名此活動');
    }

    // 生成提醒和重要資訊
    const reminders = generateEventReminders(event, userRegistration);
    const importantInfo = generateImportantInfo(event, userRegistration);

    const responseData = {
      eventId,
      eventName: event.name,
      eventDate: event.dateFrom,
      registrationStatus: userRegistration.status,
      reminders,
      importantInfo,
      lastUpdated: new Date().toISOString()
    };

    logger.info('活動提醒資訊查詢成功', {
      eventId,
      userId: req.user!.lineUserId,
      registrationId: userRegistration.id,
      requestId: req.requestId
    });

    res.status(200).json(formatSuccessResponse(
      responseData,
      '活動提醒資訊查詢成功',
      req.requestId
    ));

  } catch (error) {
    logger.error('查詢活動提醒資訊失敗', error as Error, {
      eventId,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('查詢活動提醒資訊失敗', 500, 'QUERY_REMINDERS_ERROR'),
        req.requestId
      ));
    }
  }
}

// 生成活動提醒
function generateEventReminders(event: any, registration: any): string[] {
  const reminders: string[] = [];
  const now = new Date();
  const eventDate = new Date(event.dateFrom);
  const timeDiff = eventDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));

  if (registration.status !== 'confirmed') {
    return reminders;
  }

  // 活動前提醒
  if (daysDiff > 7) {
    reminders.push(`活動將在 ${daysDiff} 天後舉行，請提前安排時間`);
  } else if (daysDiff > 1) {
    reminders.push(`活動將在 ${daysDiff} 天後舉行，請準備相關物品`);
  } else if (daysDiff === 1) {
    reminders.push('活動明天舉行，請確認交通安排');
  } else if (hoursDiff > 2 && daysDiff === 0) {
    reminders.push(`活動今天舉行，還有 ${hoursDiff} 小時開始`);
  } else if (hoursDiff > 0 && daysDiff === 0) {
    reminders.push('活動即將開始，請準時到達');
  }

  // 交通車提醒
  if (registration.transport?.required) {
    if (daysDiff <= 1) {
      reminders.push('請準時到達指定的交通車上車地點');
      if (registration.transport.locationId) {
        reminders.push(`上車地點：${registration.transport.locationId}`);
      }
      if (registration.transport.pickupTime) {
        const pickupTime = new Date(registration.transport.pickupTime);
        reminders.push(`上車時間：${pickupTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`);
      }
    }
  }

  // 天氣提醒（可以整合天氣 API）
  if (daysDiff <= 3) {
    reminders.push('請關注天氣狀況，適當增減衣物');
  }

  return reminders;
}

// 生成重要資訊
function generateImportantInfo(event: any, registration: any): any {
  const info: any = {
    event: {
      name: event.name,
      date: event.dateFrom,
      location: event.location,
      admissionTime: event.dateAdmission,
      description: event.description
    },
    registration: {
      identity: registration.identity === 'monk' ? '法師' : '志工',
      status: getStatusLabel(registration.status),
      orderCode: registration.pretixOrderId
    },
    contact: {
      phone: '聯絡電話：請洽主辦單位',
      emergency: '緊急聯絡：請撥打 119 或 110'
    },
    guidelines: []
  };

  // 根據身份添加指引
  if (registration.identity === 'monk') {
    info.guidelines.push('請攜帶身份證明文件');
    info.guidelines.push('建議穿著整齊法服');
    info.guidelines.push('如有特殊飲食需求，請提前告知');
  } else {
    info.guidelines.push('請攜帶身份證明文件');
    info.guidelines.push('建議穿著樸素整齊服裝');
    info.guidelines.push('請遵守活動現場秩序');
  }

  // 交通資訊
  if (registration.transport?.required) {
    info.transport = {
      required: true,
      location: registration.transport.locationId,
      pickupTime: registration.transport.pickupTime,
      notes: [
        '請提前 10 分鐘到達上車地點',
        '請攜帶手機以便聯絡',
        '如有緊急狀況請立即聯絡主辦單位'
      ]
    };
  } else {
    info.transport = {
      required: false,
      notes: [
        '請自行安排交通工具',
        '建議提前查詢路線和停車資訊',
        '如需協助請聯絡主辦單位'
      ]
    };
  }

  // 活動當天注意事項
  const eventDate = new Date(event.dateFrom);
  const now = new Date();
  const daysDiff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 1) {
    info.todayNotes = [
      '請確認活動時間和地點',
      '建議提前 30 分鐘到達',
      '請攜帶身份證明文件',
      '如有身體不適請勿勉強參加'
    ];
  }

  return info;
}

// 獲取狀態標籤
function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return '已確認';
    case 'pending':
      return '處理中';
    case 'cancelled':
      return '已取消';
    default:
      return '未知';
  }
}

export default withAuthMiddleware(handler);