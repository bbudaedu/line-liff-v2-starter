/**
 * 程式碼分割和懶載入系統
 * 提供動態導入和元件懶載入功能
 */

import { ComponentType, lazy, LazyExoticComponent } from 'react';

interface LazyComponentOptions {
  fallback?: ComponentType;
  retryCount?: number;
  retryDelay?: number;
}

interface ChunkLoadError extends Error {
  name: 'ChunkLoadError';
  code?: string;
}

class CodeSplittingManager {
  private loadedChunks = new Set<string>();
  private failedChunks = new Set<string>();
  private retryAttempts = new Map<string, number>();

  /**
   * 建立懶載入元件
   */
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: LazyComponentOptions = {}
  ): LazyExoticComponent<T> {
    const { retryCount = 3, retryDelay = 1000 } = options;

    return lazy(() => {
      return this.retryImport(importFn, retryCount, retryDelay);
    });
  }

  /**
   * 重試導入邏輯
   */
  private async retryImport<T>(
    importFn: () => Promise<T>,
    retryCount: number,
    retryDelay: number
  ): Promise<T> {
    const chunkId = this.getChunkId(importFn);
    
    try {
      const result = await importFn();
      this.loadedChunks.add(chunkId);
      this.retryAttempts.delete(chunkId);
      return result;
    } catch (error) {
      const attempts = this.retryAttempts.get(chunkId) || 0;
      
      if (this.isChunkLoadError(error) && attempts < retryCount) {
        this.retryAttempts.set(chunkId, attempts + 1);
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.retryImport(importFn, retryCount, retryDelay);
      }
      
      this.failedChunks.add(chunkId);
      throw error;
    }
  }

  /**
   * 檢查是否為 chunk 載入錯誤
   */
  private isChunkLoadError(error: any): error is ChunkLoadError {
    return error?.name === 'ChunkLoadError' || 
           error?.message?.includes('Loading chunk') ||
           error?.message?.includes('Loading CSS chunk');
  }

  /**
   * 取得 chunk ID
   */
  private getChunkId(importFn: Function): string {
    return importFn.toString();
  }

  /**
   * 預載入 chunk
   */
  async preloadChunk(importFn: () => Promise<any>): Promise<void> {
    const chunkId = this.getChunkId(importFn);
    
    if (this.loadedChunks.has(chunkId)) {
      return;
    }

    try {
      await importFn();
      this.loadedChunks.add(chunkId);
    } catch (error) {
      console.warn('Failed to preload chunk:', error);
      this.failedChunks.add(chunkId);
    }
  }

  /**
   * 批次預載入 chunks
   */
  async preloadChunks(importFns: (() => Promise<any>)[]): Promise<void> {
    const promises = importFns.map(fn => this.preloadChunk(fn));
    await Promise.allSettled(promises);
  }

  /**
   * 取得載入統計
   */
  getStats() {
    return {
      loadedChunks: this.loadedChunks.size,
      failedChunks: this.failedChunks.size,
      retryAttempts: this.retryAttempts.size
    };
  }

  /**
   * 清除統計資料
   */
  clearStats(): void {
    this.loadedChunks.clear();
    this.failedChunks.clear();
    this.retryAttempts.clear();
  }
}

// 建立全域程式碼分割管理器
export const codeSplittingManager = new CodeSplittingManager();

// 預定義的懶載入元件
export const LazyComponents = {
  // 身份選擇元件
  IdentitySelection: codeSplittingManager.createLazyComponent(
    () => import('../components/identity/IdentitySelection')
  ),

  // 註冊相關元件
  RegistrationCard: codeSplittingManager.createLazyComponent(
    () => import('../components/registration/RegistrationCard')
  ),
  
  RegistrationEditModal: codeSplittingManager.createLazyComponent(
    () => import('../components/registration/RegistrationEditModal')
  ),

  // 報名相關元件
  PersonalInfoForm: codeSplittingManager.createLazyComponent(
    () => import('../components/forms/PersonalInfoForm')
  ),

  TransportSelection: codeSplittingManager.createLazyComponent(
    () => import('../components/transport/TransportSelection')
  ),

  RegistrationProgress: codeSplittingManager.createLazyComponent(
    () => import('../components/registration/RegistrationProgress')
  ),

  // 交通車相關元件
  TransportConfirmation: codeSplittingManager.createLazyComponent(
    () => import('../components/transport/TransportConfirmation')
  ),

  // 錯誤處理元件
  ErrorBoundary: codeSplittingManager.createLazyComponent(
    () => import('../components/error/ErrorBoundary')
  )
};

// 路由層級的程式碼分割
export const LazyPages = {
  HomePage: codeSplittingManager.createLazyComponent(
    () => import('../pages/index')
  ),

  IdentityPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/identity')
  ),

  EventsPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/events/index')
  ),

  EventDetailsPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/events/[id]')
  ),

  RegistrationPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/registration/index')
  ),

  PersonalInfoPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/registration/personal-info')
  ),

  TransportPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/registration/transport')
  ),

  ConfirmationPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/registration/confirmation')
  ),

  SuccessPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/registration/success')
  ),

  RegistrationsPage: codeSplittingManager.createLazyComponent(
    () => import('../pages/registrations')
  )
};

// 智慧預載入策略
export class SmartPreloadStrategy {
  private currentRoute: string = '';
  private userBehavior: string[] = [];

  /**
   * 設定當前路由
   */
  setCurrentRoute(route: string): void {
    this.currentRoute = route;
    this.userBehavior.push(route);
    
    // 保持最近 10 個行為記錄
    if (this.userBehavior.length > 10) {
      this.userBehavior.shift();
    }

    this.triggerSmartPreload(route);
  }

  /**
   * 根據當前路由觸發智慧預載入
   */
  private triggerSmartPreload(route: string): void {
    switch (route) {
      case '/':
        // 首頁：預載入身份選擇和活動列表
        this.preloadNextLikelyChunks([
          () => import('../components/identity/IdentitySelection'),
          () => import('../pages/events/index')
        ]);
        break;

      case '/identity':
        // 身份選擇：預載入活動相關元件
        this.preloadNextLikelyChunks([
          () => import('../pages/events/index'),
          () => import('../components/registration/RegistrationCard')
        ]);
        break;

      case '/events':
        // 活動列表：預載入活動詳情和報名元件
        this.preloadNextLikelyChunks([
          () => import('../pages/events/[id]'),
          () => import('../pages/registration/index')
        ]);
        break;

      case '/events/[id]':
        // 活動詳情：預載入報名流程元件
        this.preloadNextLikelyChunks([
          () => import('../pages/registration/index'),
          () => import('../components/forms/PersonalInfoForm')
        ]);
        break;

      case '/registration':
        // 報名開始：預載入表單和交通元件
        this.preloadNextLikelyChunks([
          () => import('../pages/registration/personal-info'),
          () => import('../pages/registration/transport')
        ]);
        break;

      case '/registration/personal-info':
        // 個人資料：預載入交通和確認元件
        this.preloadNextLikelyChunks([
          () => import('../pages/registration/transport'),
          () => import('../pages/registration/confirmation')
        ]);
        break;

      case '/registration/transport':
        // 交通選擇：預載入確認和成功頁面
        this.preloadNextLikelyChunks([
          () => import('../pages/registration/confirmation'),
          () => import('../pages/registration/success')
        ]);
        break;
    }
  }

  /**
   * 預載入可能的下一個 chunks
   */
  private async preloadNextLikelyChunks(importFns: (() => Promise<any>)[]): Promise<void> {
    // 延遲預載入以避免影響當前頁面載入
    setTimeout(() => {
      codeSplittingManager.preloadChunks(importFns);
    }, 100);
  }

  /**
   * 根據使用者行為模式預測下一個頁面
   */
  predictNextRoute(): string | null {
    if (this.userBehavior.length < 2) {
      return null;
    }

    // 簡單的模式匹配
    const lastTwo = this.userBehavior.slice(-2);
    const pattern = lastTwo.join(' -> ');

    const commonPatterns: Record<string, string> = {
      '/ -> /identity': '/events',
      '/identity -> /events': '/events/[id]',
      '/events -> /events/[id]': '/registration',
      '/events/[id] -> /registration': '/registration/personal-info',
      '/registration -> /registration/personal-info': '/registration/transport',
      '/registration/personal-info -> /registration/transport': '/registration/confirmation',
      '/registration/transport -> /registration/confirmation': '/registration/success'
    };

    return commonPatterns[pattern] || null;
  }
}

export const smartPreloadStrategy = new SmartPreloadStrategy();

// 效能監控
export function trackChunkLoadTime(chunkName: string, startTime: number): void {
  const loadTime = performance.now() - startTime;
  
  console.log(`Chunk "${chunkName}" loaded in ${loadTime.toFixed(2)}ms`);
  
  // 記錄到效能監控系統
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'chunk_load_time', {
      chunk_name: chunkName,
      load_time: Math.round(loadTime)
    });
  }
}

export default CodeSplittingManager;