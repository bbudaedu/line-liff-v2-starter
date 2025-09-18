/**
 * 報名處理 API 端點
 * Registration processing API endpoint
 */

import { NextApiResponse } from 'next';
import { ExtendedNextApiRequest, withAuthMiddleware } from '../../../../lib/middleware';
import { formatSuccessResponse, formatErrorResponse, ValidationError, AppError, logger } from '../../../../lib/errors';
import { getRegistrationService } from '../../../../services/registration';
import { db } from '../../../../lib/database';
import { RegistrationData, OrderCreationResult } from '../../../../types/pretix';
import { validateRequest, registrationSchema, securityHeaders, validateInputLength, validateCors } from '../../../../lib/validation';
import { rateLimit, rateLimitConfigs } from '../../../../lib/rate-limiting';
import { securityMonitoring, logSecurityEvent, SecurityEventType } from '../../../../lib/security-monitoring';
import { sanitizeFormData } from '../../../../utils/security';

// Security middleware wrapper
const secureHandler = rateLimit(rateLimitConfigs.registration)(
  withAuthMiddleware(handler)
);

// Registration ID generation utility with enhanced uniqueness
function generateRegistrationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const checksum = (timestamp + random).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
  return `REG_${timestamp}_${random}_${checksum.toString().padStart(3, '0')}`.toUpperCase();
}

// 個人資料驗證規則
function validatePersonalInfo(personalInfo: any, identity: 'monk' | 'volunteer'): void {
  if (!personalInfo || typeof personalInfo !== 'object') {
    throw new ValidationError('個人資料格式錯誤');
  }

  // 共同必填欄位
  if (!personalInfo.name || typeof personalInfo.name !== 'string' || personalInfo.name.trim().length === 0) {
    throw new ValidationError('姓名為必填項目');
  }

  // 姓名長度限制
  if (personalInfo.name.trim().length > 50) {
    throw new ValidationError('姓名長度不能超過 50 個字元');
  }

  // 姓名格式驗證（只允許中文、英文、數字和常見符號）
  const namePattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-\.]+$/;
  if (!namePattern.test(personalInfo.name.trim())) {
    throw new ValidationError('姓名包含不允許的字元');
  }

  if (!personalInfo.phone || typeof personalInfo.phone !== 'string') {
    throw new ValidationError('聯絡電話為必填項目');
  }

  // 電話格式驗證（支援多種台灣電話格式）
  const phonePattern = /^(09\d{8}|\d{2,3}-\d{6,8}|\+886-?9\d{8}|\+886-?\d{1,2}-?\d{6,8})$/;
  const cleanPhone = personalInfo.phone.replace(/[\s\-]/g, '');
  if (!phonePattern.test(personalInfo.phone) && !(/^09\d{8}$/.test(cleanPhone))) {
    throw new ValidationError('聯絡電話格式不正確（請使用台灣手機或市話格式）');
  }

  // 身份特定驗證
  if (identity === 'monk') {
    if (!personalInfo.templeName || typeof personalInfo.templeName !== 'string' || personalInfo.templeName.trim().length === 0) {
      throw new ValidationError('法師必須填寫寺院名稱');
    }
    
    if (personalInfo.templeName.trim().length > 100) {
      throw new ValidationError('寺院名稱長度不能超過 100 個字元');
    }
  } else if (identity === 'volunteer') {
    if (!personalInfo.emergencyContact || typeof personalInfo.emergencyContact !== 'string' || personalInfo.emergencyContact.trim().length === 0) {
      throw new ValidationError('志工必須填寫緊急聯絡人');
    }
    
    if (personalInfo.emergencyContact.trim().length > 50) {
      throw new ValidationError('緊急聯絡人姓名長度不能超過 50 個字元');
    }
  }

  // Email 格式驗證（如果提供）
  if (personalInfo.email && typeof personalInfo.email === 'string') {
    if (personalInfo.email.length > 254) {
      throw new ValidationError('Email 長度不能超過 254 個字元');
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(personalInfo.email)) {
      throw new ValidationError('Email 格式不正確');
    }
  }

  // 特殊需求長度限制
  if (personalInfo.specialRequirements && typeof personalInfo.specialRequirements === 'string') {
    if (personalInfo.specialRequirements.length > 500) {
      throw new ValidationError('特殊需求說明不能超過 500 個字元');
    }
  }
}

// 交通車資料驗證
function validateTransport(transport: any): void {
  if (!transport || typeof transport !== 'object') {
    return; // 交通車是選填的
  }

  if (typeof transport.required !== 'boolean') {
    throw new ValidationError('交通車需求必須為布林值');
  }

  if (transport.required) {
    if (!transport.locationId || typeof transport.locationId !== 'string') {
      throw new ValidationError('需要交通車時必須選擇上車地點');
    }

    // 驗證地點 ID 格式
    if (transport.locationId.length > 50) {
      throw new ValidationError('上車地點 ID 格式錯誤');
    }

    // 驗證上車時間格式（如果提供）
    if (transport.pickupTime) {
      const pickupTime = new Date(transport.pickupTime);
      if (isNaN(pickupTime.getTime())) {
        throw new ValidationError('上車時間格式錯誤');
      }

      // 檢查時間是否在合理範圍內（不能是過去時間）
      const now = new Date();
      if (pickupTime < now) {
        throw new ValidationError('上車時間不能是過去時間');
      }

      // 檢查時間是否在未來一年內
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (pickupTime > oneYearLater) {
        throw new ValidationError('上車時間不能超過一年後');
      }
    }
  }
}

// 個人資料格式化函數
function formatPersonalInfo(personalInfo: any, identity: 'monk' | 'volunteer'): any {
  const formatted = {
    name: personalInfo.name.trim(),
    phone: formatPhoneNumber(personalInfo.phone),
    email: personalInfo.email?.trim() || undefined,
    specialRequirements: personalInfo.specialRequirements?.trim() || undefined
  };

  if (identity === 'monk') {
    formatted.templeName = personalInfo.templeName?.trim();
  } else if (identity === 'volunteer') {
    formatted.emergencyContact = personalInfo.emergencyContact?.trim();
  }

  // 移除空值
  Object.keys(formatted).forEach(key => {
    if (formatted[key] === undefined || formatted[key] === '') {
      delete formatted[key];
    }
  });

  return formatted;
}

// 電話號碼格式化函數
function formatPhoneNumber(phone: string): string {
  // 移除所有空格和連字號
  let cleaned = phone.replace(/[\s\-]/g, '');
  
  // 處理國際格式
  if (cleaned.startsWith('+886')) {
    cleaned = '0' + cleaned.substring(4);
  }
  
  return cleaned;
}

// 交通車資料格式化函數
function formatTransportData(transport: any): any {
  if (!transport || !transport.required) {
    return {
      required: false
    };
  }

  const formatted = {
    required: true,
    locationId: transport.locationId?.trim(),
    pickupTime: transport.pickupTime ? new Date(transport.pickupTime) : undefined
  };

  // 移除空值
  Object.keys(formatted).forEach(key => {
    if (formatted[key] === undefined) {
      delete formatted[key];
    }
  });

  return formatted;
}

// 事件資料驗證
function validateEventData(eventSlug: string, identity: string): void {
  if (!eventSlug || typeof eventSlug !== 'string' || eventSlug.trim().length === 0) {
    throw new ValidationError('活動代碼為必填項目');
  }

  if (eventSlug.length > 100) {
    throw new ValidationError('活動代碼格式錯誤');
  }

  // 驗證活動代碼格式（只允許字母、數字、連字號和底線）
  const eventSlugPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!eventSlugPattern.test(eventSlug)) {
    throw new ValidationError('活動代碼格式不正確');
  }

  if (!identity || typeof identity !== 'string') {
    throw new ValidationError('身份類型為必填項目');
  }

  if (!['monk', 'volunteer'].includes(identity)) {
    throw new ValidationError('身份類型必須是 monk 或 volunteer');
  }
}

// 錯誤資訊獲取函數
function getErrorInfo(errorCode?: string): {
  statusCode: number;
  retryable: boolean;
  retryAfter?: number;
  suggestions: string[];
  troubleshooting: string[];
} {
  switch (errorCode) {
    case 'EVENT_NOT_AVAILABLE':
      return {
        statusCode: 409,
        retryable: false,
        suggestions: ['請選擇其他活動', '或等待新活動開放報名'],
        troubleshooting: ['檢查活動是否已開始報名', '確認活動報名截止時間']
      };
    
    case 'ITEM_NOT_AVAILABLE':
      return {
        statusCode: 409,
        retryable: true,
        retryAfter: 60,
        suggestions: ['請稍後再試', '可能有其他人取消報名釋出名額'],
        troubleshooting: ['檢查是否選擇正確的身份類型', '確認活動是否還有名額']
      };
    
    case 'ITEM_NOT_FOUND':
      return {
        statusCode: 400,
        retryable: false,
        suggestions: ['請檢查身份類型選擇', '或聯絡客服確認活動設定'],
        troubleshooting: ['確認選擇的身份類型（法師/志工）', '檢查活動是否支援該身份類型']
      };
    
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      return {
        statusCode: 503,
        retryable: true,
        retryAfter: 30,
        suggestions: ['請檢查網路連線', '稍後再試或使用自動重試功能'],
        troubleshooting: ['確認網路連線穩定', '嘗試重新整理頁面', '切換網路環境']
      };
    
    case 'SERVER_ERROR':
      return {
        statusCode: 502,
        retryable: true,
        retryAfter: 60,
        suggestions: ['系統暫時繁忙，請稍後再試', '或使用自動重試功能'],
        troubleshooting: ['等待系統恢復正常', '避免在尖峰時間報名']
      };
    
    case 'VALIDATION_ERROR':
      return {
        statusCode: 400,
        retryable: false,
        suggestions: ['請檢查填寫的資料', '確認所有必填欄位都已填寫'],
        troubleshooting: ['檢查姓名、電話格式', '確認身份相關資料完整', '檢查交通車選項']
      };
    
    default:
      return {
        statusCode: 500,
        retryable: true,
        retryAfter: 120,
        suggestions: ['請稍後再試', '或聯絡客服協助'],
        troubleshooting: ['重新整理頁面', '清除瀏覽器快取', '嘗試使用其他瀏覽器']
      };
  }
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    logSecurityEvent(req, SecurityEventType.PERMISSION_DENIED, 'Invalid method for registration endpoint');
    return res.status(405).json(formatErrorResponse(
      new AppError('方法不被允許', 405, 'METHOD_NOT_ALLOWED'),
      req.requestId
    ));
  }

  try {
    // Sanitize input data
    const sanitizedBody = sanitizeFormData(req.body);
    const { eventSlug, identity, personalInfo, transport, metadata } = sanitizedBody;

    // Log data access
    logSecurityEvent(req, SecurityEventType.DATA_ACCESS, 'Registration data accessed', {
      eventSlug,
      identity,
      userId: req.user!.lineUserId
    });

    // 驗證事件資料
    validateEventData(eventSlug, identity);

    // 驗證個人資料
    validatePersonalInfo(personalInfo, identity);

    // 驗證交通車資料
    validateTransport(transport);

    // 格式化和清理資料
    const formattedPersonalInfo = formatPersonalInfo(personalInfo, identity);
    const formattedTransport = formatTransportData(transport);
    
    // 建立報名資料物件
    const registrationData: RegistrationData = {
      eventSlug: eventSlug.trim(),
      identity,
      personalInfo: formattedPersonalInfo,
      transport: formattedTransport,
      lineUserId: req.user!.lineUserId,
      metadata: {
        ...metadata,
        userDisplayName: req.user!.displayName,
        userPictureUrl: req.user!.pictureUrl,
        registrationSource: 'liff_app',
        userAgent: req.headers['user-agent'],
        clientIp: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        timestamp: new Date().toISOString(),
        registrationId: generateRegistrationId()
      }
    };

    logger.info('開始處理報名請求', {
      eventSlug,
      identity,
      userId: req.user!.lineUserId,
      requestId: req.requestId
    });

    // 檢查是否已經報名過此活動
    const existingRegistrations = await db.getRegistrationsByUserId(req.user!.lineUserId);
    const existingRegistration = existingRegistrations.find(reg => 
      reg.eventId === eventSlug && reg.status !== 'cancelled'
    );

    if (existingRegistration) {
      logger.warn('使用者嘗試重複報名', {
        eventSlug,
        userId: req.user!.lineUserId,
        existingRegistrationId: existingRegistration.id,
        requestId: req.requestId
      });

      return res.status(409).json(formatErrorResponse(
        new AppError('您已經報名過此活動', 409, 'ALREADY_REGISTERED'),
        req.requestId
      ));
    }

    // 使用註冊服務建立 Pretix 訂單
    const registrationService = getRegistrationService();
    const orderResult: OrderCreationResult = await registrationService.createRegistration(registrationData);

    if (!orderResult.success) {
      logger.error('Pretix 訂單建立失敗', new Error(orderResult.error), {
        eventSlug,
        userId: req.user!.lineUserId,
        errorCode: orderResult.errorCode,
        requestId: req.requestId
      });

      // 根據錯誤類型返回適當的狀態碼和重試建議
      const errorInfo = getErrorInfo(orderResult.errorCode);
      
      const errorResponse = formatErrorResponse(
        new AppError(orderResult.error || '報名處理失敗', errorInfo.statusCode, orderResult.errorCode || 'REGISTRATION_FAILED'),
        req.requestId
      );

      // 添加增強的錯誤資訊
      const enhancedResponse = {
        ...errorResponse,
        retryable: errorInfo.retryable,
        retryAfter: errorInfo.retryAfter,
        suggestions: errorInfo.suggestions,
        troubleshooting: errorInfo.troubleshooting,
        retryEndpoint: errorInfo.retryable ? '/api/v1/registration/retry' : undefined,
        supportContact: {
          email: 'support@changhua-buddhist.org',
          phone: '04-1234-5678',
          hours: '週一至週五 09:00-17:00'
        }
      };

      if (errorInfo.retryAfter) {
        res.setHeader('Retry-After', errorInfo.retryAfter.toString());
      }

      return res.status(errorInfo.statusCode).json(enhancedResponse);
    }

    // 將報名資料儲存到資料庫，包含完整的狀態管理
    const transportData = registrationData.transport ? {
      ...registrationData.transport,
      pickupTime: registrationData.transport.pickupTime ? 
        new Date(registrationData.transport.pickupTime) : undefined
    } : undefined;

    let registration;
    try {
      // 建立完整的報名記錄，包含所有必要的狀態資訊
      registration = await db.createRegistration({
        userId: req.user!.lineUserId,
        eventId: eventSlug,
        identity,
        personalInfo: {
          ...registrationData.personalInfo,
          // 確保 email 有預設值
          email: registrationData.personalInfo.email || `${req.user!.lineUserId}@line.local`
        },
        transport: transportData,
        pretixOrderId: orderResult.order!.code,
        status: 'confirmed',
        // 添加額外的狀態管理欄位
        metadata: {
          ...registrationData.metadata,
          pretixOrderStatus: orderResult.order!.status,
          pretixOrderTotal: orderResult.order!.total,
          pretixOrderEmail: orderResult.order!.email,
          pretixOrderDatetime: orderResult.order!.datetime,
          processingTime: Date.now() - req.startTime,
          apiVersion: 'v1',
          clientInfo: {
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language'],
            referer: req.headers['referer']
          }
        }
      });

      logger.info('報名資料已儲存到資料庫', {
        registrationId: registration.id,
        userId: req.user!.lineUserId,
        eventSlug,
        pretixOrderId: orderResult.order!.code,
        processingTime: Date.now() - req.startTime,
        requestId: req.requestId
      });

      // 記錄成功的報名統計
      logSecurityEvent(req, SecurityEventType.DATA_CREATED, 'Registration created successfully', {
        registrationId: registration.id,
        eventSlug,
        identity,
        hasTransport: !!transportData?.required
      });

    } catch (dbError) {
      logger.error('資料庫儲存失敗', dbError as Error, {
        userId: req.user!.lineUserId,
        eventSlug,
        pretixOrderId: orderResult.order!.code,
        requestId: req.requestId
      });

      // 記錄資料庫錯誤事件
      logSecurityEvent(req, SecurityEventType.SYSTEM_ERROR, 'Database storage failed after Pretix order creation', {
        pretixOrderId: orderResult.order!.code,
        error: (dbError as Error).message
      });

      // 如果資料庫儲存失敗，但 Pretix 訂單已建立，記錄此狀況
      // 在生產環境中，這裡應該有補償機制或手動處理流程
      throw new AppError(
        '報名資料處理完成，但系統記錄儲存失敗。請聯絡客服確認報名狀態。訂單編號：' + orderResult.order!.code,
        500,
        'DATABASE_STORAGE_ERROR'
      );
    }

    logger.info('報名成功完成', {
      eventSlug,
      userId: req.user!.lineUserId,
      registrationId: registration.id,
      pretixOrderId: orderResult.order!.code,
      requestId: req.requestId
    });

    // 準備完整的回應資料
    const responseData = {
      registrationId: registration.id,
      orderCode: orderResult.order!.code,
      status: registration.status,
      eventSlug,
      identity,
      personalInfo: registration.personalInfo,
      transport: registration.transport,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
      confirmationMessage: `您的報名已成功提交！訂單編號：${orderResult.order!.code}`,
      nextSteps: [
        '請保留此訂單編號以供查詢',
        '活動前會透過 LINE 發送提醒訊息',
        '如需修改資料，請在活動前 3 天完成',
        '可隨時透過「查詢報名」功能查看報名狀態'
      ],
      pretixOrder: {
        code: orderResult.order!.code,
        status: orderResult.order!.status,
        email: orderResult.order!.email,
        datetime: orderResult.order!.datetime,
        total: orderResult.order!.total
      },
      // 添加額外的有用資訊
      processingInfo: {
        processingTime: Date.now() - req.startTime,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1'
      },
      supportInfo: {
        queryUrl: `/api/v1/registration/${registration.id}`,
        myRegistrationsUrl: '/api/v1/registration/my',
        supportContact: {
          email: 'support@changhua-buddhist.org',
          phone: '04-1234-5678',
          hours: '週一至週五 09:00-17:00'
        }
      },
      // 根據身份類型提供特定建議
      identitySpecificInfo: identity === 'monk' ? {
        title: '法師報名完成',
        reminders: [
          '請攜帶身份證明文件',
          '如有特殊飲食需求，請提前告知',
          '建議提早 30 分鐘到達會場'
        ]
      } : {
        title: '志工報名完成',
        reminders: [
          '請攜帶身份證明文件',
          '志工服務時間為活動全程',
          '請穿著輕便服裝，方便活動'
        ]
      }
    };

    res.status(201).json(formatSuccessResponse(
      responseData,
      '報名成功！您的報名資料已送出，請保留訂單編號以供查詢。',
      req.requestId
    ));

  } catch (error) {
    logger.error('報名處理過程發生錯誤', error as Error, {
      body: req.body,
      userId: req.user?.lineUserId,
      requestId: req.requestId
    });

    if (error instanceof ValidationError) {
      res.status(400).json(formatErrorResponse(error, req.requestId));
    } else if (error instanceof AppError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.requestId));
    } else {
      res.status(500).json(formatErrorResponse(
        new AppError('報名處理失敗，請稍後再試', 500, 'REGISTRATION_ERROR'),
        req.requestId
      ));
    }
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