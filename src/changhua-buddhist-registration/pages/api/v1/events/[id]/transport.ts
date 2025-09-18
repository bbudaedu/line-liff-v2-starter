/**
 * 活動交通車資訊 API
 * Event transport information API
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withBasicMiddleware } from '../../../../../lib/middleware';
import { formatSuccessResponse, NotFoundError } from '../../../../../lib/errors';
import { db } from '../../../../../lib/database';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '方法不被允許',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    throw new NotFoundError('活動 ID 無效');
  }

  // 確認活動存在
  const event = await db.getEventById(id);
  if (!event) {
    throw new NotFoundError('活動不存在');
  }

  // 取得交通車選項
  const transportOptions = await db.getTransportOptionsByEventId(id);
  
  // 計算每個地點的可用座位
  const transportWithAvailability = transportOptions.map(transport => ({
    ...transport,
    availableSeats: transport.maxSeats - transport.bookedSeats,
    isAvailable: transport.bookedSeats < transport.maxSeats,
  }));

  res.status(200).json(formatSuccessResponse(
    transportWithAvailability,
    '成功取得交通車資訊',
    req.requestId
  ));
}

export default withBasicMiddleware(handler);