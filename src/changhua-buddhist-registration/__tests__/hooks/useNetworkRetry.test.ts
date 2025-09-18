import { renderHook, act } from '@testing-library/react';
import { useNetworkRetry } from '../../hooks/useNetworkRetry';

describe('useNetworkRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executes operation successfully without retry', async () => {
    const { result } = renderHook(() => useNetworkRetry());
    const mockOperation = jest.fn().mockResolvedValue('success');

    let operationResult: string;
    await act(async () => {
      operationResult = await result.current.executeWithRetry(mockOperation);
    });

    expect(operationResult!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('retries on network error', async () => {
    const { result } = renderHook(() => useNetworkRetry({ maxRetries: 2 }));
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue('success');

    let operationResult: string;
    await act(async () => {
      const promise = result.current.executeWithRetry(mockOperation);
      
      // Fast-forward timers to resolve delays
      jest.runAllTimers();
      
      operationResult = await promise;
    });

    expect(operationResult!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('fails after max retries', async () => {
    const { result } = renderHook(() => useNetworkRetry({ maxRetries: 2 }));
    const networkError = new Error('Network Error');
    const mockOperation = jest.fn().mockRejectedValue(networkError);

    await act(async () => {
      try {
        await result.current.executeWithRetry(mockOperation);
      } catch (error) {
        expect(error).toBe(networkError);
      }
    });

    expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(result.current.retryCount).toBe(2);
    expect(result.current.lastError).toBe(networkError);
  });

  it('does not retry on non-network errors', async () => {
    const { result } = renderHook(() => useNetworkRetry());
    const validationError = new Error('Validation failed');
    const mockOperation = jest.fn().mockRejectedValue(validationError);

    await act(async () => {
      try {
        await result.current.executeWithRetry(mockOperation);
      } catch (error) {
        expect(error).toBe(validationError);
      }
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.retryCount).toBe(0);
  });

  it('uses custom retry options', async () => {
    const { result } = renderHook(() => useNetworkRetry());
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue('success');

    await act(async () => {
      await result.current.executeWithRetry(mockOperation, {
        maxRetries: 1,
        retryDelay: 500
      });
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('applies backoff multiplier correctly', async () => {
    const { result } = renderHook(() => useNetworkRetry({
      maxRetries: 3,
      retryDelay: 100,
      backoffMultiplier: 2
    }));

    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue('success');

    const startTime = Date.now();
    
    await act(async () => {
      const promise = result.current.executeWithRetry(mockOperation);
      jest.runAllTimers();
      await promise;
    });

    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => useNetworkRetry());

    act(() => {
      result.current.reset();
    });

    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastError).toBe(null);
  });

  it('handles timeout errors', async () => {
    const { result } = renderHook(() => useNetworkRetry({ maxRetries: 1 }));
    const timeoutError = new Error('timeout');
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValue('success');

    await act(async () => {
      const promise = result.current.executeWithRetry(mockOperation);
      jest.runAllTimers();
      await promise;
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('handles fetch errors', async () => {
    const { result } = renderHook(() => useNetworkRetry({ maxRetries: 1 }));
    const fetchError = new Error('fetch failed');
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(fetchError)
      .mockResolvedValue('success');

    await act(async () => {
      const promise = result.current.executeWithRetry(mockOperation);
      jest.runAllTimers();
      await promise;
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('updates retry state during execution', async () => {
    const { result } = renderHook(() => useNetworkRetry({ maxRetries: 1 }));
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue('success');

    await act(async () => {
      const promise = result.current.executeWithRetry(mockOperation);
      
      // Check state during retry
      expect(result.current.isRetrying).toBe(true);
      expect(result.current.retryCount).toBe(1);
      
      jest.runAllTimers();
      await promise;
    });

    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });
});