import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RetryWrapper } from '../../../components/error/RetryWrapper';

describe('RetryWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children when no error occurs', () => {
    const mockOnRetry = jest.fn().mockResolvedValue(undefined);
    
    render(
      <RetryWrapper onRetry={mockOnRetry}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows error state when hasError prop is true', () => {
    const mockOnRetry = jest.fn();
    
    render(
      <RetryWrapper onRetry={mockOnRetry} hasError={true}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('操作失敗')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新嘗試' })).toBeInTheDocument();
  });

  it('shows error state when retry fails', async () => {
    const mockOnRetry = jest.fn().mockRejectedValue(new Error('Test error'));
    
    render(
      <RetryWrapper onRetry={mockOnRetry}>
        <div>Test content</div>
      </RetryWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));

    await waitFor(() => {
      expect(screen.getByText('操作失敗')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  it('shows custom error message when provided', () => {
    const mockOnRetry = jest.fn();
    
    render(
      <RetryWrapper 
        onRetry={mockOnRetry}
        errorMessage="自訂錯誤訊息"
        hasError={true}
      >
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('自訂錯誤訊息')).toBeInTheDocument();
  });

  it('shows retry count information after failed retry', async () => {
    const mockOnRetry = jest.fn().mockRejectedValue(new Error('Test error'));
    
    render(
      <RetryWrapper onRetry={mockOnRetry}>
        <div>Test content</div>
      </RetryWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));

    await waitFor(() => {
      expect(screen.getByText(/已自動重試 1 次/)).toBeInTheDocument();
    });
  });

  it('hides retry button when showRetryButton is false', () => {
    const mockOnRetry = jest.fn();
    
    render(
      <RetryWrapper 
        onRetry={mockOnRetry}
        showRetryButton={false}
        hasError={true}
      >
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('操作失敗')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重新嘗試' })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const mockOnRetry = jest.fn();
    
    const { container } = render(
      <RetryWrapper 
        onRetry={mockOnRetry}
        className="custom-wrapper"
      >
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(container.firstChild).toHaveClass('retryWrapper', 'custom-wrapper');
  });

  it('shows loading state during retry', async () => {
    const mockOnRetry = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(
      <RetryWrapper onRetry={mockOnRetry}>
        <div>Test content</div>
      </RetryWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));

    expect(screen.getByText('載入中...')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  it('handles successful retry', async () => {
    const mockOnRetry = jest.fn().mockResolvedValue(undefined);
    
    render(
      <RetryWrapper onRetry={mockOnRetry}>
        <div>Test content</div>
      </RetryWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));

    await waitFor(() => {
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });
});