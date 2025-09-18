import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { NetworkStatus } from '../../components/ui/NetworkStatus';
import { RetryWrapper } from '../../components/error/RetryWrapper';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useNetworkRetry } from '../../hooks/useNetworkRetry';

// Mock hooks
jest.mock('../../hooks/useNetworkStatus');
jest.mock('../../hooks/useNetworkRetry');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseNetworkRetry = useNetworkRetry as jest.MockedFunction<typeof useNetworkRetry>;

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Component that can throw errors
const TestComponent = ({ shouldThrow, throwAsync }: { shouldThrow: boolean; throwAsync?: boolean }) => {
  if (shouldThrow && !throwAsync) {
    throw new Error('Synchronous test error');
  }
  
  if (shouldThrow && throwAsync) {
    React.useEffect(() => {
      throw new Error('Asynchronous test error');
    }, []);
  }
  
  return <div>Test component content</div>;
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default network status mock
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      connectionType: '4g'
    });

    // Default network retry mock
    mockUseNetworkRetry.mockReturnValue({
      executeWithRetry: jest.fn(),
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      reset: jest.fn()
    });
  });

  describe('ErrorBoundary with NetworkStatus', () => {
    it('shows network status and catches errors', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'unknown'
      });

      render(
        <ErrorBoundary>
          <NetworkStatus />
          <TestComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error boundary UI instead of network status
      expect(screen.getByText('系統發生錯誤')).toBeInTheDocument();
      expect(screen.queryByText('網路連線中斷')).not.toBeInTheDocument();
    });

    it('shows network status when no errors occur', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'unknown'
      });

      render(
        <ErrorBoundary>
          <NetworkStatus />
          <TestComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('網路連線中斷')).toBeInTheDocument();
      expect(screen.getByText('Test component content')).toBeInTheDocument();
    });
  });

  describe('RetryWrapper with Network Detection', () => {
    it('handles network errors with retry mechanism', async () => {
      const mockExecuteWithRetry = jest.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue('success');

      mockUseNetworkRetry.mockReturnValue({
        executeWithRetry: mockExecuteWithRetry,
        isRetrying: false,
        retryCount: 1,
        lastError: new Error('Network Error'),
        reset: jest.fn()
      });

      const mockOnRetry = jest.fn().mockResolvedValue(undefined);

      render(
        <RetryWrapper onRetry={mockOnRetry}>
          <TestComponent shouldThrow={false} />
        </RetryWrapper>
      );

      // Initially should show content
      expect(screen.getByText('Test component content')).toBeInTheDocument();
    });

    it('shows offline warning during retry attempts', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'unknown'
      });

      const mockOnRetry = jest.fn().mockRejectedValue(new Error('Network Error'));

      render(
        <>
          <NetworkStatus />
          <RetryWrapper onRetry={mockOnRetry}>
            <TestComponent shouldThrow={false} />
          </RetryWrapper>
        </>
      );

      expect(screen.getByText('網路連線中斷')).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));

      await waitFor(() => {
        expect(screen.getByText('操作失敗')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Error Handling Flow', () => {
    it('handles the complete error recovery flow', async () => {
      // Start with offline status
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'unknown'
      });

      const mockOnRetry = jest.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue(undefined);

      const { rerender } = render(
        <ErrorBoundary>
          <NetworkStatus />
          <RetryWrapper onRetry={mockOnRetry}>
            <TestComponent shouldThrow={false} />
          </RetryWrapper>
        </ErrorBoundary>
      );

      // Should show offline status
      expect(screen.getByText('網路連線中斷')).toBeInTheDocument();

      // Simulate going online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: false,
        connectionType: '4g'
      });

      rerender(
        <ErrorBoundary>
          <NetworkStatus />
          <RetryWrapper onRetry={mockOnRetry}>
            <TestComponent shouldThrow={false} />
          </RetryWrapper>
        </ErrorBoundary>
      );

      // Network status should disappear, content should show
      expect(screen.queryByText('網路連線中斷')).not.toBeInTheDocument();
      expect(screen.getByText('Test component content')).toBeInTheDocument();
    });

    it('handles error boundary with retry wrapper', async () => {
      const mockOnRetry = jest.fn().mockResolvedValue(undefined);

      render(
        <ErrorBoundary>
          <RetryWrapper onRetry={mockOnRetry}>
            <TestComponent shouldThrow={true} />
          </RetryWrapper>
        </ErrorBoundary>
      );

      // Error boundary should catch the error
      expect(screen.getByText('系統發生錯誤')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重新嘗試' })).toBeInTheDocument();
    });

    it('shows slow connection warning with working app', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        connectionType: '2g'
      });

      render(
        <ErrorBoundary>
          <NetworkStatus />
          <TestComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('網路連線較慢')).toBeInTheDocument();
      expect(screen.getByText('Test component content')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('recovers from error boundary after retry', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('系統發生錯誤')).toBeInTheDocument();

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <TestComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test component content')).toBeInTheDocument();
    });

    it('handles multiple error types simultaneously', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: true,
        connectionType: '2g'
      });

      const mockOnRetry = jest.fn().mockRejectedValue(new Error('API Error'));

      render(
        <ErrorBoundary>
          <NetworkStatus />
          <RetryWrapper onRetry={mockOnRetry}>
            <TestComponent shouldThrow={true} />
          </RetryWrapper>
        </ErrorBoundary>
      );

      // Error boundary should take precedence
      expect(screen.getByText('系統發生錯誤')).toBeInTheDocument();
      expect(screen.queryByText('網路連線中斷')).not.toBeInTheDocument();
    });
  });
});