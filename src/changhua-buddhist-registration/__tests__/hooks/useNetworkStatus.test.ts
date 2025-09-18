import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock navigator.connection
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    type: 'wifi',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Reset navigator.onLine to true
    (navigator as any).onLine = true;
    
    // Reset connection mock
    (navigator as any).connection = {
      effectiveType: '4g',
      type: 'wifi',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
  });

  it('returns initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
    expect(result.current.connectionType).toBe('4g');
  });

  it('detects offline status', () => {
    (navigator as any).onLine = false;
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it('detects slow connection', () => {
    (navigator as any).connection.effectiveType = '2g';
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
    expect(result.current.connectionType).toBe('2g');
  });

  it('detects very slow connection', () => {
    (navigator as any).connection.effectiveType = 'slow-2g';
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
    expect(result.current.connectionType).toBe('slow-2g');
  });

  it('handles missing connection API', () => {
    delete (navigator as any).connection;
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.connectionType).toBe('unknown');
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('responds to online events', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    // Simulate going offline
    act(() => {
      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    act(() => {
      (navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('responds to connection changes', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    // Simulate connection change
    act(() => {
      (navigator as any).connection.effectiveType = '3g';
      const connectionChangeEvent = new Event('change');
      (navigator as any).connection.dispatchEvent(connectionChangeEvent);
    });

    expect(result.current.connectionType).toBe('3g');
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const connectionRemoveListenerSpy = jest.fn();
    
    (navigator as any).connection.removeEventListener = connectionRemoveListenerSpy;

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(connectionRemoveListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('handles server-side rendering', () => {
    // Mock window as undefined (SSR environment)
    const originalWindow = global.window;
    delete (global as any).window;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.connectionType).toBe('unknown');

    // Restore window
    global.window = originalWindow;
  });

  it('uses fallback connection type when not available', () => {
    (navigator as any).connection = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.connectionType).toBe('unknown');
  });

  it('handles connection type from type property', () => {
    (navigator as any).connection = {
      type: 'cellular',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.connectionType).toBe('cellular');
  });
});