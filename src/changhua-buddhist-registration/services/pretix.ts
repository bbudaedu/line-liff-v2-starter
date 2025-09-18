import axios, { AxiosInstance, AxiosError } from 'axios';
import { PretixEvent, PretixItem, PretixQuota, PretixOrder, PretixOrderRequest } from '../types/pretix';

export interface PretixConfig {
  baseURL: string;
  apiToken: string;
  organizerSlug: string;
}

export class PretixAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'PretixAPIError';
  }
}

export class PretixClient {
  private client: AxiosInstance;
  private config: PretixConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: PretixConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Authorization': `Token ${config.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError): PretixAPIError {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 400:
          return new PretixAPIError(
            data?.detail || '請求資料格式錯誤',
            status,
            'BAD_REQUEST',
            error
          );
        case 401:
          return new PretixAPIError(
            'API 認證失敗，請檢查 API Token',
            status,
            'UNAUTHORIZED',
            error
          );
        case 403:
          return new PretixAPIError(
            data?.detail || '沒有權限執行此操作',
            status,
            'FORBIDDEN',
            error
          );
        case 404:
          return new PretixAPIError(
            data?.detail || '找不到指定的資源',
            status,
            'NOT_FOUND',
            error
          );
        case 429:
          return new PretixAPIError(
            'API 請求頻率過高，請稍後再試',
            status,
            'RATE_LIMITED',
            error
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new PretixAPIError(
            'Pretix 服務暫時無法使用，請稍後再試',
            status,
            'SERVER_ERROR',
            error
          );
        default:
          return new PretixAPIError(
            data?.detail || `HTTP ${status} 錯誤`,
            status,
            'HTTP_ERROR',
            error
          );
      }
    } else if (error.request) {
      return new PretixAPIError(
        '無法連接到 Pretix 服務，請檢查網路連線',
        undefined,
        'NETWORK_ERROR',
        error
      );
    } else {
      return new PretixAPIError(
        error.message || '未知錯誤',
        undefined,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  private getCacheKey(endpoint: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramStr}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof PretixAPIError && error.statusCode && error.statusCode < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 獲取活動列表
   */
  async getEvents(): Promise<PretixEvent[]> {
    const cacheKey = this.getCacheKey('events');
    const cached = this.getFromCache<PretixEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.retryRequest(async () => {
      return await this.client.get(`/organizers/${this.config.organizerSlug}/events/`);
    });

    const events = response.data.results as PretixEvent[];
    this.setCache(cacheKey, events);
    return events;
  }

  /**
   * 獲取特定活動詳情
   */
  async getEvent(eventSlug: string): Promise<PretixEvent> {
    const cacheKey = this.getCacheKey(`event:${eventSlug}`);
    const cached = this.getFromCache<PretixEvent>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.retryRequest(async () => {
      return await this.client.get(`/organizers/${this.config.organizerSlug}/events/${eventSlug}/`);
    });

    const event = response.data as PretixEvent;
    this.setCache(cacheKey, event);
    return event;
  }

  /**
   * 獲取活動項目列表
   */
  async getEventItems(eventSlug: string): Promise<PretixItem[]> {
    const cacheKey = this.getCacheKey(`items:${eventSlug}`);
    const cached = this.getFromCache<PretixItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.retryRequest(async () => {
      return await this.client.get(`/organizers/${this.config.organizerSlug}/events/${eventSlug}/items/`);
    });

    const items = response.data.results as PretixItem[];
    this.setCache(cacheKey, items);
    return items;
  }

  /**
   * 獲取活動配額資訊
   */
  async getEventQuotas(eventSlug: string): Promise<PretixQuota[]> {
    const cacheKey = this.getCacheKey(`quotas:${eventSlug}`);
    const cached = this.getFromCache<PretixQuota[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.retryRequest(async () => {
      return await this.client.get(`/organizers/${this.config.organizerSlug}/events/${eventSlug}/quotas/`);
    });

    const quotas = response.data.results as PretixQuota[];
    this.setCache(cacheKey, quotas);
    return quotas;
  }

  /**
   * 建立訂單
   */
  async createOrder(eventSlug: string, orderData: PretixOrderRequest): Promise<PretixOrder> {
    // Clear relevant cache entries when creating orders
    this.clearEventCache(eventSlug);

    const response = await this.retryRequest(async () => {
      return await this.client.post(
        `/organizers/${this.config.organizerSlug}/events/${eventSlug}/orders/`,
        orderData
      );
    });

    return response.data as PretixOrder;
  }

  /**
   * 獲取訂單狀態
   */
  async getOrder(eventSlug: string, orderCode: string): Promise<PretixOrder> {
    const response = await this.retryRequest(async () => {
      return await this.client.get(
        `/organizers/${this.config.organizerSlug}/events/${eventSlug}/orders/${orderCode}/`
      );
    });

    return response.data as PretixOrder;
  }

  /**
   * 更新訂單狀態
   */
  async updateOrderStatus(eventSlug: string, orderCode: string, status: string): Promise<PretixOrder> {
    const response = await this.retryRequest(async () => {
      return await this.client.patch(
        `/organizers/${this.config.organizerSlug}/events/${eventSlug}/orders/${orderCode}/`,
        { status }
      );
    });

    return response.data as PretixOrder;
  }

  /**
   * 取消訂單
   */
  async cancelOrder(eventSlug: string, orderCode: string): Promise<PretixOrder> {
    return this.updateOrderStatus(eventSlug, orderCode, 'c');
  }

  /**
   * 清除特定活動的快取
   */
  private clearEventCache(eventSlug: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(eventSlug) || key === 'events') {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 清除所有快取
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 獲取快取統計資訊
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get(`/organizers/${this.config.organizerSlug}/`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 預設的 Pretix 客戶端實例
let pretixClient: PretixClient | null = null;

export function initializePretixClient(config: PretixConfig): PretixClient {
  pretixClient = new PretixClient(config);
  return pretixClient;
}

export function getPretixClient(): PretixClient {
  if (!pretixClient) {
    throw new Error('Pretix client not initialized. Call initializePretixClient first.');
  }
  return pretixClient;
}

export default PretixClient;