/**
 * CDN 優化和靜態資源部署系統
 * 提供資源優化、快取策略和 CDN 配置
 */

interface CDNConfig {
  baseUrl: string;
  regions: string[];
  cacheHeaders: Record<string, string>;
  compressionEnabled: boolean;
  imageOptimization: boolean;
}

interface AssetManifest {
  [key: string]: {
    url: string;
    hash: string;
    size: number;
    type: 'js' | 'css' | 'image' | 'font' | 'other';
    critical: boolean;
  };
}

class CDNOptimizer {
  private config: CDNConfig;
  private assetManifest: AssetManifest = {};

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * 產生 CDN URL
   */
  getCDNUrl(assetPath: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}): string {
    const { width, height, quality = 80, format } = options;
    let url = `${this.config.baseUrl}${assetPath}`;

    // 圖片優化參數
    if (this.config.imageOptimization && this.isImageAsset(assetPath)) {
      const params = new URLSearchParams();
      
      if (width) params.set('w', width.toString());
      if (height) params.set('h', height.toString());
      if (quality !== 80) params.set('q', quality.toString());
      if (format) params.set('f', format);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return url;
  }

  /**
   * 檢查是否為圖片資源
   */
  private isImageAsset(path: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    return imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
  }

  /**
   * 產生響應式圖片 srcset
   */
  generateResponsiveImageSrcSet(
    imagePath: string,
    sizes: number[] = [320, 640, 768, 1024, 1280, 1920]
  ): string {
    return sizes
      .map(size => `${this.getCDNUrl(imagePath, { width: size })} ${size}w`)
      .join(', ');
  }

  /**
   * 預載入關鍵資源
   */
  preloadCriticalAssets(): void {
    if (typeof document === 'undefined') return;

    const criticalAssets = Object.entries(this.assetManifest)
      .filter(([_, asset]) => asset.critical)
      .slice(0, 5); // 限制預載入數量

    criticalAssets.forEach(([path, asset]) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      
      switch (asset.type) {
        case 'js':
          link.as = 'script';
          break;
        case 'css':
          link.as = 'style';
          break;
        case 'image':
          link.as = 'image';
          break;
        case 'font':
          link.as = 'font';
          link.crossOrigin = 'anonymous';
          break;
      }
      
      link.href = this.getCDNUrl(asset.url);
      document.head.appendChild(link);
    });
  }

  /**
   * 設定資源快取標頭
   */
  getCacheHeaders(assetType: string): Record<string, string> {
    const baseHeaders = {
      'Cache-Control': 'public, max-age=31536000', // 1 year
      'Vary': 'Accept-Encoding'
    };

    switch (assetType) {
      case 'js':
      case 'css':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=31536000, immutable'
        };
      
      case 'image':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=2592000' // 30 days
        };
      
      case 'font':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*'
        };
      
      case 'html':
        return {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'Vary': 'Accept-Encoding'
        };
      
      default:
        return baseHeaders;
    }
  }

  /**
   * 產生 Service Worker 快取策略
   */
  generateServiceWorkerCacheStrategy(): string {
    return `
// CDN 資源快取策略
const CDN_CACHE_NAME = 'cdn-assets-v1';
const CDN_BASE_URL = '${this.config.baseUrl}';

// 快取策略
const cacheStrategies = {
  // 靜態資源：快取優先
  staticAssets: {
    urlPattern: new RegExp(\`^\${CDN_BASE_URL}.*\\.(js|css|png|jpg|jpeg|webp|gif|svg|woff|woff2)$\`),
    strategy: 'CacheFirst',
    cacheName: CDN_CACHE_NAME,
    options: {
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      }
    }
  },
  
  // API 回應：網路優先
  apiResponses: {
    urlPattern: new RegExp('/api/'),
    strategy: 'NetworkFirst',
    cacheName: 'api-cache-v1',
    options: {
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 minutes
      }
    }
  }
};

// 註冊快取策略
Object.values(cacheStrategies).forEach(strategy => {
  registerRoute(
    strategy.urlPattern,
    new strategy.strategy(strategy.options)
  );
});
`;
  }

  /**
   * 優化資源載入順序
   */
  optimizeResourceLoading(): void {
    if (typeof document === 'undefined') return;

    // 預連接到 CDN
    this.addPreconnectLink(this.config.baseUrl);

    // 預載入關鍵字體
    this.preloadCriticalFonts();

    // 延遲載入非關鍵 CSS
    this.loadNonCriticalCSS();
  }

  /**
   * 加入預連接連結
   */
  private addPreconnectLink(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    document.head.appendChild(link);
  }

  /**
   * 預載入關鍵字體
   */
  private preloadCriticalFonts(): void {
    const criticalFonts = [
      '/fonts/noto-sans-tc-regular.woff2',
      '/fonts/noto-sans-tc-bold.woff2'
    ];

    criticalFonts.forEach(fontPath => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = this.getCDNUrl(fontPath);
      document.head.appendChild(link);
    });
  }

  /**
   * 延遲載入非關鍵 CSS
   */
  private loadNonCriticalCSS(): void {
    const nonCriticalCSS = [
      '/css/animations.css',
      '/css/print.css'
    ];

    nonCriticalCSS.forEach(cssPath => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = this.getCDNUrl(cssPath);
      link.onload = () => {
        link.rel = 'stylesheet';
      };
      document.head.appendChild(link);
    });
  }

  /**
   * 產生資源清單
   */
  generateAssetManifest(assets: string[]): AssetManifest {
    const manifest: AssetManifest = {};

    assets.forEach(asset => {
      const type = this.getAssetType(asset);
      const hash = this.generateAssetHash(asset);
      
      manifest[asset] = {
        url: asset,
        hash,
        size: 0, // 實際應該計算檔案大小
        type,
        critical: this.isCriticalAsset(asset, type)
      };
    });

    this.assetManifest = manifest;
    return manifest;
  }

  /**
   * 取得資源類型
   */
  private getAssetType(path: string): AssetManifest[string]['type'] {
    if (path.endsWith('.js')) return 'js';
    if (path.endsWith('.css')) return 'css';
    if (this.isImageAsset(path)) return 'image';
    if (path.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    return 'other';
  }

  /**
   * 產生資源雜湊值
   */
  private generateAssetHash(asset: string): string {
    // 簡化的雜湊產生，實際應該使用檔案內容
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * 判斷是否為關鍵資源
   */
  private isCriticalAsset(path: string, type: AssetManifest[string]['type']): boolean {
    const criticalPatterns = [
      /\/css\/globals\.css$/,
      /\/css\/critical\.css$/,
      /\/js\/app\.js$/,
      /\/js\/vendor\.js$/,
      /\/fonts\/.*\.(woff|woff2)$/
    ];

    return criticalPatterns.some(pattern => pattern.test(path));
  }

  /**
   * 取得效能指標
   */
  getPerformanceMetrics(): Record<string, number> {
    if (typeof window === 'undefined' || !window.performance) {
      return {};
    }

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = window.performance.getEntriesByType('paint');

    return {
      // 載入時間
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      
      // 渲染時間
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      
      // 網路時間
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      serverResponse: navigation.responseEnd - navigation.requestStart
    };
  }
}

// Netlify 特定的 CDN 配置
export const netlifyConfig: CDNConfig = {
  baseUrl: 'https://your-site.netlify.app',
  regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  cacheHeaders: {
    '/*.js': 'public, max-age=31536000, immutable',
    '/*.css': 'public, max-age=31536000, immutable',
    '/*.png': 'public, max-age=2592000',
    '/*.jpg': 'public, max-age=2592000',
    '/*.webp': 'public, max-age=2592000'
  },
  compressionEnabled: true,
  imageOptimization: true
};

// 建立 CDN 優化器實例
export const cdnOptimizer = new CDNOptimizer(netlifyConfig);

// Netlify 部署配置產生器
export function generateNetlifyConfig(): string {
  return `
# Netlify 部署配置
[build]
  command = "npm run build"
  publish = ".next"

# 重定向規則
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# 標頭設定
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    
[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    
[[headers]]
  for = "/*.png"
  [headers.values]
    Cache-Control = "public, max-age=2592000"
    
[[headers]]
  for = "/*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=2592000"

# 壓縮設定
[build.processing]
  skip_processing = false
[build.processing.css]
  bundle = true
  minify = true
[build.processing.js]
  bundle = true
  minify = true
[build.processing.html]
  pretty_urls = true
[build.processing.images]
  compress = true
`;
}

export default CDNOptimizer;