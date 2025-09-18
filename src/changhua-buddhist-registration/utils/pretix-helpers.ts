import {
  PretixEvent,
  PretixItem,
  PretixQuota,
  PretixOrder,
  LocalizedEvent,
  LocalizedItem,
  RegistrationData,
  PretixOrderRequest
} from '../types/pretix';
import { PRETIX_CONSTANTS } from '../config/pretix';

/**
 * 獲取本地化文字
 */
export function getLocalizedText(
  textObj: { [locale: string]: string } | string | null | undefined,
  locale: string = 'zh-tw'
): string {
  if (!textObj) return '';
  
  if (typeof textObj === 'string') return textObj;
  
  return textObj[locale] || 
         textObj['zh-tw'] || 
         textObj['en'] || 
         Object.values(textObj)[0] || 
         '';
}

/**
 * 格式化日期時間
 */
export function formatDateTime(dateString: string | null, locale: string = 'zh-TW'): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei'
  });
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string | null, locale: string = 'zh-TW'): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei'
  });
}

/**
 * 格式化時間
 */
export function formatTime(dateString: string | null, locale: string = 'zh-TW'): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei'
  });
}

/**
 * 檢查活動是否在報名期間內
 */
export function isEventRegistrationOpen(event: PretixEvent): {
  isOpen: boolean;
  reason?: string;
} {
  const now = new Date();
  
  if (event.presale_start) {
    const presaleStart = new Date(event.presale_start);
    if (now < presaleStart) {
      return {
        isOpen: false,
        reason: `報名將於 ${formatDateTime(event.presale_start)} 開始`
      };
    }
  }
  
  if (event.presale_end) {
    const presaleEnd = new Date(event.presale_end);
    if (now > presaleEnd) {
      return {
        isOpen: false,
        reason: `報名已於 ${formatDateTime(event.presale_end)} 截止`
      };
    }
  }
  
  return { isOpen: true };
}

/**
 * 根據身份類型找到對應的項目
 */
export function findItemByIdentity(
  items: PretixItem[],
  identity: 'monk' | 'volunteer'
): PretixItem | null {
  const keywords = PRETIX_CONSTANTS.ITEM_CATEGORIES[identity.toUpperCase() as keyof typeof PRETIX_CONSTANTS.ITEM_CATEGORIES];
  
  return items.find(item => {
    const itemName = getLocalizedText(item.name, 'zh-tw').toLowerCase();
    const internalName = (item.internal_name || '').toLowerCase();
    
    return keywords.some(keyword => 
      itemName.includes(keyword.toLowerCase()) || 
      internalName.includes(keyword.toLowerCase())
    );
  }) || null;
}

/**
 * 計算項目的可用數量
 */
export function calculateItemAvailability(
  item: PretixItem,
  quotas: PretixQuota[]
): {
  isAvailable: boolean;
  availableCount: number | null;
  totalCount: number | null;
} {
  const itemQuotas = quotas.filter(quota => quota.items.includes(item.id));
  
  if (itemQuotas.length === 0) {
    // 沒有配額限制，視為無限制
    return {
      isAvailable: true,
      availableCount: null,
      totalCount: null
    };
  }
  
  const isAvailable = itemQuotas.some(quota => quota.available);
  const availableCount = itemQuotas.length > 0 
    ? Math.min(...itemQuotas.map(quota => quota.available_number || 0))
    : null;
  const totalCount = itemQuotas.length > 0
    ? Math.min(...itemQuotas.map(quota => quota.total_size || 0))
    : null;
  
  return {
    isAvailable,
    availableCount: availableCount && availableCount > 0 ? availableCount : null,
    totalCount
  };
}

/**
 * 獲取訂單狀態的中文描述
 */
export function getOrderStatusText(status: string): string {
  switch (status) {
    case PRETIX_CONSTANTS.ORDER_STATUS.NEW:
      return '新建';
    case PRETIX_CONSTANTS.ORDER_STATUS.PENDING:
      return '待處理';
    case PRETIX_CONSTANTS.ORDER_STATUS.EXPIRED:
      return '已過期';
    case PRETIX_CONSTANTS.ORDER_STATUS.CANCELLED:
      return '已取消';
    case PRETIX_CONSTANTS.ORDER_STATUS.REFUNDED:
      return '已退款';
    default:
      return '未知狀態';
  }
}

/**
 * 檢查訂單是否可以取消
 */
export function canCancelOrder(order: PretixOrder): boolean {
  return order.status === PRETIX_CONSTANTS.ORDER_STATUS.NEW || 
         order.status === PRETIX_CONSTANTS.ORDER_STATUS.PENDING;
}

/**
 * 檢查訂單是否可以修改
 */
export function canModifyOrder(order: PretixOrder): boolean {
  return order.status === PRETIX_CONSTANTS.ORDER_STATUS.NEW || 
         order.status === PRETIX_CONSTANTS.ORDER_STATUS.PENDING;
}

/**
 * 建立訂單備註
 */
export function buildOrderComment(registrationData: RegistrationData): string {
  const { identity, personalInfo, transport } = registrationData;
  
  let comment = `身份：${identity === 'monk' ? '法師' : '志工'}\n`;
  comment += `姓名：${personalInfo.name}\n`;
  comment += `電話：${personalInfo.phone}\n`;
  
  if (personalInfo.email) {
    comment += `電子郵件：${personalInfo.email}\n`;
  }
  
  if (personalInfo.templeName) {
    comment += `寺院：${personalInfo.templeName}\n`;
  }
  
  if (personalInfo.emergencyContact) {
    comment += `緊急聯絡人：${personalInfo.emergencyContact}\n`;
  }
  
  if (transport?.required) {
    comment += `需要交通車：是\n`;
    if (transport.locationId) {
      comment += `上車地點：${transport.locationId}\n`;
    }
    if (transport.pickupTime) {
      comment += `上車時間：${transport.pickupTime}\n`;
    }
  } else {
    comment += `需要交通車：否\n`;
  }
  
  if (personalInfo.specialRequirements) {
    comment += `特殊需求：${personalInfo.specialRequirements}\n`;
  }
  
  return comment.trim();
}

/**
 * 建立 Pretix 訂單請求資料
 */
export function buildPretixOrderRequest(
  registrationData: RegistrationData,
  item: PretixItem
): PretixOrderRequest {
  const { personalInfo, transport, lineUserId, metadata } = registrationData;

  return {
    email: personalInfo.email,
    phone: personalInfo.phone,
    locale: PRETIX_CONSTANTS.LOCALES.TRADITIONAL_CHINESE,
    sales_channel: PRETIX_CONSTANTS.SALES_CHANNELS.LIFF,
    positions: [{
      item: item.id,
      attendee_name: personalInfo.name,
      attendee_email: personalInfo.email,
      answers: [], // 如果有問卷問題，在這裡填入答案
      meta_data: {
        line_user_id: lineUserId,
        identity: registrationData.identity,
        temple_name: personalInfo.templeName,
        emergency_contact: personalInfo.emergencyContact,
        special_requirements: personalInfo.specialRequirements,
        transport_required: transport?.required,
        transport_location_id: transport?.locationId,
        transport_pickup_time: transport?.pickupTime,
        ...metadata
      }
    }],
    meta_data: {
      line_user_id: lineUserId,
      registration_source: 'liff_app',
      created_at: new Date().toISOString()
    },
    comment: buildOrderComment(registrationData)
  };
}

/**
 * 驗證報名資料
 */
export function validateRegistrationData(data: RegistrationData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 檢查必填欄位
  if (!data.eventSlug) {
    errors.push('活動代碼不能為空');
  }
  
  if (!data.identity || !['monk', 'volunteer'].includes(data.identity)) {
    errors.push('身份類型無效');
  }
  
  if (!data.personalInfo.name) {
    errors.push('姓名不能為空');
  }
  
  if (!data.personalInfo.phone) {
    errors.push('電話號碼不能為空');
  }
  
  if (!data.lineUserId) {
    errors.push('LINE 使用者 ID 不能為空');
  }
  
  // 根據身份類型檢查特定欄位
  if (data.identity === 'monk' && !data.personalInfo.templeName) {
    errors.push('法師必須填寫寺院名稱');
  }
  
  if (data.identity === 'volunteer' && !data.personalInfo.emergencyContact) {
    errors.push('志工必須填寫緊急聯絡人');
  }
  
  // 驗證電話號碼格式
  if (data.personalInfo.phone && !isValidPhoneNumber(data.personalInfo.phone)) {
    errors.push('電話號碼格式不正確');
  }
  
  // 驗證電子郵件格式
  if (data.personalInfo.email && !isValidEmail(data.personalInfo.email)) {
    errors.push('電子郵件格式不正確');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 驗證電話號碼格式
 */
export function isValidPhoneNumber(phone: string): boolean {
  // 台灣手機號碼格式：09xxxxxxxx 或 +886-9xxxxxxxx
  const phoneRegex = /^(\+886-?9\d{8}|09\d{8})$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ''));
}

/**
 * 驗證電子郵件格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 格式化電話號碼顯示
 */
export function formatPhoneNumber(phone: string): string {
  // 移除所有空格和連字符
  const cleaned = phone.replace(/\s|-/g, '');
  
  // 如果是台灣手機號碼，格式化為 09xx-xxx-xxx
  if (cleaned.match(/^09\d{8}$/)) {
    return cleaned.replace(/^(09\d{2})(\d{3})(\d{3})$/, '$1-$2-$3');
  }
  
  // 如果是國際格式，保持原樣
  if (cleaned.startsWith('+886')) {
    return cleaned;
  }
  
  return phone;
}

/**
 * 計算活動剩餘時間
 */
export function getEventTimeRemaining(event: PretixEvent): {
  hasStarted: boolean;
  hasEnded: boolean;
  timeUntilStart?: number;
  timeUntilEnd?: number;
  displayText: string;
} {
  const now = new Date();
  const startDate = event.date_from ? new Date(event.date_from) : null;
  const endDate = event.date_to ? new Date(event.date_to) : null;
  
  if (!startDate) {
    return {
      hasStarted: false,
      hasEnded: false,
      displayText: '時間待定'
    };
  }
  
  const hasStarted = now >= startDate;
  const hasEnded = endDate ? now >= endDate : false;
  
  if (hasEnded) {
    return {
      hasStarted: true,
      hasEnded: true,
      displayText: '活動已結束'
    };
  }
  
  if (hasStarted) {
    if (endDate) {
      const timeUntilEnd = endDate.getTime() - now.getTime();
      return {
        hasStarted: true,
        hasEnded: false,
        timeUntilEnd,
        displayText: `活動進行中，${formatTimeRemaining(timeUntilEnd)}後結束`
      };
    } else {
      return {
        hasStarted: true,
        hasEnded: false,
        displayText: '活動進行中'
      };
    }
  } else {
    const timeUntilStart = startDate.getTime() - now.getTime();
    return {
      hasStarted: false,
      hasEnded: false,
      timeUntilStart,
      displayText: `${formatTimeRemaining(timeUntilStart)}後開始`
    };
  }
}

/**
 * 格式化剩餘時間顯示
 */
export function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天${hours % 24}小時`;
  } else if (hours > 0) {
    return `${hours}小時${minutes % 60}分鐘`;
  } else if (minutes > 0) {
    return `${minutes}分鐘`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 生成活動摘要
 */
export function generateEventSummary(event: LocalizedEvent): string {
  let summary = event.name;
  
  if (event.dateFrom) {
    summary += ` - ${formatDate(event.dateFrom.toISOString())}`;
  }
  
  if (event.location) {
    summary += ` @ ${event.location}`;
  }
  
  if (event.availableSeats !== undefined && event.totalSeats !== undefined) {
    summary += ` (${event.availableSeats}/${event.totalSeats} 可用)`;
  }
  
  return summary;
}

export default {
  getLocalizedText,
  formatDateTime,
  formatDate,
  formatTime,
  isEventRegistrationOpen,
  findItemByIdentity,
  calculateItemAvailability,
  getOrderStatusText,
  canCancelOrder,
  canModifyOrder,
  buildOrderComment,
  buildPretixOrderRequest,
  validateRegistrationData,
  isValidPhoneNumber,
  isValidEmail,
  formatPhoneNumber,
  getEventTimeRemaining,
  formatTimeRemaining,
  generateEventSummary
};