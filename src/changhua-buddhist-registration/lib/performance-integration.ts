/**
 * 效能優化整合系統
 * 整合所有效能優化功能並提供統一的初始化和管理介面
 */

import { registerCommonPreloadTasks, preloader, smartPreloader } from './preloader';
import { imageOptimizer, staticResourceOptimizer } from './image-optimizer';
import { codeSplittingManager, smartPreloadStrategy } from './code-splitting';
import { databaseOptimizer } from './database-optimizer';
import { cache } from './cache';
import { cdnOptimizer } from './cdn-optimizer';
import { performanceMonitor, performanceBudget } from './performance-monitor';

interface PerformanceConfig {
  enableCaching: boolean;
  enablePreloading: boolean;
  enableImageOptimization: boolean;
  enableCodeSplitting: boolean;
  enableDatabaseOptimization: boolean;
  enableCDNOptimization: boolean;
  enablePerformanceMonitoring: boolean;
}

class PerformanceIntegration {
  private config: PerformanceConfig;
  private initialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableCaching: true,
      enablePreloading: true,
      enableImageOptimization: true,
      enableCodeSplitting: true,
      enableDatabaseOptimization: true,
      enableCDNOptimization: true,
      enablePerformanceMonitoring: true,
      ...config
    };
  }

  /**
   * 初始化所有效能優化功能
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🚀 初始化效能優化系統...');

    try {
      // 初始化快取系統
      if (this.config.enableCaching) {
        await this.initializeCaching();
      }

      // 初始化預載入系統
      if (this.config.enablePreloading) {
        await this.initializePreloading();
      }

      // 初始化圖片優化
      if (this.config.enableImageOptimization) {
        await this.initializeImageOptimization();
      }

      // 初始化程式碼分割
      if (this.config.enableCodeSplitting) {
        await this.initializeCodeSplitting();
      }

      // 初始化 CDN 優化
      if (this.config.enableCDNOptimization) {
        await this.initializeCDNOptimization();
      }

      // 初始化效能監控
      if (this.config.enablePerformanceMonitoring) {
        await this.initializePerformanceMonitoring();
      }

      this.initialized = true;
      console.log('✅ 效能優化系統初始化完成');

      // 執行初始效能檢查
      setTimeout(() => this.performInitialHealthCheck(), 2000);

    } catch (error) {
      console.error('❌ 效能優化系統初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 初始化快取系統
   */
  private async initializeCaching(): Promise<void> {
    console.log('📦 初始化快取系統...');
    
    // 清理過期快取
    cache.clear();
    
    // 設定快取統計監控
    setInterval(() => {
      const stats = cache.getStats();
      if (stats.memoryItems > stats.maxMemoryItems * 0.8) {
        console.warn('⚠️ 快取使用率過高:', stats);
      }
    }, 60000); // 每分鐘檢查一次
  }

  /**
   * 初始化預載入系統
   */
  private async initializePreloading(): Promise<void> {
    console.log('⚡ 初始化預載入系統...');
    
    // 註冊常用預載入任務
    registerCommonPreloadTasks();
    
    // 開始預載入高優先級資料
    await preloader.preload(['events_list', 'user_identity']);
    
    // 設定智慧預載入
    if (typeof window !== 'undefined') {
      // 監聽路由變化
      window.addEventListener('popstate', () => {
        const currentPath = window.location.pathname;
        smartPreloader.recordBehavior(`navigate_${currentPath}`);
      });
    }
  }

  /**
   * 初始化圖片優化
   */
  private async initializeImageOptimization(): Promise<void> {
    console.log('🖼️ 初始化圖片優化...');
    
    if (typeof window !== 'undefined') {
      // 啟用懶載入
      setTimeout(() => {
        imageOptimizer.enableLazyLoading();
      }, 1000);

      // 預載入關鍵圖片
      const criticalImages = [
        '/images/logo.png',
        '/images/hero-bg.jpg'
      ];
      
      try {
        await imageOptimizer.preloadCriticalImages(criticalImages);
      } catch (error) {
        console.warn('⚠️ 關鍵圖片預載入失敗:', error);
      }
    }
  }

  /**
   * 初始化程式碼分割
   */
  private async initializeCodeSplitting(): Promise<void> {
    console.log('📦 初始化程式碼分割...');
    
    if (typeof window !== 'undefined') {
      // 設定當前路由
      smartPreloadStrategy.setCurrentRoute(window.location.pathname);
      
      // 監聽路由變化
      window.addEventListener('popstate', () => {
        smartPreloadStrategy.setCurrentRoute(window.location.pathname);
      });
    }
  }

  /**
   * 初始化 CDN 優化
   */
  private async initializeCDNOptimization(): Promise<void> {
    console.log('🌐 初始化 CDN 優化...');
    
    if (typeof window !== 'undefined') {
      // 設定資源提示
      staticResourceOptimizer.setupResourceHints();
      
      // 優化資源載入順序
      cdnOptimizer.optimizeResourceLoading();
      
      // 預載入關鍵資源
      cdnOptimizer.preloadCriticalAssets();
    }
  }

  /**
   * 初始化效能監控
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    console.log('📊 初始化效能監控...');
    
    // 效能監控已在建構時自動啟動
    
    // 設定定期效能檢查
    setInterval(async () => {
      const budgetCheck = await performanceBudget.checkBudget();
      if (!budgetCheck.passed) {
        console.warn('⚠️ 效能預算違規:', budgetCheck.violations);
      }
    }, 300000); // 每 5 分鐘檢查一次
  }

  /**
   * 執行初始健康檢查
   */
  private async performInitialHealthCheck(): Promise<void> {
    console.log('🔍 執行效能健康檢查...');
    
    const healthReport = {
      cache: cache.getStats(),
      preloader: preloader.getStats(),
      codeSplitting: codeSplittingManager.getStats(),
      performance: performanceMonitor.getPerformanceReport(),
      budget: await performanceBudget.checkBudget()
    };

    console.log('📋 效能健康報告:', healthReport);

    // 如果有嚴重問題，發出警告
    if (!healthReport.budget.passed) {
      console.warn('⚠️ 發現效能預算違規，建議檢查資源使用情況');
    }

    if (healthReport.performance.issues.length > 0) {
      console.warn('⚠️ 發現效能問題:', healthReport.performance.issues);
      console.info('💡 優化建議:', healthReport.performance.recommendations);
    }
  }

  /**
   * 取得綜合效能報告
   */
  getComprehensiveReport(): any {
    if (!this.initialized) {
      throw new Error('效能系統尚未初始化');
    }

    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      cache: {
        stats: cache.getStats(),
        enabled: this.config.enableCaching
      },
      preloader: {
        stats: preloader.getStats(),
        enabled: this.config.enablePreloading
      },
      codeSplitting: {
        stats: codeSplittingManager.getStats(),
        enabled: this.config.enableCodeSplitting
      },
      performance: {
        report: performanceMonitor.getPerformanceReport(),
        enabled: this.config.enablePerformanceMonitoring
      },
      cdn: {
        metrics: typeof window !== 'undefined' ? cdnOptimizer.getPerformanceMetrics() : {},
        enabled: this.config.enableCDNOptimization
      }
    };
  }

  /**
   * 優化特定頁面
   */
  async optimizePage(pagePath: string): Promise<void> {
    console.log(`🎯 優化頁面: ${pagePath}`);

    // 記錄使用者行為
    smartPreloader.recordBehavior(`view_${pagePath}`);
    smartPreloadStrategy.setCurrentRoute(pagePath);

    // 根據頁面類型執行特定優化
    switch (pagePath) {
      case '/':
        await this.optimizeHomePage();
        break;
      case '/events':
        await this.optimizeEventsPage();
        break;
      case '/registration':
        await this.optimizeRegistrationPage();
        break;
      default:
        await this.optimizeGenericPage(pagePath);
    }
  }

  /**
   * 優化首頁
   */
  private async optimizeHomePage(): Promise<void> {
    // 預載入身份選擇和活動列表
    await preloader.preload(['user_identity', 'events_list']);
    
    // 預載入下一步可能需要的元件
    await codeSplittingManager.preloadChunks([
      () => import('../components/identity/IdentitySelection'),
      () => import('../pages/events/index')
    ]);
  }

  /**
   * 優化活動頁面
   */
  private async optimizeEventsPage(): Promise<void> {
    // 預載入活動相關資料
    await preloader.preload(['events_list', 'transport_options']);
    
    // 預載入報名相關元件
    await codeSplittingManager.preloadChunks([
      () => import('../pages/registration/index'),
      () => import('../components/forms/PersonalInfoForm')
    ]);
  }

  /**
   * 優化報名頁面
   */
  private async optimizeRegistrationPage(): Promise<void> {
    // 預載入使用者資料和交通選項
    await preloader.preload(['user_identity', 'transport_options']);
    
    // 預載入報名流程元件
    await codeSplittingManager.preloadChunks([
      () => import('../pages/registration/personal-info'),
      () => import('../pages/registration/transport'),
      () => import('../pages/registration/confirmation')
    ]);
  }

  /**
   * 優化一般頁面
   */
  private async optimizeGenericPage(pagePath: string): Promise<void> {
    // 基本優化：啟用懶載入
    if (typeof window !== 'undefined') {
      imageOptimizer.enableLazyLoading();
    }
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    console.log('🧹 清理效能優化資源...');
    
    cache.clear();
    preloader.clear();
    codeSplittingManager.clearStats();
    performanceMonitor.clearMetrics();
    
    if (typeof window !== 'undefined') {
      imageOptimizer.cleanup();
    }
    
    this.initialized = false;
  }
}

// 建立全域效能整合實例
export const performanceIntegration = new PerformanceIntegration();

// React Hook for performance integration
export function usePerformanceOptimization() {
  const initialize = () => performanceIntegration.initialize();
  const optimizePage = (path: string) => performanceIntegration.optimizePage(path);
  const getReport = () => performanceIntegration.getComprehensiveReport();
  const cleanup = () => performanceIntegration.cleanup();

  return {
    initialize,
    optimizePage,
    getReport,
    cleanup
  };
}

// 自動初始化（在瀏覽器環境中）
if (typeof window !== 'undefined') {
  // 等待 DOM 載入完成後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceIntegration.initialize();
    });
  } else {
    performanceIntegration.initialize();
  }
}

export default PerformanceIntegration;