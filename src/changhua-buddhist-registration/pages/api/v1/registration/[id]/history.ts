/**
 * 報名歷史記錄查詢 API 端點
 * Registration history query API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, NotFoundError, ForbiddenError, AppError, logger } from '../../../../../lib/errors';
import { db } from '../../../../../lib/database';
import { securityHeaders, validateCors } from '../../../../../lib/validation';
import { rateLimit, rateLimitConfigs } from '../../../../../lib/rate-limiting';
import { securityMonitoring, logSecurityEvent, SecurityEventType } from '../../../../../lib/security-monitoring';

// Security middleware wrapper
const secureHandler = rateLimit(rateLimitConfigs.query)(
  withAuthMiddleware(handler)
);

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    logSecurityEvent(req, SecurityEventType.PERMISSION_DENIED, 'Invalid method for registration history endpoint');
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }

  try {
    const { id: registrationId } = req.query;

    if (!registrationId || typeof registrationId !== 'string') {
      throw new AppError('報名 ID 為必填項目', 400, 'MISSING_REGISTRATION_ID');
    }

    // 記錄資料存取
    logSecurityEvent(req, SecurityEventType.DATA_ACCESS, 'Registration history accessed', {
      registrationId,
      userId: req.user!.lineUserId
    });

    // 檢查報名記錄是否存在且屬於當前使用者
    const registration = await db.getRegistrationById(registrationId);
    
    if (!registration) {
      throw new NotFoundError('找不到指定的報名記錄');
    }

    // 檢查權限：只能查詢自己的報名歷史
    if (registration.userId !== req.user!.lineUserId) {
      throw new ForbiddenError('您沒有權限查詢此報名記錄的歷史');
    }

    // 獲取報名歷史記錄
    const history = await db.getRegistrationHistory(registrationId);

    // 格式化歷史記錄，隱藏敏感資訊
    const formattedHistory = history.map(record => ({
      id: record.id,
      action: record.action,
      changes: record.changes.map(change => ({
        field: change.field,
        oldValue: sanitizeHistoryValue(change.field, change.oldValue),
        newValue: sanitizeHistoryValue(change.field, change.newValue),
        description: getChangeDescription(change.field, change.oldValue, change.newValue)
      })),
      reason: record.reason,
      createdAt: record.createdAt,
      metadata: {
        source: record.metadata?.modificationSource || record.metadata?.cancellationSource || 'unknown',
        userAgent: record.metadata?.userAgent ? 
          getUserAgentInfo(record.metadata.userAgent) : undefined
      }
    }));

    // 統計資訊
    const stats = {
      totalChanges: history.length,
      createdAt: registration.createdAt,
      lastModified: registration.updatedAt,
      modificationCount: history.filter(h => h.action === 'updated').length,
      isCancelled: registration.status === 'cancelled',
      cancelledAt: registration.status === 'cancelled' ? 
        history.find(h => h.action === 'cancelled')?.createdAt : undefined
    };

    // 權限資訊
    const permissionInfo = await db.canModifyRegistration(registrationId);
    const modificationInfo = {
      canModify: permissionInfo.canModify,
      reason: permissionInfo.reason,
      remainingModifications: Math.max(0, 5 - stats.modificationCount),
      modificationDeadline: await getModificationDeadline(registration.eventId)
    };

    logger.info('報名歷史查詢成功', {
      registrationId,
      userId: req.user!.lineUserId,
      historyCount: history.length,
      requestId: req.requestId
    });

    const responseData = {
      registrationId,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        identity: registration.identity,
        status: registration.status,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt
      },
      history: formattedHistory,
      statistics: stats,
      modificationInfo,
      timeline: generateTimeline(history, registration)
    };

    res.status(200).json(formatSuccessResponse(
      responseData,
      '報名歷史查詢成功',
      req.requestId
    ));

  } catch (error) {
    logger.error('查詢報名歷史失敗', error as Error, {
      registrationId: req.query.id,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('查詢報名歷史失敗', 500, 'QUERY_HISTORY_ERROR'),
        req.requestId
      ));
    }
  }
}

// 清理歷史記錄中的敏感值
function sanitizeHistoryValue(field: string, value: any): any {
  // 對於敏感欄位，只顯示部分資訊
  if (field === 'personalInfo' && value && typeof value === 'object') {
    const sanitized = { ...value };
    
    // 隱藏電話號碼的中間部分
    if (sanitized.phone) {
      sanitized.phone = sanitized.phone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2');
    }
    
    return sanitized;
  }
  
  return value;
}

// 獲取變更描述
function getChangeDescription(field: string, oldValue: any, newValue: any): string {
  switch (field) {
    case 'personalInfo':
      return '個人資料已更新';
    case 'transport':
      if (!oldValue?.required && newValue?.required) {
        return '新增交通車需求';
      } else if (oldValue?.required && !newValue?.required) {
        return '取消交通車需求';
      } else if (oldValue?.locationId !== newValue?.locationId) {
        return '變更交通車上車地點';
      }
      return '交通車資訊已更新';
    case 'status':
      if (newValue === 'cancelled') {
        return '報名已取消';
      } else if (newValue === 'confirmed') {
        return '報名已確認';
      }
      return `狀態變更為 ${newValue}`;
    default:
      return `${field} 已更新`;
  }
}

// 獲取使用者代理資訊
function getUserAgentInfo(userAgent: string): { browser?: string; os?: string } {
  const info: { browser?: string; os?: string } = {};
  
  // 簡單的瀏覽器檢測
  if (userAgent.includes('Chrome')) {
    info.browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    info.browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    info.browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    info.browser = 'Edge';
  }
  
  // 簡單的作業系統檢測
  if (userAgent.includes('Windows')) {
    info.os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    info.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    info.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    info.os = 'Android';
  } else if (userAgent.includes('iOS')) {
    info.os = 'iOS';
  }
  
  return info;
}

// 生成時間軸
function generateTimeline(history: any[], registration: any): any[] {
  const timeline = [];
  
  // 建立報名事件
  timeline.push({
    type: 'created',
    title: '報名建立',
    description: `${registration.identity === 'monk' ? '法師' : '志工'}報名已建立`,
    timestamp: registration.createdAt,
    icon: 'create'
  });
  
  // 添加歷史事件
  history.forEach(record => {
    let title = '';
    let description = '';
    let icon = '';
    
    switch (record.action) {
      case 'updated':
        title = '資料修改';
        description = record.changes.map(change => 
          getChangeDescription(change.field, change.oldValue, change.newValue)
        ).join('、');
        icon = 'edit';
        break;
      case 'cancelled':
        title = '報名取消';
        description = record.reason || '使用者主動取消';
        icon = 'cancel';
        break;
      default:
        title = record.action;
        description = '狀態變更';
        icon = 'update';
    }
    
    timeline.push({
      type: record.action,
      title,
      description,
      timestamp: record.createdAt,
      icon,
      reason: record.reason
    });
  });
  
  // 按時間排序（最新的在前）
  return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// 獲取修改截止時間
async function getModificationDeadline(eventId: string): Promise<Date | null> {
  try {
    const event = await db.getEventById(eventId);
    if (event) {
      return new Date(event.startDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Apply security middleware in order
export default async function secureEndpoint(req: ExtendedNextApiRequest, res: NextApiResponse) {
  securityHeaders(req, res, () => {
    validateCors(req, res, () => {
      securityMonitoring(req, res, () => {
        secureHandler(req, res);
      });
    });
  });
}