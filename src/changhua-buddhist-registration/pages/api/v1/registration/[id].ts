/**
 * 報名狀態查詢 API 端點
 * Registration status query API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, NotFoundError, ForbiddenError, AppError, logger } from '../../../../lib/errors';
import { getRegistrationService } from '../../../../services/registration';
import { db } from '../../../../lib/database';

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    return await handleGetRegistration(req, res, id as string);
  } else if (req.method === 'PUT') {
    return await handleUpdateRegistration(req, res, id as string);
  } else if (req.method === 'DELETE') {
    return await handleCancelRegistration(req, res, id as string);
  } else {
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }
}

// 查詢報名狀態
async function handleGetRegistration(req: ExtendedNextApiRequest, res: NextApiResponse, registrationId: string) {
  try {
    // 從資料庫獲取報名記錄
    const registration = await db.getRegistrationById(registrationId);
    
    if (!registration) {
      throw new NotFoundError('找不到指定的報名記錄');
    }

    // 檢查權限：只能查詢自己的報名記錄
    if (registration.userId !== req.user!.lineUserId) {
      throw new ForbiddenError('您沒有權限查詢此報名記錄');
    }

    // 如果有 Pretix 訂單 ID，獲取最新的訂單狀態
    let pretixOrder = null;
    if (registration.pretixOrderId) {
      try {
        const registrationService = getRegistrationService();
        pretixOrder = await registrationService.getRegistrationStatus(
          registration.eventId,
          registration.pretixOrderId
        );
      } catch (error) {
        logger.warn('無法獲取 Pretix 訂單狀態', {
          registrationId,
          pretixOrderId: registration.pretixOrderId,
          error: (error as Error).message,
          requestId: req.requestId
        });
      }
    }

    const responseData = {
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
        total: pretixOrder.total,
        positions: pretixOrder.positions
      } : null
    };

    logger.info('報名狀態查詢成功', {
      registrationId,
      userId: req.user!.lineUserId,
      requestId: req.requestId
    });

    res.status(200).json(formatSuccessResponse(
      responseData,
      '報名狀態查詢成功',
      req.requestId
    ));

  } catch (error) {
    logger.error('查詢報名狀態失敗', error as Error, {
      registrationId,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('查詢報名狀態失敗', 500, 'QUERY_REGISTRATION_ERROR'),
        req.requestId
      ));
    }
  }
}

// 更新報名資料
async function handleUpdateRegistration(req: ExtendedNextApiRequest, res: NextApiResponse, registrationId: string) {
  try {
    const registration = await db.getRegistrationById(registrationId);
    
    if (!registration) {
      throw new NotFoundError('找不到指定的報名記錄');
    }

    // 檢查權限
    if (registration.userId !== req.user!.lineUserId) {
      throw new ForbiddenError('您沒有權限修改此報名記錄');
    }

    // 檢查是否可以修改（例如：報名截止前、未取消狀態）
    if (registration.status === 'cancelled') {
      throw new AppError('已取消的報名無法修改', 400, 'REGISTRATION_CANCELLED');
    }

    const { personalInfo, transport } = req.body;
    const updates: any = {};

    if (personalInfo) {
      // 驗證個人資料格式
      if (personalInfo.name) updates.personalInfo = { ...registration.personalInfo, name: personalInfo.name.trim() };
      if (personalInfo.phone) updates.personalInfo = { ...updates.personalInfo || registration.personalInfo, phone: personalInfo.phone.replace(/\s/g, '') };
      if (personalInfo.specialRequirements !== undefined) {
        updates.personalInfo = { ...updates.personalInfo || registration.personalInfo, specialRequirements: personalInfo.specialRequirements?.trim() };
      }
    }

    if (transport !== undefined) {
      updates.transport = transport;
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('沒有提供要更新的資料', 400, 'NO_UPDATE_DATA');
    }

    // 準備歷史記錄的 metadata
    const historyMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      requestId: req.requestId,
      reason: '使用者修改資料',
      modificationSource: 'liff_app'
    };

    const updatedRegistration = await db.updateRegistration(registrationId, updates, historyMetadata);

    logger.info('報名資料更新成功', {
      registrationId,
      userId: req.user!.lineUserId,
      updates: Object.keys(updates),
      requestId: req.requestId
    });

    res.status(200).json(formatSuccessResponse(
      {
        registrationId: updatedRegistration!.id,
        status: updatedRegistration!.status,
        personalInfo: updatedRegistration!.personalInfo,
        transport: updatedRegistration!.transport,
        updatedAt: updatedRegistration!.updatedAt
      },
      '報名資料更新成功',
      req.requestId
    ));

  } catch (error) {
    logger.error('更新報名資料失敗', error as Error, {
      registrationId,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('更新報名資料失敗', 500, 'UPDATE_REGISTRATION_ERROR'),
        req.requestId
      ));
    }
  }
}

// 取消報名
async function handleCancelRegistration(req: ExtendedNextApiRequest, res: NextApiResponse, registrationId: string) {
  try {
    const registration = await db.getRegistrationById(registrationId);
    
    if (!registration) {
      throw new NotFoundError('找不到指定的報名記錄');
    }

    // 檢查權限
    if (registration.userId !== req.user!.lineUserId) {
      throw new ForbiddenError('您沒有權限取消此報名記錄');
    }

    // 檢查是否可以取消
    if (registration.status === 'cancelled') {
      throw new AppError('報名已經取消', 400, 'ALREADY_CANCELLED');
    }

    // 嘗試取消 Pretix 訂單
    let pretixCancelled = false;
    if (registration.pretixOrderId) {
      try {
        const registrationService = getRegistrationService();
        await registrationService.cancelRegistration(registration.eventId, registration.pretixOrderId);
        pretixCancelled = true;
      } catch (error) {
        logger.warn('Pretix 訂單取消失敗，但仍會更新本地狀態', {
          registrationId,
          pretixOrderId: registration.pretixOrderId,
          error: (error as Error).message,
          requestId: req.requestId
        });
      }
    }

    // 準備歷史記錄的 metadata
    const historyMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      requestId: req.requestId,
      reason: '使用者取消報名',
      cancellationSource: 'liff_app'
    };

    // 更新本地狀態
    const updatedRegistration = await db.updateRegistration(registrationId, {
      status: 'cancelled'
    }, historyMetadata);

    logger.info('報名取消成功', {
      registrationId,
      userId: req.user!.lineUserId,
      pretixCancelled,
      requestId: req.requestId
    });

    res.status(200).json(formatSuccessResponse(
      {
        registrationId: updatedRegistration!.id,
        status: updatedRegistration!.status,
        cancelledAt: updatedRegistration!.updatedAt,
        pretixCancelled
      },
      '報名取消成功',
      req.requestId
    ));

  } catch (error) {
    logger.error('取消報名失敗', error as Error, {
      registrationId,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('取消報名失敗', 500, 'CANCEL_REGISTRATION_ERROR'),
        req.requestId
      ));
    }
  }
}

export default withAuthMiddleware(handler);