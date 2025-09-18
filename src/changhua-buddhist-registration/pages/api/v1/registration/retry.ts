/**
 * 報名重試 API 端點
 * Registration retry API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware, validateRequest } from '../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, ValidationError, AppError, logger } from '../../../../lib/errors';
import { getRegistrationRetryService } from '../../../../services/registration-retry';
import { RegistrationData } from '../../../../types/pretix';

// 重試請求驗證規則
const retryValidationSchema = {
  body: {
    eventSlug: { required: true, type: 'string', minLength: 1 },
    identity: { required: true, type: 'string', pattern: /^(monk|volunteer)$/ },
    personalInfo: { required: true, type: 'object' },
    transport: { required: false, type: 'object' },
    metadata: { required: false, type: 'object' }
  }
};

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return await handleCreateRetryableRegistration(req, res);
  } else if (req.method === 'GET') {
    return await handleGetRetryRecords(req, res);
  } else {
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }
}

// 建立可重試的報名
async function handleCreateRetryableRegistration(req: ExtendedNextApiRequest, res: NextApiResponse) {
  try {
    const { eventSlug, identity, personalInfo, transport, metadata } = req.body;

    // 驗證個人資料（重用之前的驗證邏輯）
    validatePersonalInfo(personalInfo, identity);
    validateTransport(transport);

    // 建立報名資料物件
    const registrationData: RegistrationData = {
      eventSlug,
      identity,
      personalInfo: {
        name: personalInfo.name.trim(),
        phone: personalInfo.phone.replace(/\s/g, ''),
        email: personalInfo.email?.trim() || `${req.user!.lineUserId}@line.local`,
        emergencyContact: personalInfo.emergencyContact?.trim(),
        templeName: personalInfo.templeName?.trim(),
        specialRequirements: personalInfo.specialRequirements?.trim()
      },
      transport: transport ? {
        required: transport.required,
        locationId: transport.locationId,
        pickupTime: transport.pickupTime
      } : undefined,
      lineUserId: req.user!.lineUserId,
      metadata: {
        ...metadata,
        userDisplayName: req.user!.displayName,
        userPictureUrl: req.user!.pictureUrl,
        registrationSource: 'liff_app_retry',
        userAgent: req.headers['user-agent']
      }
    };

    logger.info('開始建立可重試報名', {
      eventSlug,
      identity,
      userId: req.user!.lineUserId,
      requestId: req.requestId
    });

    const retryService = getRegistrationRetryService();
    const { retryId, result } = await retryService.createRetryableRegistration(
      req.user!.lineUserId,
      registrationData
    );

    if (result?.success) {
      // 第一次嘗試就成功
      res.status(201).json(formatSuccessResponse(
        {
          retryId,
          status: 'success',
          registrationId: result.order!.code,
          orderCode: result.order!.code,
          message: '報名成功完成'
        },
        '報名成功！',
        req.requestId
      ));
    } else {
      // 第一次失敗，已安排重試
      res.status(202).json(formatSuccessResponse(
        {
          retryId,
          status: 'retrying',
          message: '報名處理中，系統將自動重試',
          error: result?.error,
          errorCode: result?.errorCode
        },
        '報名請求已接收，正在處理中...',
        req.requestId
      ));
    }

  } catch (error) {
    logger.error('建立可重試報名失敗', error as Error, {
      body: req.body,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof ValidationError || error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('建立重試報名失敗', 500, 'CREATE_RETRY_ERROR'),
        req.requestId
      ));
    }
  }
}

// 獲取重試記錄
async function handleGetRetryRecords(req: ExtendedNextApiRequest, res: NextApiResponse) {
  try {
    const { retryId } = req.query;

    const retryService = getRegistrationRetryService();

    if (retryId && typeof retryId === 'string') {
      // 獲取特定重試記錄
      const record = await retryService.getRetryRecord(retryId);
      
      if (!record) {
        throw new AppError('找不到指定的重試記錄', 404, 'RETRY_RECORD_NOT_FOUND');
      }

      // 檢查權限
      if (record.userId !== req.user!.lineUserId) {
        throw new AppError('您沒有權限查看此重試記錄', 403, 'FORBIDDEN');
      }

      res.status(200).json(formatSuccessResponse(
        {
          retryId: record.id,
          status: record.status,
          eventSlug: record.registrationData.eventSlug,
          identity: record.registrationData.identity,
          attempts: record.attempts,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          finalOrderId: record.finalOrderId
        },
        '重試記錄查詢成功',
        req.requestId
      ));
    } else {
      // 獲取使用者的所有重試記錄
      const records = await retryService.getUserRetryRecords(req.user!.lineUserId);
      
      const responseData = records.map(record => ({
        retryId: record.id,
        status: record.status,
        eventSlug: record.registrationData.eventSlug,
        identity: record.registrationData.identity,
        attemptCount: record.attempts.length,
        lastAttempt: record.attempts.length > 0 ? record.attempts[record.attempts.length - 1] : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        finalOrderId: record.finalOrderId
      }));

      res.status(200).json(formatSuccessResponse(
        {
          retryRecords: responseData,
          total: responseData.length
        },
        `查詢到 ${responseData.length} 筆重試記錄`,
        req.requestId
      ));
    }

  } catch (error) {
    logger.error('查詢重試記錄失敗', error as Error, {
      query: req.query,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('查詢重試記錄失敗', 500, 'QUERY_RETRY_ERROR'),
        req.requestId
      ));
    }
  }
}

// 個人資料驗證函數（重用）
function validatePersonalInfo(personalInfo: any, identity: 'monk' | 'volunteer'): void {
  if (!personalInfo || typeof personalInfo !== 'object') {
    throw new ValidationError('個人資料格式錯誤');
  }

  if (!personalInfo.name || typeof personalInfo.name !== 'string' || personalInfo.name.trim().length === 0) {
    throw new ValidationError('姓名為必填項目');
  }

  if (!personalInfo.phone || typeof personalInfo.phone !== 'string') {
    throw new ValidationError('聯絡電話為必填項目');
  }

  const phonePattern = /^09\d{8}$|^\d{2,3}-\d{6,8}$/;
  if (!phonePattern.test(personalInfo.phone.replace(/\s/g, ''))) {
    throw new ValidationError('聯絡電話格式不正確');
  }

  if (identity === 'monk') {
    if (!personalInfo.templeName || typeof personalInfo.templeName !== 'string' || personalInfo.templeName.trim().length === 0) {
      throw new ValidationError('法師必須填寫寺院名稱');
    }
  } else if (identity === 'volunteer') {
    if (!personalInfo.emergencyContact || typeof personalInfo.emergencyContact !== 'string' || personalInfo.emergencyContact.trim().length === 0) {
      throw new ValidationError('志工必須填寫緊急聯絡人');
    }
  }

  if (personalInfo.email && typeof personalInfo.email === 'string') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(personalInfo.email)) {
      throw new ValidationError('Email 格式不正確');
    }
  }
}

// 交通車資料驗證函數（重用）
function validateTransport(transport: any): void {
  if (!transport || typeof transport !== 'object') {
    return;
  }

  if (typeof transport.required !== 'boolean') {
    throw new ValidationError('交通車需求必須為布林值');
  }

  if (transport.required) {
    if (!transport.locationId || typeof transport.locationId !== 'string') {
      throw new ValidationError('需要交通車時必須選擇上車地點');
    }
  }
}

export default withAuthMiddleware(handler);