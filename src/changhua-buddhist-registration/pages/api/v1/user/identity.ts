/**
 * 使用者身份設定 API
 * User identity setting API
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware, validateRequest } from '../../../../lib/middleware';
import { formatSuccessResponse, ValidationError } from '../../../../lib/errors';
import { db } from '../../../../lib/database';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '方法不被允許',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  const { identity } = req.body;
  const userId = req.user!.lineUserId;

  // 驗證身份類型
  if (!identity || !['monk', 'volunteer'].includes(identity)) {
    throw new ValidationError('身份類型必須是 monk 或 volunteer');
  }

  // 檢查使用者是否已存在
  const existingUser = await db.getUserByLineId(userId);
  
  if (existingUser) {
    // 更新身份
    const updatedUser = await db.updateUser(userId, { identity });
    res.status(200).json(formatSuccessResponse(
      { identity: updatedUser!.identity },
      '身份更新成功',
      req.requestId
    ));
  } else {
    // 建立新使用者並設定身份
    const newUser = await db.createUser({
      lineUserId: userId,
      displayName: req.user!.displayName,
      pictureUrl: req.user!.pictureUrl,
      identity,
    });

    res.status(201).json(formatSuccessResponse(
      { identity: newUser.identity },
      '身份設定成功',
      req.requestId
    ));
  }
}

export default withAuthMiddleware(handler);