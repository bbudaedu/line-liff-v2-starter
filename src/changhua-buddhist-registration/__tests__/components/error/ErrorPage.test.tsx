import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorPage } from '../../../components/error/ErrorPage';

describe('ErrorPage', () => {
  it('renders 404 error page correctly', () => {
    render(<ErrorPage statusCode={404} />);

    expect(screen.getByText('頁面不存在')).toBeInTheDocument();
    expect(screen.getByText('您要找的頁面不存在，可能已被移除或網址有誤。')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('renders 500 error page correctly', () => {
    render(<ErrorPage statusCode={500} />);

    expect(screen.getByText('伺服器錯誤')).toBeInTheDocument();
    expect(screen.getByText('伺服器發生內部錯誤，請稍後再試。')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders network error correctly', () => {
    const networkError = new Error('Network Error');
    render(<ErrorPage error={networkError} />);

    expect(screen.getByText('網路連線錯誤')).toBeInTheDocument();
    expect(screen.getByText('無法連接到伺服器，請檢查您的網路連線。')).toBeInTheDocument();
  });

  it('renders timeout error correctly', () => {
    const timeoutError = new Error('Request timeout');
    render(<ErrorPage error={timeoutError} />);

    expect(screen.getByText('連線逾時')).toBeInTheDocument();
    expect(screen.getByText('伺服器回應時間過長，請稍後再試。')).toBeInTheDocument();
  });

  it('shows custom title and message when provided', () => {
    render(
      <ErrorPage 
        title="自訂標題" 
        message="自訂錯誤訊息" 
      />
    );

    expect(screen.getByText('自訂標題')).toBeInTheDocument();
    expect(screen.getByText('自訂錯誤訊息')).toBeInTheDocument();
  });

  it('shows retry and home buttons by default', () => {
    render(<ErrorPage />);

    expect(screen.getByRole('button', { name: '重新嘗試' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回首頁' })).toBeInTheDocument();
  });

  it('hides retry button when showRetry is false', () => {
    render(<ErrorPage showRetry={false} />);

    expect(screen.queryByRole('button', { name: '重新嘗試' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回首頁' })).toBeInTheDocument();
  });

  it('hides home button when showHome is false', () => {
    render(<ErrorPage showHome={false} />);

    expect(screen.getByRole('button', { name: '重新嘗試' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回首頁' })).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ErrorPage onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: '重新嘗試' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onHome when home button is clicked', () => {
    const onHome = jest.fn();
    render(<ErrorPage onHome={onHome} />);

    fireEvent.click(screen.getByRole('button', { name: '返回首頁' }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    render(<ErrorPage error={error} />);

    expect(screen.getByText('錯誤詳情 (開發模式)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Test error');
    render(<ErrorPage error={error} />);

    expect(screen.queryByText('錯誤詳情 (開發模式)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('shows appropriate suggestions for different error types', () => {
    render(<ErrorPage statusCode={404} />);

    expect(screen.getByText('檢查網址是否正確')).toBeInTheDocument();
    expect(screen.getByText('返回首頁重新開始')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorPage className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});