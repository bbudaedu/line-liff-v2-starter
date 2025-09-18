/**
 * 使用者資料管理 API
 * User profile management API
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware, validateRequest } from '../../../../lib/middleware';
import { formatSuccessResponse, NotFoundError, ValidationError } from '../../../../lib/errors';
import { db } from '../../../../lib/database';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const userId = req.user!.lineUserId;

  switch (method) {
    case 'GET':
      return await getProfile(req, res, userId);
    case 'POST':
      return await createOrUpdateProfile(req, res, userId);
    case 'PUT':
      return await updateProfile(req, res, userId);
    default:
      return res.status(405).json({
        success: false,
        message: '方法不被允許',
        code: 'METHOD_NOT_ALLOWED',
      });
  }
}

async function getProfile(req: ExtendedNextApiRequest, res: NextApiResponse, userId: string) {
  const user = await db.getUserByLineId(userId);
  
  if (!user) {
    throw new NotFoundError('使用者資料不存在');
  }

  res.status(200).json(formatSuccessResponse(user, '成功取得使用者資料', req.requestId));
}

async function createOrUpdateProfile(req: ExtendedNextApiRequest, res: NextApiResponse, userId: string) {
  const { displayName, pictureUrl, identity, phone, emergencyContact, templeName } = req.body;

  // 驗證必填欄位
  if (!identity || !['monk', 'volunteer'].includes(identity)) {
    throw new ValidationError('身份類型必須是 monk 或 volunteer');
  }

  const existingUser = await db.getUserByLineId(userId);
  
  if (existingUser) {
    // 更新現有使用者
    const updatedUser = await db.updateUser(userId, {
      displayName: displayName || existingUser.displayName,
      pictureUrl: pictureUrl || existingUser.pictureUrl,
      identity,
      phone,
      emergencyContact,
      templeName,
    });

    res.status(200).json(formatSuccessResponse(updatedUser, '使用者資料更新成功', req.requestId));
  } else {
    // 建立新使用者
    const newUser = await db.createUser({
      lineUserId: userId,
      displayName: displayName || req.user!.displayName,
      pictureUrl: pictureUrl || req.user!.pictureUrl,
      identity,
      phone,
      emergencyContact,
      templeName,
    });

    res.status(201).json(formatSuccessResponse(newUser, '使用者資料建立成功', req.requestId));
  }
}

async function updateProfile(req: ExtendedNextApiRequest, res: NextApiResponse, userId: string) {
  const updates = req.body;
  
  const existingUser = await db.getUserByLineId(userId);
  if (!existingUser) {
    throw new NotFoundError('使用者資料不存在');
  }

  const updatedUser = await db.updateUser(userId, updates);
  
  res.status(200).json(formatSuccessResponse(updatedUser, '使用者資料更新成功', req.requestId));
}

// 使用驗證中介軟體
export default withAuthMiddleware(handler);