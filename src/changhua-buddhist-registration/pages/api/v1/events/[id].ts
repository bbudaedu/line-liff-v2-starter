/**
 * 活動詳情查詢 API 端點
 * Event details query API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, NotFoundError, AppError, logger } from '../../../../lib/errors';
import { getPretixClient } from '../../../../services/pretix';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }

  const { id } = req.query;

  try {
    // 從 Pretix 獲取活動詳情
    const pretixClient = getPretixClient();
    const event = await pretixClient.getEvent(id as string);

    if (!event) {
      throw new NotFoundError('找不到指定的活動');
    }

    // 格式化活動資料
    const eventData = {
      id: event.slug,
      name: event.name?.['zh-tw'] || event.name?.en || event.name,
      description: event.meta_data?.description || '',
      dateFrom: event.date_from,
      dateTo: event.date_to,
      dateAdmission: event.date_admission,
      location: event.location || '',
      live: event.live,
      presale_start: event.presale_start,
      presale_end: event.presale_end,
      currency: event.currency,
      meta_data: event.meta_data
    };

    logger.info('活動詳情查詢成功', {
      eventId: id,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    res.status(200).json(formatSuccessResponse(
      eventData,
      '活動詳情查詢成功',
      req.requestId
    ));

  } catch (error) {
    logger.error('查詢活動詳情失敗', error as Error, {
      eventId: id,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('查詢活動詳情失敗', 500, 'QUERY_EVENT_ERROR'),
        req.requestId
      ));
    }
  }
}

export default withAuthMiddleware(handler);