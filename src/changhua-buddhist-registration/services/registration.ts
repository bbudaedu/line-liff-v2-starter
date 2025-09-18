import { PretixClient, PretixAPIError } from './pretix';
import {
  PretixEvent,
  PretixItem,
  PretixQuota,
  PretixOrder,
  PretixOrderRequest,
  LocalizedEvent,
  LocalizedItem,
  RegistrationData,
  OrderCreationResult,
  EventAvailabilityInfo
} from '../types/pretix';

export class RegistrationService {
  constructor(private pretixClient: PretixClient) {}

  /**
   * 獲取本地化的活動列表
   */
  async getLocalizedEvents(locale: string = 'zh-tw'): Promise<LocalizedEvent[]> {
    try {
      const events = await this.pretixClient.getEvents();
      const localizedEvents: LocalizedEvent[] = [];

      for (const event of events) {
        if (!event.is_public || !event.live) {
          continue; // 跳過非公開或非上線的活動
        }

        const [items, quotas] = await Promise.all([
          this.pretixClient.getEventItems(event.slug),
          this.pretixClient.getEventQuotas(event.slug)
        ]);

        const localizedEvent = this.localizeEvent(event, items, quotas, locale);
        localizedEvents.push(localizedEvent);
      }

      return localizedEvents.sort((a, b) => {
        // 按開始時間排序，最近的活動在前
        if (!a.dateFrom && !b.dateFrom) return 0;
        if (!a.dateFrom) return 1;
        if (!b.dateFrom) return -1;
        return a.dateFrom.getTime() - b.dateFrom.getTime();
      });
    } catch (error) {
      if (error instanceof PretixAPIError) {
        throw error;
      }
      throw new PretixAPIError('獲取活動列表失敗', undefined, 'FETCH_EVENTS_ERROR', error);
    }
  }

  /**
   * 獲取特定活動的詳細資訊
   */
  async getEventDetails(eventSlug: string, locale: string = 'zh-tw'): Promise<LocalizedEvent> {
    try {
      const [event, items, quotas] = await Promise.all([
        this.pretixClient.getEvent(eventSlug),
        this.pretixClient.getEventItems(eventSlug),
        this.pretixClient.getEventQuotas(eventSlug)
      ]);

      return this.localizeEvent(event, items, quotas, locale);
    } catch (error) {
      if (error instanceof PretixAPIError) {
        throw error;
      }
      throw new PretixAPIError('獲取活動詳情失敗', undefined, 'FETCH_EVENT_ERROR', error);
    }
  }

  /**
   * 檢查活動可用性
   */
  async checkEventAvailability(eventSlug: string): Promise<EventAvailabilityInfo> {
    try {
      const [event, items, quotas] = await Promise.all([
        this.pretixClient.getEvent(eventSlug),
        this.pretixClient.getEventItems(eventSlug),
        this.pretixClient.getEventQuotas(eventSlug)
      ]);

      // 檢查活動是否開放報名
      const now = new Date();
      const presaleStart = event.presale_start ? new Date(event.presale_start) : null;
      const presaleEnd = event.presale_end ? new Date(event.presale_end) : null;

      if (presaleStart && now < presaleStart) {
        return {
          eventSlug,
          isAvailable: false,
          availableItems: [],
          message: '報名尚未開始'
        };
      }

      if (presaleEnd && now > presaleEnd) {
        return {
          eventSlug,
          isAvailable: false,
          availableItems: [],
          message: '報名已截止'
        };
      }

      // 檢查各項目的可用性
      const availableItems = items
        .filter(item => item.active)
        .map(item => {
          const itemQuotas = quotas.filter(quota => quota.items.includes(item.id));
          const isAvailable = itemQuotas.length === 0 || itemQuotas.some(quota => quota.available);
          const availableCount = itemQuotas.length > 0 
            ? Math.min(...itemQuotas.map(quota => quota.available_number || 0))
            : undefined;

          return {
            itemId: item.id,
            name: this.getLocalizedText(item.name, 'zh-tw'),
            available: isAvailable,
            availableCount: availableCount && availableCount > 0 ? availableCount : undefined
          };
        });

      const hasAvailableItems = availableItems.some(item => item.available);

      return {
        eventSlug,
        isAvailable: hasAvailableItems,
        availableItems,
        message: hasAvailableItems ? undefined : '所有項目已額滿'
      };
    } catch (error) {
      if (error instanceof PretixAPIError) {
        throw error;
      }
      throw new PretixAPIError('檢查活動可用性失敗', undefined, 'CHECK_AVAILABILITY_ERROR', error);
    }
  }

  /**
   * 建立報名訂單
   */
  async createRegistration(registrationData: RegistrationData): Promise<OrderCreationResult> {
    try {
      // 先檢查活動可用性
      const availability = await this.checkEventAvailability(registrationData.eventSlug);
      if (!availability.isAvailable) {
        return {
          success: false,
          error: availability.message || '活動不可報名',
          errorCode: 'EVENT_NOT_AVAILABLE'
        };
      }

      // 獲取活動項目資訊
      const items = await this.pretixClient.getEventItems(registrationData.eventSlug);
      
      // 根據身份類型選擇對應的項目
      const targetItem = this.findItemByIdentity(items, registrationData.identity);
      if (!targetItem) {
        return {
          success: false,
          error: '找不到對應的報名項目',
          errorCode: 'ITEM_NOT_FOUND'
        };
      }

      // 檢查該項目是否可用
      const itemAvailability = availability.availableItems.find(item => item.itemId === targetItem.id);
      if (!itemAvailability?.available) {
        return {
          success: false,
          error: '該報名項目已額滿',
          errorCode: 'ITEM_NOT_AVAILABLE'
        };
      }

      // 建立訂單資料
      const orderRequest = this.buildOrderRequest(registrationData, targetItem);
      
      // 建立 Pretix 訂單
      const order = await this.pretixClient.createOrder(registrationData.eventSlug, orderRequest);

      return {
        success: true,
        order
      };
    } catch (error) {
      if (error instanceof PretixAPIError) {
        return {
          success: false,
          error: error.message,
          errorCode: error.code
        };
      }
      return {
        success: false,
        error: '建立報名失敗',
        errorCode: 'CREATE_REGISTRATION_ERROR'
      };
    }
  }

  /**
   * 查詢訂單狀態
   */
  async getRegistrationStatus(eventSlug: string, orderCode: string): Promise<PretixOrder> {
    try {
      return await this.pretixClient.getOrder(eventSlug, orderCode);
    } catch (error) {
      if (error instanceof PretixAPIError) {
        throw error;
      }
      throw new PretixAPIError('查詢報名狀態失敗', undefined, 'GET_ORDER_ERROR', error);
    }
  }

  /**
   * 取消報名
   */
  async cancelRegistration(eventSlug: string, orderCode: string): Promise<PretixOrder> {
    try {
      return await this.pretixClient.cancelOrder(eventSlug, orderCode);
    } catch (error) {
      if (error instanceof PretixAPIError) {
        throw error;
      }
      throw new PretixAPIError('取消報名失敗', undefined, 'CANCEL_ORDER_ERROR', error);
    }
  }

  /**
   * 將 Pretix 活動資料本地化
   */
  private localizeEvent(
    event: PretixEvent,
    items: PretixItem[],
    quotas: PretixQuota[],
    locale: string
  ): LocalizedEvent {
    const localizedItems = items
      .filter(item => item.active)
      .map(item => this.localizeItem(item, quotas, locale));

    // 計算總座位數和可用座位數
    const totalSeats = quotas.reduce((sum, quota) => {
      return sum + (quota.total_size || 0);
    }, 0);

    const availableSeats = quotas.reduce((sum, quota) => {
      return sum + (quota.available_number || 0);
    }, 0);

    return {
      slug: event.slug,
      name: this.getLocalizedText(event.name, locale),
      location: event.location ? this.getLocalizedText(event.location, locale) : undefined,
      dateFrom: event.date_from ? new Date(event.date_from) : null,
      dateTo: event.date_to ? new Date(event.date_to) : null,
      dateAdmission: event.date_admission ? new Date(event.date_admission) : null,
      presaleStart: event.presale_start ? new Date(event.presale_start) : null,
      presaleEnd: event.presale_end ? new Date(event.presale_end) : null,
      isLive: event.live,
      isPublic: event.is_public,
      currency: event.currency,
      items: localizedItems,
      quotas,
      totalSeats: totalSeats > 0 ? totalSeats : undefined,
      availableSeats: availableSeats > 0 ? availableSeats : undefined
    };
  }

  /**
   * 將 Pretix 項目資料本地化
   */
  private localizeItem(item: PretixItem, quotas: PretixQuota[], locale: string): LocalizedItem {
    const itemQuotas = quotas.filter(quota => quota.items.includes(item.id));
    const isAvailable = itemQuotas.length === 0 || itemQuotas.some(quota => quota.available);

    return {
      id: item.id,
      name: this.getLocalizedText(item.name, locale),
      description: item.description ? this.getLocalizedText(item.description, locale) : undefined,
      price: parseFloat(item.default_price),
      currency: 'TWD', // 假設使用台幣
      isActive: item.active,
      isAvailable,
      maxPerOrder: item.max_per_order || undefined,
      minPerOrder: item.min_per_order || undefined,
      variations: item.variations.map(variation => ({
        id: variation.id,
        name: this.getLocalizedText(variation.value, locale),
        description: variation.description ? this.getLocalizedText(variation.description, locale) : undefined,
        price: parseFloat(variation.price || item.default_price),
        isActive: variation.active,
        isAvailable: isAvailable
      }))
    };
  }

  /**
   * 獲取本地化文字
   */
  private getLocalizedText(textObj: { [locale: string]: string }, locale: string): string {
    return textObj[locale] || textObj['zh-tw'] || textObj['en'] || Object.values(textObj)[0] || '';
  }

  /**
   * 根據身份類型找到對應的項目
   */
  private findItemByIdentity(items: PretixItem[], identity: 'monk' | 'volunteer'): PretixItem | null {
    // 根據項目名稱或內部名稱判斷身份類型
    const identityKeywords = {
      monk: ['法師', 'monk', '師父', '出家'],
      volunteer: ['志工', 'volunteer', '義工', '在家']
    };

    const keywords = identityKeywords[identity];
    
    return items.find(item => {
      const itemName = this.getLocalizedText(item.name, 'zh-tw').toLowerCase();
      const internalName = (item.internal_name || '').toLowerCase();
      
      return keywords.some(keyword => 
        itemName.includes(keyword.toLowerCase()) || 
        internalName.includes(keyword.toLowerCase())
      );
    }) || null;
  }

  /**
   * 建立 Pretix 訂單請求資料
   */
  private buildOrderRequest(registrationData: RegistrationData, item: PretixItem): PretixOrderRequest {
    const { personalInfo, transport, lineUserId, metadata } = registrationData;

    return {
      email: personalInfo.email,
      phone: personalInfo.phone,
      locale: 'zh-tw',
      sales_channel: 'web',
      positions: [{
        item: item.id,
        attendee_name: personalInfo.name,
        attendee_email: personalInfo.email,
        phone: personalInfo.phone,
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
      comment: this.buildOrderComment(registrationData)
    };
  }

  /**
   * 建立訂單備註
   */
  private buildOrderComment(registrationData: RegistrationData): string {
    const { identity, personalInfo, transport } = registrationData;
    
    let comment = `身份：${identity === 'monk' ? '法師' : '志工'}\n`;
    comment += `姓名：${personalInfo.name}\n`;
    comment += `電話：${personalInfo.phone}\n`;
    
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
    } else {
      comment += `需要交通車：否\n`;
    }
    
    if (personalInfo.specialRequirements) {
      comment += `特殊需求：${personalInfo.specialRequirements}\n`;
    }
    
    return comment.trim();
  }

  /**
   * 獲取服務健康狀態
   */
  async getHealthStatus(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const isHealthy = await this.pretixClient.healthCheck();
      return {
        healthy: isHealthy,
        message: isHealthy ? 'Pretix 服務正常' : 'Pretix 服務異常'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Pretix 服務檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      };
    }
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.pretixClient.clearCache();
  }

  /**
   * 獲取快取統計
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.pretixClient.getCacheStats();
  }
}

// 預設的註冊服務實例
let registrationService: RegistrationService | null = null;

export function initializeRegistrationService(pretixClient: PretixClient): RegistrationService {
  registrationService = new RegistrationService(pretixClient);
  return registrationService;
}

export function getRegistrationService(): RegistrationService {
  if (!registrationService) {
    throw new Error('Registration service not initialized. Call initializeRegistrationService first.');
  }
  return registrationService;
}

export default RegistrationService;