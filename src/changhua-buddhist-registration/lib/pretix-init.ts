import { PretixClient, initializePretixClient } from '../services/pretix';
import { RegistrationService, initializeRegistrationService } from '../services/registration';
import { getPretixConfig, validatePretixConfig } from '../config/pretix';

// 全域服務實例
let pretixClient: PretixClient | null = null;
let registrationService: RegistrationService | null = null;
let isInitialized = false;

/**
 * 初始化 Pretix 服務
 */
export async function initializePretixServices(): Promise<{
  pretixClient: PretixClient;
  registrationService: RegistrationService;
}> {
  if (isInitialized && pretixClient && registrationService) {
    return { pretixClient, registrationService };
  }

  try {
    // 獲取配置
    const config = getPretixConfig();
    
    // 驗證配置
    const validation = validatePretixConfig(config);
    if (!validation.isValid) {
      throw new Error(`Pretix configuration invalid: ${validation.errors.join(', ')}`);
    }

    // 初始化 Pretix 客戶端
    pretixClient = initializePretixClient(config);
    
    // 測試連線
    const isHealthy = await pretixClient.healthCheck();
    if (!isHealthy) {
      console.warn('Pretix service health check failed, but continuing with initialization');
    }

    // 初始化註冊服務
    registrationService = initializeRegistrationService(pretixClient);

    isInitialized = true;

    console.log('Pretix services initialized successfully');
    return { pretixClient, registrationService };
  } catch (error) {
    console.error('Failed to initialize Pretix services:', error);
    throw error;
  }
}

/**
 * 獲取已初始化的 Pretix 客戶端
 */
export function getPretixClient(): PretixClient {
  if (!pretixClient) {
    throw new Error('Pretix client not initialized. Call initializePretixServices first.');
  }
  return pretixClient;
}

/**
 * 獲取已初始化的註冊服務
 */
export function getRegistrationService(): RegistrationService {
  if (!registrationService) {
    throw new Error('Registration service not initialized. Call initializePretixServices first.');
  }
  return registrationService;
}

/**
 * 檢查服務是否已初始化
 */
export function isServicesInitialized(): boolean {
  return isInitialized && pretixClient !== null && registrationService !== null;
}

/**
 * 重新初始化服務（用於配置更新後）
 */
export async function reinitializePretixServices(): Promise<{
  pretixClient: PretixClient;
  registrationService: RegistrationService;
}> {
  // 清除現有實例
  pretixClient = null;
  registrationService = null;
  isInitialized = false;

  // 重新初始化
  return await initializePretixServices();
}

/**
 * 清理服務資源
 */
export function cleanupPretixServices(): void {
  if (pretixClient) {
    pretixClient.clearCache();
  }
  
  pretixClient = null;
  registrationService = null;
  isInitialized = false;
  
  console.log('Pretix services cleaned up');
}

/**
 * 獲取服務健康狀態
 */
export async function getServicesHealthStatus(): Promise<{
  initialized: boolean;
  pretixHealthy: boolean;
  registrationServiceHealthy: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let pretixHealthy = false;
  let registrationServiceHealthy = false;

  try {
    if (!isInitialized) {
      errors.push('Services not initialized');
    } else {
      // 檢查 Pretix 客戶端健康狀態
      if (pretixClient) {
        pretixHealthy = await pretixClient.healthCheck();
        if (!pretixHealthy) {
          errors.push('Pretix service unhealthy');
        }
      } else {
        errors.push('Pretix client not available');
      }

      // 檢查註冊服務健康狀態
      if (registrationService) {
        const healthStatus = await registrationService.getHealthStatus();
        registrationServiceHealthy = healthStatus.healthy;
        if (!registrationServiceHealthy && healthStatus.message) {
          errors.push(healthStatus.message);
        }
      } else {
        errors.push('Registration service not available');
      }
    }
  } catch (error) {
    errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    initialized: isInitialized,
    pretixHealthy,
    registrationServiceHealthy,
    errors
  };
}

/**
 * 獲取服務統計資訊
 */
export function getServicesStats(): {
  initialized: boolean;
  cacheStats?: { size: number; keys: string[] };
  uptime?: number;
} {
  const stats: any = {
    initialized: isInitialized
  };

  if (pretixClient) {
    stats.cacheStats = pretixClient.getCacheStats();
  }

  // 可以添加更多統計資訊，如啟動時間等
  
  return stats;
}

/**
 * 用於測試的服務初始化（使用測試配置）
 */
export async function initializePretixServicesForTesting(testConfig?: any): Promise<{
  pretixClient: PretixClient;
  registrationService: RegistrationService;
}> {
  const config = testConfig || {
    baseURL: 'https://test.pretix.eu/api/v1',
    apiToken: 'test-token',
    organizerSlug: 'test-organizer'
  };

  pretixClient = new PretixClient(config);
  registrationService = new RegistrationService(pretixClient);
  isInitialized = true;

  return { pretixClient, registrationService };
}

// 自動初始化（在非測試環境中）
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // 在瀏覽器環境中延遲初始化
  setTimeout(() => {
    initializePretixServices().catch(error => {
      console.error('Auto-initialization of Pretix services failed:', error);
    });
  }, 1000);
} else if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // 在 Node.js 環境中立即初始化
  initializePretixServices().catch(error => {
    console.error('Auto-initialization of Pretix services failed:', error);
  });
}

export default {
  initializePretixServices,
  getPretixClient,
  getRegistrationService,
  isServicesInitialized,
  reinitializePretixServices,
  cleanupPretixServices,
  getServicesHealthStatus,
  getServicesStats,
  initializePretixServicesForTesting
};