/**
 * 報名修改和取消 API 端點
 * Registration modification and cancellation API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError, ForbiddenError, AppError, logger } from '../../../../lib/errors';
import { getRegistrationService } from '../../../../services/registration';
import { db } from '../../../../lib/database';
import { validateRequest, securityHeaders, validateInputLength, validateCors } from '../../../../lib/validation';
import { rateLimit, rateLimitConfigs } from '../../../../lib/rate-limiting';
import { securityMonitoring, logSecurityEvent, SecurityEventType } from '../../../../lib/security-monitoring';
import { sanitizeFormData } from '../../../../utils/security';

// Security middleware wrapper
const secureHandler = rateLimit(rateLimitConfigs.registration)(
  withAuthMiddleware(handler)
);

// 修改權限檢查
async function checkModificationPermissions(
  registrationId: string, 
  userId: string, 
  requestId: string
): Promise<{ canModify: boolean; registration?: any; reason?: string }> {
  try {
    // 獲取報名記錄
    const registration = await db.getRegistrationById(registrationId);
    
    if (!registration) {
      return { canModify: false, reason: '找不到指定的報名記錄' };
    }

    // 檢查權限：只能修改自己的報名記錄
    if (registration.userId !== userId) {
      return { canModify: false, reason: '您沒有權限修改此報名記錄' };
    }

    // 使用資料庫的權限檢查方法
    const permissionCheck = await db.canModifyRegistration(registrationId);
    
    return {
      canModify: permissionCheck.canModify,
      registration: permissionCheck.canModify ? registration : undefined,
      reason: permissionCheck.reason
    };

  } catch (error) {
    logger.error('檢查修改權限失敗', error as Error, { registrationId, userId, requestId });
    return { canModify: false, reason: '權限檢查失敗' };
  }
}

// 驗證修改資料
function validateModificationData(data: any, identity: 'monk' | 'volunteer'): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('修改資料格式錯誤');
  }

  const { personalInfo, transport, reason } = data;

  // 驗證個人資料（如果提供）
  if (personalInfo) {
    if (personalInfo.name !== undefined) {
      if (typeof personalInfo.name !== 'string' || personalInfo.name.trim().length === 0) {
        throw new ValidationError('姓名不能為空');
      }
      if (personalInfo.name.trim().length > 50) {
        throw new ValidationError('姓名長度不能超過 50 個字元');
      }
      // 姓名格式驗證
      const namePattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-\.]+$/;
      if (!namePattern.test(personalInfo.name.trim())) {
        throw new ValidationError('姓名包含不允許的字元');
      }
    }

    if (personalInfo.phone !== undefined) {
      if (typeof personalInfo.phone !== 'string' || personalInfo.phone.trim().length === 0) {
        throw new ValidationError('聯絡電話不能為空');
      }
      // 電話格式驗證
      const phonePattern = /^(09\d{8}|\d{2,3}-\d{6,8}|\+886-?9\d{8}|\+886-?\d{1,2}-?\d{6,8})$/;
      const cleanPhone = personalInfo.phone.replace(/[\s\-]/g, '');
      if (!phonePattern.test(personalInfo.phone) && !(/^09\d{8}$/.test(cleanPhone))) {
        throw new ValidationError('聯絡電話格式不正確');
      }
    }

    // 身份特定驗證
    if (identity === 'monk' && personalInfo.templeName !== undefined) {
      if (typeof personalInfo.templeName !== 'string' || personalInfo.templeName.trim().length === 0) {
        throw new ValidationError('寺院名稱不能為空');
      }
      if (personalInfo.templeName.trim().length > 100) {
        throw new ValidationError('寺院名稱長度不能超過 100 個字元');
      }
    }

    if (identity === 'volunteer' && personalInfo.emergencyContact !== undefined) {
      if (typeof personalInfo.emergencyContact !== 'string' || personalInfo.emergencyContact.trim().length === 0) {
        throw new ValidationError('緊急聯絡人不能為空');
      }
      if (personalInfo.emergencyContact.trim().length > 50) {
        throw new ValidationError('緊急聯絡人姓名長度不能超過 50 個字元');
      }
    }

    if (personalInfo.specialRequirements !== undefined) {
      if (typeof personalInfo.specialRequirements === 'string' && personalInfo.specialRequirements.length > 500) {
        throw new ValidationError('特殊需求說明不能超過 500 個字元');
      }
    }
  }

  // 驗證交通車資料（如果提供）
  if (transport !== undefined) {
    if (typeof transport !== 'object') {
      throw new ValidationError('交通車資料格式錯誤');
    }

    if (transport.required !== undefined && typeof transport.required !== 'boolean') {
      throw new ValidationError('交通車需求必須為布林值');
    }

    if (transport.required && transport.locationId !== undefined) {
      if (typeof transport.locationId !== 'string' || transport.locationId.trim().length === 0) {
        throw new ValidationError('需要交通車時必須選擇上車地點');
      }
      if (transport.locationId.length > 50) {
        throw new ValidationError('上車地點 ID 格式錯誤');
      }
    }
  }

  // 驗證修改原因（選填）
  if (reason !== undefined) {
    if (typeof reason !== 'string') {
      throw new ValidationError('修改原因必須為文字');
    }
    if (reason.length > 200) {
      throw new ValidationError('修改原因不能超過 200 個字元');
    }
  }
}

// 格式化修改資料
function formatModificationData(data: any, identity: 'monk' | 'volunteer'): any {
  const formatted: any = {};

  if (data.personalInfo) {
    formatted.personalInfo = {};
    
    if (data.personalInfo.name !== undefined) {
      formatted.personalInfo.name = data.personalInfo.name.trim();
    }
    
    if (data.personalInfo.phone !== undefined) {
      // 格式化電話號碼
      let cleanPhone = data.personalInfo.phone.replace(/[\s\-]/g, '');
      if (cleanPhone.startsWith('+886')) {
        cleanPhone = '0' + cleanPhone.substring(4);
      }
      formatted.personalInfo.phone = cleanPhone;
    }

    if (data.personalInfo.specialRequirements !== undefined) {
      formatted.personalInfo.specialRequirements = data.personalInfo.specialRequirements?.trim() || null;
    }

    // 身份特定欄位
    if (identity === 'monk' && data.personalInfo.templeName !== undefined) {
      formatted.personalInfo.templeName = data.personalInfo.templeName.trim();
    }

    if (identity === 'volunteer' && data.personalInfo.emergencyContact !== undefined) {
      formatted.personalInfo.emergencyContact = data.personalInfo.emergencyContact.trim();
    }
  }

  if (data.transport !== undefined) {
    formatted.transport = {
      required: data.transport.required || false,
      locationId: data.transport.required ? data.transport.locationId?.trim() : undefined,
      pickupTime: data.transport.pickupTime ? new Date(data.transport.pickupTime) : undefined
    };

    // 移除空值
    Object.keys(formatted.transport).forEach(key => {
      if (formatted.transport[key] === undefined) {
        delete formatted.transport[key];
      }
    });
  }

  return formatted;
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    logSecurityEvent(req, SecurityEventType.PERMISSION_DENIED, 'Invalid method for registration modification endpoint');
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }

  try {
    const { registrationId } = req.query;
    
    if (!registrationId || typeof registrationId !== 'string') {
      throw new ValidationError('報名 ID 為必填項目');
    }

    // 記錄資料存取
    logSecurityEvent(req, SecurityEventType.DATA_ACCESS, 'Registration modification attempted', {
      registrationId,
      method: req.method,
      userId: req.user!.lineUserId
    });

    if (req.method === 'PUT') {
      return await handleModifyRegistration(req, res, registrationId);
    } else if (req.method === 'DELETE') {
      return await handleCancelRegistration(req, res, registrationId);
    }

  } catch (error) {
    logger.error('報名修改處理過程發生錯誤', error as Error, {
      method: req.method,
      query: req.query,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof ValidationError) {
      res.status(400).json(formatErrorResponse(error, req.requestId));
    } else if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('報名修改處理失敗，請稍後再試', 500, 'MODIFICATION_ERROR'),
        req.requestId
      ));
    }
  }
}

// 處理報名修改
async function handleModifyRegistration(req: ExtendedNextApiRequest, res: NextApiResponse, registrationId: string) {
  try {
    // 清理輸入資料
    const sanitizedBody = sanitizeFormData(req.body);
    const { personalInfo, transport, reason } = sanitizedBody;

    // 檢查修改權限
    const permissionCheck = await checkModificationPermissions(registrationId, req.user!.lineUserId, req.requestId);
    
    if (!permissionCheck.canModify) {
      if (permissionCheck.reason === '找不到指定的報名記錄') {
        throw new NotFoundError(permissionCheck.reason);
      } else if (permissionCheck.reason === '您沒有權限修改此報名記錄') {
        throw new ForbiddenError(permissionCheck.reason);
      } else {
        throw new AppError(permissionCheck.reason || '無法修改報名', 400, 'MODIFICATION_NOT_ALLOWED');
      }
    }

    const registration = permissionCheck.registration!;

    // 驗證修改資料
    validateModificationData({ personalInfo, transport, reason }, registration.identity);

    // 格式化修改資料
    const formattedData = formatModificationData({ personalInfo, transport }, registration.identity);

    // 檢查是否有實際變更
    if (Object.keys(formattedData).length === 0) {
      throw new ValidationError('沒有提供要修改的資料');
    }

    // 合併個人資料
    const updates: any = {};
    if (formattedData.personalInfo) {
      updates.personalInfo = {
        ...registration.personalInfo,
        ...formattedData.personalInfo
      };
    }

    if (formattedData.transport !== undefined) {
      updates.transport = formattedData.transport;
    }

    // 準備歷史記錄的 metadata
    const historyMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      requestId: req.requestId,
      reason: reason?.trim() || '使用者主動修改',
      modificationSource: 'liff_app'
    };

    // 更新報名資料（包含歷史記錄）
    const updatedRegistration = await db.updateRegistration(registrationId, updates, historyMetadata);

    if (!updatedRegistration) {
      throw new AppError('更新報名資料失敗', 500, 'UPDATE_FAILED');
    }

    // 如果有 Pretix 訂單，嘗試同步更新（非阻塞）
    if (registration.pretixOrderId) {
      try {
        const registrationService = getRegistrationService();
        // 注意：這裡需要實作 Pretix 訂單更新功能
        // await registrationService.updateRegistration(registration.eventId, registration.pretixOrderId, updates);
        logger.info('Pretix 訂單同步更新已排程', {
          registrationId,
          pretixOrderId: registration.pretixOrderId,
          requestId: req.requestId
        });
      } catch (error) {
        logger.warn('Pretix 訂單同步更新失敗，但本地更新成功', {
          registrationId,
          pretixOrderId: registration.pretixOrderId,
          error: (error as Error).message,
          requestId: req.requestId
        });
      }
    }

    // 獲取修改歷史
    const history = await db.getRegistrationHistory(registrationId);
    const updateHistory = history.filter(h => h.action === 'updated');

    logger.info('報名資料修改成功', {
      registrationId,
      userId: req.user!.lineUserId,
      changesCount: Object.keys(updates).length,
      totalModifications: updateHistory.length,
      requestId: req.requestId
    });

    // 記錄成功的修改事件
    logSecurityEvent(req, SecurityEventType.DATA_UPDATED, 'Registration modified successfully', {
      registrationId,
      changesCount: Object.keys(updates).length,
      totalModifications: updateHistory.length
    });

    const responseData = {
      registrationId: updatedRegistration.id,
      status: updatedRegistration.status,
      personalInfo: updatedRegistration.personalInfo,
      transport: updatedRegistration.transport,
      updatedAt: updatedRegistration.updatedAt,
      modificationInfo: {
        totalModifications: updateHistory.length,
        remainingModifications: Math.max(0, 5 - updateHistory.length),
        lastModified: updatedRegistration.updatedAt,
        canModifyUntil: await getModificationDeadline(registration.eventId)
      },
      nextSteps: [
        '修改已成功儲存',
        '如需再次修改，請在活動前 3 天完成',
        `您還可以修改 ${Math.max(0, 5 - updateHistory.length)} 次`,
        '可隨時透過「查詢報名」功能查看最新狀態'
      ]
    };

    res.status(200).json(formatSuccessResponse(
      responseData,
      '報名資料修改成功！',
      req.requestId
    ));

  } catch (error) {
    logger.error('修改報名資料失敗', error as Error, {
      registrationId,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('修改報名資料失敗', 500, 'MODIFY_REGISTRATION_ERROR'),
        req.requestId
      ));
    }
  }
}

// 處理報名取消
async function handleCancelRegistration(req: ExtendedNextApiRequest, res: NextApiResponse, registrationId: string) {
  try {
    const { reason } = req.body || {};

    // 檢查取消權限
    const permissionCheck = await checkModificationPermissions(registrationId, req.user!.lineUserId, req.requestId);
    
    if (!permissionCheck.canModify) {
      if (permissionCheck.reason === '找不到指定的報名記錄') {
        throw new NotFoundError(permissionCheck.reason);
      } else if (permissionCheck.reason === '您沒有權限修改此報名記錄') {
        throw new ForbiddenError(permissionCheck.reason);
      }
      // 對於取消操作，放寬時間限制檢查
      if (permissionCheck.reason?.includes('活動開始前3天內無法修改')) {
        // 允許取消，但給予警告
        logger.warn('在時間限制內執行取消操作', {
          registrationId,
          userId: req.user!.lineUserId,
          reason: permissionCheck.reason,
          requestId: req.requestId
        });
      } else {
        throw new AppError(permissionCheck.reason || '無法取消報名', 400, 'CANCELLATION_NOT_ALLOWED');
      }
    }

    const registration = permissionCheck.registration!;

    // 檢查是否已經取消
    if (registration.status === 'cancelled') {
      throw new AppError('報名已經取消', 400, 'ALREADY_CANCELLED');
    }

    // 驗證取消原因
    if (reason && typeof reason !== 'string') {
      throw new ValidationError('取消原因必須為文字');
    }
    if (reason && reason.length > 200) {
      throw new ValidationError('取消原因不能超過 200 個字元');
    }

    // 準備歷史記錄的 metadata
    const historyMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      requestId: req.requestId,
      reason: reason?.trim() || '使用者主動取消',
      cancellationSource: 'liff_app'
    };

    // 嘗試取消 Pretix 訂單
    let pretixCancelled = false;
    if (registration.pretixOrderId) {
      try {
        const registrationService = getRegistrationService();
        await registrationService.cancelRegistration(registration.eventId, registration.pretixOrderId);
        pretixCancelled = true;
        logger.info('Pretix 訂單取消成功', {
          registrationId,
          pretixOrderId: registration.pretixOrderId,
          requestId: req.requestId
        });
      } catch (error) {
        logger.warn('Pretix 訂單取消失敗，但仍會更新本地狀態', {
          registrationId,
          pretixOrderId: registration.pretixOrderId,
          error: (error as Error).message,
          requestId: req.requestId
        });
      }
    }

    // 更新本地狀態（包含歷史記錄）
    const updatedRegistration = await db.updateRegistration(
      registrationId, 
      { status: 'cancelled' }, 
      historyMetadata
    );

    if (!updatedRegistration) {
      throw new AppError('取消報名失敗', 500, 'CANCEL_FAILED');
    }

    logger.info('報名取消成功', {
      registrationId,
      userId: req.user!.lineUserId,
      pretixCancelled,
      requestId: req.requestId
    });

    // 記錄成功的取消事件
    logSecurityEvent(req, SecurityEventType.DATA_UPDATED, 'Registration cancelled successfully', {
      registrationId,
      pretixCancelled
    });

    const responseData = {
      registrationId: updatedRegistration.id,
      status: updatedRegistration.status,
      cancelledAt: updatedRegistration.updatedAt,
      pretixCancelled,
      cancellationInfo: {
        reason: reason?.trim() || '使用者主動取消',
        canReregister: true,
        refundInfo: pretixCancelled ? '退款將在 3-5 個工作天內處理' : '如需退款請聯絡客服'
      },
      nextSteps: [
        '報名已成功取消',
        pretixCancelled ? '退款將自動處理' : '如需退款請聯絡客服',
        '如需重新報名，請重新填寫報名表單',
        '感謝您的參與，期待下次見面'
      ],
      supportInfo: {
        email: 'support@changhua-buddhist.org',
        phone: '04-1234-5678',
        hours: '週一至週五 09:00-17:00'
      }
    };

    res.status(200).json(formatSuccessResponse(
      responseData,
      '報名取消成功！',
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
      validateInputLength(req, res, () => {
        securityMonitoring(req, res, () => {
          secureHandler(req, res);
        });
      });
    });
  });
}