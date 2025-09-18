/**
 * 資料預載入系統
 * 在使用者需要之前預先載入關鍵資料
 */

import { cache } from './cache';
import { apiClient } from '../services/api';

interface PreloadConfig {
  priority: 'high' | 'medium' | 'low';
  delay?: number;
  condition?: () => boolean;
}

interface PreloadTask {
  key: string;
  loader: () => Promise<any>;
  config: PreloadConfig;
}

class DataPreloader {
  private tasks = new Map<string, PreloadTask>();
  private loadingTasks = new Set<string>();
  private loadedTasks = new Set<string>();

  /**
   * 註冊預載入任務
   */
  register(key: string, loader: () => Promise<any>, config: PreloadConfig): void {
    this.tasks.set(key, { key, loader, config });
  }

  /**
   * 執行預載入
   */
  async preload(keys?: string[]): Promise<void> {
    const tasksToLoad = keys 
      ? keys.map(key => this.tasks.get(key)).filter(Boolean) as PreloadTask[]
      : Array.from(this.tasks.values());

    // 按優先級排序
    const sortedTasks = tasksToLoad.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.config.priority] - priorityOrder[b.config.priority];
    });

    // 並行執行高優先級任務
    const highPriorityTasks = sortedTasks.filter(task => task.config.priority === 'high');
    const mediumPriorityTasks = sortedTasks.filter(task => task.config.priority === 'medium');
    const lowPriorityTasks = sortedTasks.filter(task => task.config.priority === 'low');

    // 高優先級任務立即執行
    await Promise.all(highPriorityTasks.map(task => this.executeTask(task)));

    // 中優先級任務稍後執行
    setTimeout(() => {
      Promise.all(mediumPriorityTasks.map(task => this.executeTask(task)));
    }, 100);

    // 低優先級任務延遲執行
    setTimeout(() => {
      Promise.all(lowPriorityTasks.map(task => this.executeTask(task)));
    }, 500);
  }

  /**
   * 執行單個預載入任務
   */
  private async executeTask(task: PreloadTask): Promise<void> {
    if (this.loadingTasks.has(task.key) || this.loadedTasks.has(task.key)) {
      return;
    }

    // 檢查條件
    if (task.config.condition && !task.config.condition()) {
      return;
    }

    // 檢查是否已有快取
    const cachedData = cache.get(task.key);
    if (cachedData !== null) {
      this.loadedTasks.add(task.key);
      return;
    }

    this.loadingTasks.add(task.key);

    try {
      // 應用延遲
      if (task.config.delay) {
        await new Promise(resolve => setTimeout(resolve, task.config.delay));
      }

      const data = await task.loader();
      cache.set(task.key, data);
      this.loadedTasks.add(task.key);
    } catch (error) {
      console.warn(`Preload task failed: ${task.key}`, error);
    } finally {
      this.loadingTasks.delete(task.key);
    }
  }

  /**
   * 檢查任務是否已載入
   */
  isLoaded(key: string): boolean {
    return this.loadedTasks.has(key) || cache.get(key) !== null;
  }

  /**
   * 檢查任務是否正在載入
   */
  isLoading(key: string): boolean {
    return this.loadingTasks.has(key);
  }

  /**
   * 清除預載入狀態
   */
  clear(): void {
    this.loadingTasks.clear();
    this.loadedTasks.clear();
  }

  /**
   * 取得預載入統計
   */
  getStats() {
    return {
      totalTasks: this.tasks.size,
      loadedTasks: this.loadedTasks.size,
      loadingTasks: this.loadingTasks.size,
      pendingTasks: this.tasks.size - this.loadedTasks.size - this.loadingTasks.size
    };
  }
}

// 建立全域預載入器實例
export const preloader = new DataPreloader();

// 註冊常用的預載入任務
export function registerCommonPreloadTasks(): void {
  // 預載入活動列表
  preloader.register(
    'events_list',
    () => apiClient.get('/api/v1/events'),
    { priority: 'high' }
  );

  // 預載入使用者身份資訊
  preloader.register(
    'user_identity',
    () => apiClient.get('/api/v1/user/identity'),
    { 
      priority: 'high',
      condition: () => typeof window !== 'undefined' && !!localStorage.getItem('user_identity')
    }
  );

  // 預載入交通車資訊
  preloader.register(
    'transport_options',
    async () => {
      const events = cache.get('events_list');
      if (events && Array.isArray(events) && events.length > 0) {
        const transportPromises = events.map((event: any) => 
          apiClient.get(`/api/v1/events/${event.id}/transport`)
        );
        return Promise.all(transportPromises);
      }
      return [];
    },
    { priority: 'medium', delay: 200 }
  );

  // 預載入使用者報名記錄
  preloader.register(
    'user_registrations',
    () => apiClient.get('/api/v1/registration/my'),
    { 
      priority: 'medium',
      condition: () => typeof window !== 'undefined' && !!localStorage.getItem('user_identity')
    }
  );
}

// 智慧預載入：根據使用者行為預測需要的資料
export class SmartPreloader {
  private userBehavior: string[] = [];
  private maxBehaviorHistory = 10;

  /**
   * 記錄使用者行為
   */
  recordBehavior(action: string): void {
    this.userBehavior.push(action);
    if (this.userBehavior.length > this.maxBehaviorHistory) {
      this.userBehavior.shift();
    }

    // 根據行為模式觸發預載入
    this.triggerSmartPreload(action);
  }

  /**
   * 根據行為觸發智慧預載入
   */
  private triggerSmartPreload(action: string): void {
    switch (action) {
      case 'view_events':
        // 使用者查看活動列表時，預載入活動詳情
        this.preloadEventDetails();
        break;
      
      case 'select_event':
        // 使用者選擇活動時，預載入報名表單相關資料
        preloader.preload(['transport_options', 'user_identity']);
        break;
      
      case 'start_registration':
        // 使用者開始報名時，預載入相關服務
        this.preloadRegistrationServices();
        break;
    }
  }

  /**
   * 預載入活動詳情
   */
  private async preloadEventDetails(): Promise<void> {
    const events = cache.get('events_list');
    if (events && Array.isArray(events)) {
      // 預載入前3個活動的詳情
      const topEvents = events.slice(0, 3);
      topEvents.forEach((event: any) => {
        preloader.register(
          `event_${event.id}`,
          () => apiClient.get(`/api/v1/events/${event.id}`),
          { priority: 'low', delay: 300 }
        );
      });
      
      preloader.preload(topEvents.map((event: any) => `event_${event.id}`));
    }
  }

  /**
   * 預載入報名相關服務
   */
  private preloadRegistrationServices(): void {
    // 預載入 LINE 好友狀態
    preloader.register(
      'line_friendship',
      () => apiClient.get('/api/v1/line/friendship'),
      { priority: 'medium' }
    );

    preloader.preload(['line_friendship']);
  }
}

export const smartPreloader = new SmartPreloader();

export default DataPreloader;