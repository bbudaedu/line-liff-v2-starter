/**
 * 使用者報名記錄查詢 API 端點
 * User registration records query API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, AppError, logger } from '../../../../lib/errors';
import { getRegistrationService } from '../../../../services/registration';
import { db } from '../../../../lib/database';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }

  try {
    const { status, limit = '10', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // 驗證分頁參數
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new AppError('limit 參數必須是 1-100 之間的數字', 400, 'INVALID_LIMIT');
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      throw new AppError('offset 參數必須是非負數', 400, 'INVALID_OFFSET');
    }

    // 獲取使用者的所有報名記錄
    let registrations = await db.getRegistrationsByUserId(req.user!.lineUserId);

    // 根據狀態篩選
    if (status && typeof status === 'string') {
      const validStatuses = ['pending', 'confirmed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new AppError('無效的狀態參數', 400, 'INVALID_STATUS');
      }
      registrations = registrations.filter(reg => reg.status === status);
    }

    // 按建立時間倒序排列
    registrations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 分頁處理
    const total = registrations.length;
    const paginatedRegistrations = registrations.slice(offsetNum, offsetNum + limitNum);

    // 獲取每個報名的 Pretix 訂單狀態（如果有的話）
    const registrationService = getRegistrationService();
    const registrationsWithPretixStatus = await Promise.all(
      paginatedRegistrations.map(async (registration) => {
        let pretixOrder = null;
        
        if (registration.pretixOrderId) {
          try {
            pretixOrder = await registrationService.getRegistrationStatus(
              registration.eventId,
              registration.pretixOrderId
            );
          } catch (error) {
            logger.warn('無法獲取 Pretix 訂單狀態', {
              registrationId: registration.id,
              pretixOrderId: registration.pretixOrderId,
              error: (error as Error).message,
              requestId: req.requestId
            });
          }
        }

        return {
          registrationId: registration.id,
          orderCode: registration.pretixOrderId,
          status: registration.status,
          eventId: registration.eventId,
          identity: registration.identity,
          personalInfo: registration.personalInfo,
          transport: registration.transport,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt,
          pretixOrder: pretixOrder ? {
            code: pretixOrder.code,
            status: pretixOrder.status,
            email: pretixOrder.email,
            datetime: pretixOrder.datetime,
            total: pretixOrder.total
          } : null
        };
      })
    );

    const responseData = {
      registrations: registrationsWithPretixStatus,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    };

    logger.info('使用者報名記錄查詢成功', {
      userId: req.user!.lineUserId,
      total,
      returned: registrationsWithPretixStatus.length,
      status: status || 'all',
      requestId: req.requestId
    });

    res.status(200).json(formatSuccessResponse(
      responseData,
      `查詢到 ${total} 筆報名記錄`,
      req.requestId
    ));

  } catch (error) {
    logger.error('查詢使用者報名記錄失敗', error as Error, {
      userId: req.user?.lineUserId,
      query: req.query,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('查詢報名記錄失敗', 500, 'QUERY_REGISTRATIONS_ERROR'),
        req.requestId
      ));
    }
  }
}

export default withAuthMiddleware(handler);