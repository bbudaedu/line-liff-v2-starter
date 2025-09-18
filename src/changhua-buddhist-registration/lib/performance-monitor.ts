/**
 * 效能監控和分析系統
 * 提供即時效能監控、指標收集和分析報告
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
  userAgent?: string;
  connectionType?: string;
}

interface PerformanceThresholds {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    averageFCP: number;
    averageLCP: number;
    averageFID: number;
    averageCLS: number;
    averageTTFB: number;
  };
  issues: string[];
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: PerformanceThresholds = {
    fcp: 1800, // 1.8s
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    ttfb: 600  // 600ms
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.startMonitoring();
    }
  }

  /**
   * 初始化效能觀察器
   */
  private initializeObservers(): void {
    // Core Web Vitals 觀察器
    this.observeWebVitals();
    
    // 資源載入觀察器
    this.observeResourceTiming();
    
    // 導航時間觀察器
    this.observeNavigationTiming();
    
    // 長任務觀察器
    this.observeLongTasks();
  }

  /**
   * 觀察 Core Web Vitals
   */
  private observeWebVitals(): void {
    // First Contentful Paint
    this.createObserver('paint', (entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      });
    });

    // Largest Contentful Paint
    this.createObserver('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime);
    });

    // First Input Delay
    this.createObserver('first-input', (entries) => {
      entries.forEach((entry) => {
        this.recordMetric('FID', (entry as any).processingStart - entry.startTime);
      });
    });

    // Cumulative Layout Shift
    this.createObserver('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      if (clsValue > 0) {
        this.recordMetric('CLS', clsValue);
      }
    });
  }

  /**
   * 觀察資源載入時間
   */
  private observeResourceTiming(): void {
    this.createObserver('resource', (entries) => {
      entries.forEach((entry) => {
        const resource = entry as PerformanceResourceTiming;
        
        // 記錄不同類型資源的載入時間
        const loadTime = resource.responseEnd - resource.startTime;
        const resourceType = this.getResourceType(resource.name);
        
        this.recordMetric(`${resourceType}_load_time`, loadTime, {
          url: resource.name
        });

        // 檢查慢載入資源
        if (loadTime > 3000) {
          this.recordMetric('slow_resource', loadTime, {
            url: resource.name
          });
        }
      });
    });
  }

  /**
   * 觀察導航時間
   */
  private observeNavigationTiming(): void {
    this.createObserver('navigation', (entries) => {
      entries.forEach((entry) => {
        const nav = entry as PerformanceNavigationTiming;
        
        // Time to First Byte
        const ttfb = nav.responseStart - nav.requestStart;
        this.recordMetric('TTFB', ttfb);
        
        // DOM Content Loaded
        const dcl = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
        this.recordMetric('DCL', dcl);
        
        // Load Event
        const loadEvent = nav.loadEventEnd - nav.loadEventStart;
        this.recordMetric('Load', loadEvent);
      });
    });
  }

  /**
   * 觀察長任務
   */
  private observeLongTasks(): void {
    this.createObserver('longtask', (entries) => {
      entries.forEach((entry) => {
        this.recordMetric('Long_Task', entry.duration, {
          url: window.location.href
        });
      });
    });
  }

  /**
   * 建立效能觀察器
   */
  private createObserver(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Failed to create observer for ${type}:`, error);
    }
  }

  /**
   * 記錄效能指標
   */
  private recordMetric(
    name: string,
    value: number,
    metadata: { url?: string } = {}
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: metadata.url || window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType()
    };

    this.metrics.push(metric);

    // 檢查是否超過閾值
    this.checkThresholds(metric);

    // 限制記錄數量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * 取得連線類型
   */
  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  /**
   * 取得資源類型
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(js)$/)) return 'script';
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * 檢查效能閾值
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const thresholdMap: Record<string, keyof PerformanceThresholds> = {
      'FCP': 'fcp',
      'LCP': 'lcp',
      'FID': 'fid',
      'CLS': 'cls',
      'TTFB': 'ttfb'
    };

    const thresholdKey = thresholdMap[metric.name];
    if (thresholdKey && metric.value > this.thresholds[thresholdKey]) {
      console.warn(`Performance threshold exceeded: ${metric.name} = ${metric.value}ms (threshold: ${this.thresholds[thresholdKey]}ms)`);
      
      // 發送警告到監控系統
      this.sendAlert(metric);
    }
  }

  /**
   * 發送效能警告
   */
  private sendAlert(metric: PerformanceMetric): void {
    // 這裡可以整合外部監控服務
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_issue', {
        metric_name: metric.name,
        metric_value: metric.value,
        page_url: metric.url
      });
    }
  }

  /**
   * 開始監控
   */
  private startMonitoring(): void {
    // 定期收集記憶體使用情況
    setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        this.recordMetric('Memory_Used', memory.usedJSHeapSize);
        this.recordMetric('Memory_Total', memory.totalJSHeapSize);
      }
    }, 30000); // 每 30 秒

    // 監控頁面可見性變化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.recordMetric('Page_Visible', performance.now());
      } else {
        this.recordMetric('Page_Hidden', performance.now());
      }
    });
  }

  /**
   * 取得效能報告
   */
  getPerformanceReport(): PerformanceReport {
    const fcpMetrics = this.metrics.filter(m => m.name === 'FCP');
    const lcpMetrics = this.metrics.filter(m => m.name === 'LCP');
    const fidMetrics = this.metrics.filter(m => m.name === 'FID');
    const clsMetrics = this.metrics.filter(m => m.name === 'CLS');
    const ttfbMetrics = this.metrics.filter(m => m.name === 'TTFB');

    const summary = {
      averageFCP: this.calculateAverage(fcpMetrics),
      averageLCP: this.calculateAverage(lcpMetrics),
      averageFID: this.calculateAverage(fidMetrics),
      averageCLS: this.calculateAverage(clsMetrics),
      averageTTFB: this.calculateAverage(ttfbMetrics)
    };

    const issues = this.identifyIssues(summary);
    const recommendations = this.generateRecommendations(issues);

    return {
      metrics: this.metrics,
      summary,
      issues,
      recommendations
    };
  }

  /**
   * 計算平均值
   */
  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  /**
   * 識別效能問題
   */
  private identifyIssues(summary: PerformanceReport['summary']): string[] {
    const issues: string[] = [];

    if (summary.averageFCP > this.thresholds.fcp) {
      issues.push(`First Contentful Paint 過慢 (${summary.averageFCP.toFixed(0)}ms)`);
    }

    if (summary.averageLCP > this.thresholds.lcp) {
      issues.push(`Largest Contentful Paint 過慢 (${summary.averageLCP.toFixed(0)}ms)`);
    }

    if (summary.averageFID > this.thresholds.fid) {
      issues.push(`First Input Delay 過長 (${summary.averageFID.toFixed(0)}ms)`);
    }

    if (summary.averageCLS > this.thresholds.cls) {
      issues.push(`Cumulative Layout Shift 過高 (${summary.averageCLS.toFixed(3)})`);
    }

    if (summary.averageTTFB > this.thresholds.ttfb) {
      issues.push(`Time to First Byte 過長 (${summary.averageTTFB.toFixed(0)}ms)`);
    }

    return issues;
  }

  /**
   * 產生優化建議
   */
  private generateRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];

    issues.forEach(issue => {
      if (issue.includes('First Contentful Paint')) {
        recommendations.push('優化關鍵渲染路徑，減少阻塞資源');
        recommendations.push('使用字體顯示策略，避免不可見文字閃爍');
      }

      if (issue.includes('Largest Contentful Paint')) {
        recommendations.push('優化圖片載入，使用適當的圖片格式和尺寸');
        recommendations.push('預載入關鍵資源');
      }

      if (issue.includes('First Input Delay')) {
        recommendations.push('減少 JavaScript 執行時間');
        recommendations.push('使用 Web Workers 處理複雜計算');
      }

      if (issue.includes('Cumulative Layout Shift')) {
        recommendations.push('為圖片和廣告設定明確的尺寸');
        recommendations.push('避免在現有內容上方插入內容');
      }

      if (issue.includes('Time to First Byte')) {
        recommendations.push('優化伺服器回應時間');
        recommendations.push('使用 CDN 加速內容傳遞');
      }
    });

    return Array.from(new Set(recommendations)); // 去除重複建議
  }

  /**
   * 匯出效能資料
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      report: this.getPerformanceReport()
    }, null, 2);
  }

  /**
   * 清除效能資料
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 停止監控
   */
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// 效能預算管理
export class PerformanceBudget {
  private budgets = {
    totalPageSize: 1500, // KB
    totalRequests: 50,
    jsSize: 500, // KB
    cssSize: 100, // KB
    imageSize: 800, // KB
    fontSize: 100 // KB
  };

  /**
   * 檢查效能預算
   */
  checkBudget(): Promise<{ passed: boolean; violations: string[] }> {
    return new Promise((resolve) => {
      const violations: string[] = [];

      // 檢查資源大小
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let imageSize = 0;
      let fontSize = 0;

      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        totalSize += size;

        if (resource.name.endsWith('.js')) jsSize += size;
        else if (resource.name.endsWith('.css')) cssSize += size;
        else if (resource.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) imageSize += size;
        else if (resource.name.match(/\.(woff|woff2|ttf|otf)$/)) fontSize += size;
      });

      // 轉換為 KB
      totalSize = Math.round(totalSize / 1024);
      jsSize = Math.round(jsSize / 1024);
      cssSize = Math.round(cssSize / 1024);
      imageSize = Math.round(imageSize / 1024);
      fontSize = Math.round(fontSize / 1024);

      // 檢查預算違規
      if (totalSize > this.budgets.totalPageSize) {
        violations.push(`總頁面大小超出預算: ${totalSize}KB > ${this.budgets.totalPageSize}KB`);
      }

      if (resources.length > this.budgets.totalRequests) {
        violations.push(`總請求數超出預算: ${resources.length} > ${this.budgets.totalRequests}`);
      }

      if (jsSize > this.budgets.jsSize) {
        violations.push(`JavaScript 大小超出預算: ${jsSize}KB > ${this.budgets.jsSize}KB`);
      }

      if (cssSize > this.budgets.cssSize) {
        violations.push(`CSS 大小超出預算: ${cssSize}KB > ${this.budgets.cssSize}KB`);
      }

      if (imageSize > this.budgets.imageSize) {
        violations.push(`圖片大小超出預算: ${imageSize}KB > ${this.budgets.imageSize}KB`);
      }

      if (fontSize > this.budgets.fontSize) {
        violations.push(`字體大小超出預算: ${fontSize}KB > ${this.budgets.fontSize}KB`);
      }

      resolve({
        passed: violations.length === 0,
        violations
      });
    });
  }
}

// 建立全域效能監控器實例
export const performanceMonitor = new PerformanceMonitor();
export const performanceBudget = new PerformanceBudget();

// React Hook for performance monitoring
export function usePerformanceMonitoring() {
  const getReport = () => performanceMonitor.getPerformanceReport();
  const exportData = () => performanceMonitor.exportMetrics();
  const checkBudget = () => performanceBudget.checkBudget();

  return {
    getReport,
    exportData,
    checkBudget
  };
}

export default PerformanceMonitor;