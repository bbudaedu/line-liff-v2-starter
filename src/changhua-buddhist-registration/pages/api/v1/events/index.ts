/**
 * 活動列表 API
 * Events list API
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withBasicMiddleware } from '../../../../lib/middleware';
import { formatSuccessResponse } from '../../../../lib/errors';
import { db, initializeTestData } from '../../../../lib/database';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '方法不被允許',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // 確保測試資料已初始化
  const events = await db.getEvents();
  if (events.length === 0) {
    await initializeTestData();
  }

  // 取得所有活動
  const allEvents = await db.getEvents();
  
  // 為每個活動加上交通車資訊
  const eventsWithTransport = await Promise.all(
    allEvents.map(async (event) => {
      const transportOptions = await db.getTransportOptionsByEventId(event.id);
      return {
        ...event,
        transportOptions,
      };
    })
  );

  // 過濾出可報名的活動（狀態為 open 且未過報名截止時間）
  const now = new Date();
  const availableEvents = eventsWithTransport.filter(event => 
    event.status === 'open' && new Date(event.registrationDeadline) > now
  );

  res.status(200).json(formatSuccessResponse(
    availableEvents,
    '成功取得活動列表',
    req.requestId
  ));
}

export default withBasicMiddleware(handler);