import { useState, useCallback } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
}

interface NetworkRetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

export const useNetworkRetry = (options: RetryOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2
  } = options;

  const [state, setState] = useState<NetworkRetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null
  });

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    customOptions?: RetryOptions
  ): Promise<T> => {
    const finalMaxRetries = customOptions?.maxRetries ?? maxRetries;
    const finalRetryDelay = customOptions?.retryDelay ?? retryDelay;
    const finalBackoffMultiplier = customOptions?.backoffMultiplier ?? backoffMultiplier;

    let currentRetry = 0;

    const attempt = async (): Promise<T> => {
      try {
        setState(prev => ({ ...prev, isRetrying: currentRetry > 0, retryCount: currentRetry }));
        const result = await operation();
        setState({ isRetrying: false, retryCount: 0, lastError: null });
        return result;
      } catch (error) {
        const networkError = error as Error;
        
        // Check if it's a network-related error
        const isNetworkError = 
          networkError.message.includes('Network Error') ||
          networkError.message.includes('fetch') ||
          networkError.message.includes('timeout') ||
          (error as any)?.code === 'NETWORK_ERROR';

        if (isNetworkError && currentRetry < finalMaxRetries) {
          currentRetry++;
          const delay = finalRetryDelay * Math.pow(finalBackoffMultiplier, currentRetry - 1);
          
          setState(prev => ({ 
            ...prev, 
            isRetrying: true, 
            retryCount: currentRetry,
            lastError: networkError
          }));

          // Use setTimeout with proper promise handling
          await new Promise<void>(resolve => {
            setTimeout(() => resolve(), delay);
          });
          
          return attempt();
        } else {
          setState({ 
            isRetrying: false, 
            retryCount: currentRetry,
            lastError: networkError
          });
          throw error;
        }
      }
    };

    return attempt();
  }, [maxRetries, retryDelay, backoffMultiplier]);

  const reset = useCallback(() => {
    setState({ isRetrying: false, retryCount: 0, lastError: null });
  }, []);

  return {
    executeWithRetry,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    lastError: state.lastError,
    reset
  };
};