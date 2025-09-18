/**
 * LIFF 整合測試
 * 測試 LIFF 服務的基本功能
 */

import { jest } from '@jest/globals';

// Mock LIFF SDK
const mockLiff = {
  init: jest.fn(),
  isLoggedIn: jest.fn(),
  login: jest.fn(),
  getProfile: jest.fn(),
  getPermissionGrantedAll: jest.fn(),
  requestPermissionGrantedAll: jest.fn(),
  getAccessToken: jest.fn(),
  logout: jest.fn(),
  isInClient: jest.fn(),
  closeWindow: jest.fn(),
};

jest.mock('@line/liff', () => mockLiff);

describe('LIFF 整合測試', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_LIFF_ID = 'test-liff-id-123';
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('基本功能測試', () => {
    it('應該能夠導入 LIFF 服務', async () => {
      // 動態導入以避免模組載入問題
      const { initializeLiff } = await import('../services/liff');
      
      expect(initializeLiff).toBeDefined();
      expect(typeof initializeLiff).toBe('function');
    });

    it('應該能夠導入 useLiff Hook', async () => {
      const { useLiff } = await import('../hooks/useLiff');
      
      expect(useLiff).toBeDefined();
      expect(typeof useLiff).toBe('function');
    });

    it('應該正確設定 LIFF SDK mock', () => {
      expect(mockLiff.init).toBeDefined();
      expect(mockLiff.isLoggedIn).toBeDefined();
      expect(mockLiff.getProfile).toBeDefined();
    });

    it('應該能夠處理環境變數', () => {
      expect(process.env.NEXT_PUBLIC_LIFF_ID).toBe('test-liff-id-123');
    });

    it('應該能夠呼叫 LIFF 初始化函數', async () => {
      const { initializeLiff } = await import('../services/liff');
      
      // 設定 mock 回傳值
      mockLiff.init.mockResolvedValue(undefined);
      mockLiff.isLoggedIn.mockReturnValue(false);

      // 呼叫函數
      const result = await initializeLiff();

      // 驗證結果存在
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理缺少 LIFF_ID 的情況', async () => {
      // 移除環境變數
      const originalLiffId = process.env.NEXT_PUBLIC_LIFF_ID;
      delete process.env.NEXT_PUBLIC_LIFF_ID;
      
      // 清除模組快取以確保重新載入
      jest.resetModules();
      
      const { initializeLiff } = await import('../services/liff');
      const result = await initializeLiff();

      expect(result.success).toBe(false);
      expect(result.message).toContain('LIFF_ID');
      
      // 恢復環境變數
      process.env.NEXT_PUBLIC_LIFF_ID = originalLiffId;
    });

    it('應該處理 LIFF 初始化錯誤', async () => {
      mockLiff.init.mockRejectedValue(new Error('Test error'));
      
      const { initializeLiff } = await import('../services/liff');
      const result = await initializeLiff();

      expect(result.success).toBe(false);
      expect(result.message).toContain('LIFF 初始化失敗');
    });
  });
});