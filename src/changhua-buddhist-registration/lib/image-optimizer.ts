/**
 * 圖片優化系統
 * 提供圖片壓縮、格式轉換和懶載入功能
 */

interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
  enableLazyLoading?: boolean;
}

interface OptimizedImage {
  src: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

class ImageOptimizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private observer: IntersectionObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.initLazyLoadingObserver();
    }
  }

  /**
   * 優化圖片
   */
  async optimizeImage(
    file: File | string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const {
      quality = 0.8,
      maxWidth = 1200,
      maxHeight = 800,
      format = 'webp'
    } = options;

    const img = await this.loadImage(file);
    const { width, height } = this.calculateDimensions(img, maxWidth, maxHeight);

    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available');
    }

    this.canvas.width = width;
    this.canvas.height = height;

    // 清除畫布
    this.ctx.clearRect(0, 0, width, height);

    // 繪製優化後的圖片
    this.ctx.drawImage(img, 0, 0, width, height);

    // 轉換為指定格式
    const mimeType = `image/${format}`;
    const dataUrl = this.canvas.toDataURL(mimeType, quality);

    return {
      src: dataUrl,
      width,
      height,
      format,
      size: this.estimateSize(dataUrl)
    };
  }

  /**
   * 載入圖片
   */
  private loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = reject;

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(source);
      }
    });
  }

  /**
   * 計算優化後的尺寸
   */
  private calculateDimensions(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = img;

    // 計算縮放比例
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio, 1);

    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    };
  }

  /**
   * 估算圖片大小
   */
  private estimateSize(dataUrl: string): number {
    // Base64 編碼大約增加 33% 的大小
    const base64Length = dataUrl.split(',')[1]?.length || 0;
    return Math.round(base64Length * 0.75);
  }

  /**
   * 初始化懶載入觀察器
   */
  private initLazyLoadingObserver(): void {
    if (!('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadLazyImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );
  }

  /**
   * 載入懶載入圖片
   */
  private loadLazyImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
    }
  }

  /**
   * 啟用圖片懶載入
   */
  enableLazyLoading(selector: string = 'img[data-src]'): void {
    if (!this.observer) {
      return;
    }

    const images = document.querySelectorAll(selector);
    images.forEach((img) => {
      img.classList.add('lazy-loading');
      this.observer?.observe(img);
    });
  }

  /**
   * 預載入關鍵圖片
   */
  preloadCriticalImages(urls: string[]): Promise<void[]> {
    const promises = urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
    });

    return Promise.all(promises);
  }

  /**
   * 產生響應式圖片 srcset
   */
  generateSrcSet(baseUrl: string, sizes: number[]): string {
    return sizes
      .map((size) => `${baseUrl}?w=${size} ${size}w`)
      .join(', ');
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// 建立全域圖片優化器實例
export const imageOptimizer = new ImageOptimizer();

// React Hook for image optimization
export function useImageOptimization() {
  const optimizeImage = async (
    file: File,
    options?: ImageOptimizationOptions
  ): Promise<OptimizedImage> => {
    return imageOptimizer.optimizeImage(file, options);
  };

  const enableLazyLoading = (selector?: string) => {
    imageOptimizer.enableLazyLoading(selector);
  };

  return {
    optimizeImage,
    enableLazyLoading
  };
}

// 靜態資源優化工具
export class StaticResourceOptimizer {
  private resourceCache = new Map<string, string>();

  /**
   * 預載入 CSS
   */
  preloadCSS(href: string): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  }

  /**
   * 預載入 JavaScript
   */
  preloadJS(src: string): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  }

  /**
   * 預連接到外部域名
   */
  preconnect(origin: string): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);
  }

  /**
   * DNS 預解析
   */
  dnsPrefetch(origin: string): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = origin;
    document.head.appendChild(link);
  }

  /**
   * 設定資源提示
   */
  setupResourceHints(): void {
    // 預連接到常用的外部服務
    this.preconnect('https://api.line.me');
    this.preconnect('https://your-pretix-instance.com');
    
    // DNS 預解析
    this.dnsPrefetch('https://fonts.googleapis.com');
    this.dnsPrefetch('https://fonts.gstatic.com');
  }
}

export const staticResourceOptimizer = new StaticResourceOptimizer();

export default ImageOptimizer;