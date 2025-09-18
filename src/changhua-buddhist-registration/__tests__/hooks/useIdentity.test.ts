import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdentity, useIdentityGuard, useIdentityLabels } from '@/hooks/useIdentity';
import { STORAGE_KEYS, USER_IDENTITY } from '@/utils/constants';

// Mock storage helper
jest.mock('@/utils/helpers', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock window events
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

describe('useIdentity Hook', () => {
  const mockStorage = require('@/utils/helpers').storage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.get.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useIdentity());

      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.identity).toBe(null);
      expect(result.current.isFirstVisit).toBe(true);
      expect(result.current.hasSelectedIdentity).toBe(false);
    });

    it('should load existing identity from storage', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK) // userIdentity
        .mockReturnValueOnce(true); // hasVisitedBefore

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.identity).toBe(USER_IDENTITY.MONK);
      expect(result.current.isFirstVisit).toBe(false);
      expect(result.current.hasSelectedIdentity).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.identity).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Error initializing identity:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('setIdentity', () => {
    it('should set monk identity successfully', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setIdentity(USER_IDENTITY.MONK);
      });

      expect(mockStorage.set).toHaveBeenCalledWith(STORAGE_KEYS.USER_IDENTITY, USER_IDENTITY.MONK);
      expect(mockStorage.set).toHaveBeenCalledWith('hasVisitedBefore', true);
      expect(result.current.identity).toBe(USER_IDENTITY.MONK);
      expect(result.current.hasSelectedIdentity).toBe(true);
      expect(result.current.isFirstVisit).toBe(false);
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'identityChanged',
          detail: { identity: USER_IDENTITY.MONK }
        })
      );
    });

    it('should set volunteer identity successfully', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setIdentity(USER_IDENTITY.VOLUNTEER);
      });

      expect(mockStorage.set).toHaveBeenCalledWith(STORAGE_KEYS.USER_IDENTITY, USER_IDENTITY.VOLUNTEER);
      expect(result.current.identity).toBe(USER_IDENTITY.VOLUNTEER);
      expect(result.current.hasSelectedIdentity).toBe(true);
    });

    it('should reject invalid identity values', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.setIdentity('invalid' as any);
        })
      ).rejects.toThrow('Invalid identity value');
    });

    it('should handle storage errors during setIdentity', async () => {
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.setIdentity(USER_IDENTITY.MONK);
        })
      ).rejects.toThrow('Storage error');

      expect(consoleSpy).toHaveBeenCalledWith('Error setting identity:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('clearIdentity', () => {
    it('should clear identity successfully', async () => {
      // 先設定身份
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.identity).toBe(USER_IDENTITY.MONK);
      });

      act(() => {
        result.current.clearIdentity();
      });

      expect(mockStorage.remove).toHaveBeenCalledWith(STORAGE_KEYS.USER_IDENTITY);
      expect(result.current.identity).toBe(null);
      expect(result.current.hasSelectedIdentity).toBe(false);
      expect(result.current.isFirstVisit).toBe(false); // 保持已訪問狀態
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'identityChanged',
          detail: { identity: null }
        })
      );
    });

    it('should handle storage errors during clearIdentity', () => {
      mockStorage.remove.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useIdentity());

      act(() => {
        result.current.clearIdentity();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error clearing identity:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('switchIdentity', () => {
    it('should switch from monk to volunteer', async () => {
      // 初始設定為法師
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.identity).toBe(USER_IDENTITY.MONK);
      });

      await act(async () => {
        await result.current.switchIdentity(USER_IDENTITY.VOLUNTEER);
      });

      expect(result.current.identity).toBe(USER_IDENTITY.VOLUNTEER);
    });

    it('should not switch if identity is the same', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.identity).toBe(USER_IDENTITY.MONK);
      });

      const setIdentitySpy = jest.spyOn(result.current, 'setIdentity');

      await act(async () => {
        await result.current.switchIdentity(USER_IDENTITY.MONK);
      });

      expect(setIdentitySpy).not.toHaveBeenCalled();
    });
  });

  describe('refreshIdentity', () => {
    it('should refresh identity from storage', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 模擬外部更改儲存
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.VOLUNTEER)
        .mockReturnValueOnce(true);

      act(() => {
        result.current.refreshIdentity();
      });

      await waitFor(() => {
        expect(result.current.identity).toBe(USER_IDENTITY.VOLUNTEER);
      });
    });
  });

  describe('Storage Event Listener', () => {
    it('should respond to storage changes', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 模擬 storage 事件
      const storageEvent = new StorageEvent('storage', {
        key: STORAGE_KEYS.USER_IDENTITY,
        newValue: JSON.stringify(USER_IDENTITY.VOLUNTEER),
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.identity).toBe(USER_IDENTITY.VOLUNTEER);
      expect(result.current.hasSelectedIdentity).toBe(true);
    });

    it('should handle storage event with null value', async () => {
      // 先設定身份
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.identity).toBe(USER_IDENTITY.MONK);
      });

      // 模擬清除身份的 storage 事件
      const storageEvent = new StorageEvent('storage', {
        key: STORAGE_KEYS.USER_IDENTITY,
        newValue: null,
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.identity).toBe(null);
      expect(result.current.hasSelectedIdentity).toBe(false);
    });
  });
});

describe('useIdentityGuard Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.get.mockReturnValue(null);
    
    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('should redirect when no identity is selected', async () => {
    const { result } = renderHook(() => useIdentityGuard('/identity'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/identity');
    });
  });

  it('should not redirect when identity is selected', async () => {
    mockStorage.get
      .mockReturnValueOnce(USER_IDENTITY.MONK)
      .mockReturnValueOnce(true);

    const { result } = renderHook(() => useIdentityGuard('/identity'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasSelectedIdentity).toBe(true);
    expect(result.current.isReady).toBe(true);
    expect(window.location.href).toBe('');
  });
});

describe('useIdentityLabels Hook', () => {
  it('should return correct labels for monk identity', () => {
    const { result } = renderHook(() => useIdentityLabels(USER_IDENTITY.MONK));

    expect(result.current.label).toBe('法師');
    expect(result.current.description).toBe('寺院法師報名');
    expect(result.current.icon).toBe('🙏');
    expect(result.current.color).toBe('var(--primary-color)');
  });

  it('should return correct labels for volunteer identity', () => {
    const { result } = renderHook(() => useIdentityLabels(USER_IDENTITY.VOLUNTEER));

    expect(result.current.label).toBe('志工');
    expect(result.current.description).toBe('護持志工報名');
    expect(result.current.icon).toBe('🤝');
    expect(result.current.color).toBe('var(--secondary-color)');
  });

  it('should return default labels for null identity', () => {
    const { result } = renderHook(() => useIdentityLabels(null));

    expect(result.current.label).toBe('未選擇');
    expect(result.current.description).toBe('請選擇身份類型');
    expect(result.current.icon).toBe('👤');
    expect(result.current.color).toBe('var(--text-secondary)');
  });

  it('should provide helper functions', () => {
    const { result } = renderHook(() => useIdentityLabels(null));

    expect(result.current.getIdentityLabel(USER_IDENTITY.MONK)).toBe('法師');
    expect(result.current.getIdentityDescription(USER_IDENTITY.VOLUNTEER)).toBe('護持志工報名');
    expect(result.current.getIdentityIcon(USER_IDENTITY.MONK)).toBe('🙏');
    expect(result.current.getIdentityColor(USER_IDENTITY.VOLUNTEER)).toBe('var(--secondary-color)');
  });
});