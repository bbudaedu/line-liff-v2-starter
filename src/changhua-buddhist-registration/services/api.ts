import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';
import { getEnvVar, formatErrorMessage, retry } from '@/utils/helpers';
import { ENV_KEYS, RETRY_CONFIG, ERROR_MESSAGES } from '@/utils/constants';

/**
 * API 客戶端類別
 */
class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = getEnvVar(ENV_KEYS.API_BASE_URL, 'http://localhost:3001');
    
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 設定請求和回應攔截器
   */
  private setupInterceptors(): void {
    // 請求攔截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加認證 token（如果存在）
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加請求時間戳
        (config as any).metadata = { startTime: new Date() };
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // 回應攔截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const duration = new Date().getTime() - (response.config as any).metadata?.startTime?.getTime();
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
        
        return response;
      },
      (error) => {
        const duration = (error.config as any)?.metadata?.startTime 
          ? new Date().getTime() - (error.config as any).metadata.startTime.getTime()
          : 0;
        
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`, error);
        
        // 處理特定錯誤狀態
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * 取得存取權杖
   */
  private getAccessToken(): string | null {
    try {
      // 從 LIFF 取得 access token（將在後續任務中實作）
      return localStorage.getItem('liffAccessToken');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * 處理未授權錯誤
   */
  private handleUnauthorized(): void {
    // 清除本地儲存的認證資訊
    localStorage.removeItem('liffAccessToken');
    localStorage.removeItem('userProfile');
    
    // 重新導向到登入頁面或重新初始化 LIFF
    console.warn('Unauthorized access, clearing auth data');
  }

  /**
   * 格式化錯誤回應
   */
  private formatError(error: any): Error {
    const message = formatErrorMessage(error);
    const formattedError = new Error(message);
    
    // 保留原始錯誤資訊
    (formattedError as any).originalError = error;
    (formattedError as any).status = error.response?.status;
    (formattedError as any).code = error.response?.data?.code || error.code;
    
    return formattedError;
  }

  /**
   * 通用 GET 請求
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await retry(
      () => this.instance.get<ApiResponse<T>>(url, config),
      RETRY_CONFIG.MAX_RETRIES,
      RETRY_CONFIG.RETRY_DELAY
    );
    return response.data;
  }

  /**
   * 通用 POST 請求
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * 通用 PUT 請求
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * 通用 DELETE 請求
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * 檔案上傳請求
   */
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.instance.post<ApiResponse<T>>(url, formData, config);
    return response.data;
  }

  /**
   * 設定認證 token
   */
  setAuthToken(token: string): void {
    localStorage.setItem('liffAccessToken', token);
  }

  /**
   * 清除認證 token
   */
  clearAuthToken(): void {
    localStorage.removeItem('liffAccessToken');
  }

  /**
   * 檢查網路連線狀態
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 取得 API 基礎 URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// 建立全域 API 客戶端實例
export const apiClient = new ApiClient();

/**
 * API 錯誤處理工具
 */
export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  // 網路連線錯誤
  if (!navigator.onLine) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // HTTP 狀態碼錯誤
  if (error.status) {
    switch (error.status) {
      case 400:
        return error.message || '請求參數錯誤';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.FORBIDDEN;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 500:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return error.message || ERROR_MESSAGES.SYSTEM_ERROR;
    }
  }
  
  // 網路錯誤
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // 超時錯誤
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return '請求超時，請稍後再試';
  }
  
  return formatErrorMessage(error);
};

/**
 * 建立帶有載入狀態的 API 呼叫包裝器
 */
export const withLoading = async <T>(
  apiCall: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  setError?: (error: string | null) => void
): Promise<T | null> => {
  try {
    setLoading(true);
    setError?.(null);
    
    const result = await apiCall();
    return result;
  } catch (error) {
    const errorMessage = handleApiError(error);
    setError?.(errorMessage);
    return null;
  } finally {
    setLoading(false);
  }
};

export default apiClient;