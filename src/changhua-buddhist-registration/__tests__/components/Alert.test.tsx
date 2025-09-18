import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Alert, Toast } from '../../components/ui/Alert';

describe('Alert Component', () => {
  it('renders with default props', () => {
    render(<Alert>Alert message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('alert', 'info', 'md');
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Alert variant="success">Success message</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('success');

    rerender(<Alert variant="warning">Warning message</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('warning');

    rerender(<Alert variant="error">Error message</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('error');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Alert size="sm">Small alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('sm');

    rerender(<Alert size="lg">Large alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('lg');
  });

  it('displays title when provided', () => {
    render(<Alert title="Alert Title">Alert content</Alert>);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert Title')).toHaveClass('title');
    expect(screen.getByText('Alert content')).toBeInTheDocument();
  });

  it('displays default icons for each variant', () => {
    const { rerender } = render(<Alert variant="success">Success</Alert>);
    expect(screen.getByText('✅')).toBeInTheDocument();

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByText('❌')).toBeInTheDocument();

    rerender(<Alert variant="info">Info</Alert>);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('displays custom icon when provided', () => {
    const customIcon = <span data-testid="custom-icon">🔥</span>;
    render(<Alert icon={customIcon}>Custom icon alert</Alert>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('handles closable prop', () => {
    const handleClose = jest.fn();
    render(<Alert closable onClose={handleClose}>Closable alert</Alert>);
    
    const closeButton = screen.getByRole('button', { name: /關閉提示/i });
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Alert className="custom-alert">Custom alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('custom-alert');
  });

  it('has proper accessibility attributes', () => {
    render(<Alert>Accessible alert</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders when visible', () => {
    render(<Toast visible={true}>Toast message</Toast>);
    expect(screen.getByText('Toast message')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<Toast visible={false}>Toast message</Toast>);
    expect(screen.queryByText('Toast message')).not.toBeInTheDocument();
  });

  it('auto-closes after duration', () => {
    const handleClose = jest.fn();
    render(<Toast visible={true} duration={1000} onClose={handleClose}>Auto-close toast</Toast>);
    
    expect(handleClose).not.toHaveBeenCalled();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not auto-close when duration is 0', () => {
    const handleClose = jest.fn();
    render(<Toast visible={true} duration={0} onClose={handleClose}>Persistent toast</Toast>);
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('handles manual close', () => {
    const handleClose = jest.fn();
    render(<Toast visible={true} onClose={handleClose}>Manual close toast</Toast>);
    
    const closeButton = screen.getByRole('button', { name: /關閉提示/i });
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct position classes', () => {
    const { rerender } = render(<Toast position="top">Top toast</Toast>);
    expect(screen.getByText('Top toast').closest('.toast')).toHaveClass('toast-top');

    rerender(<Toast position="center">Center toast</Toast>);
    expect(screen.getByText('Center toast').closest('.toast')).toHaveClass('toast-center');

    rerender(<Toast position="bottom">Bottom toast</Toast>);
    expect(screen.getByText('Bottom toast').closest('.toast')).toHaveClass('toast-bottom');
  });

  it('applies visible class when visible', () => {
    render(<Toast visible={true}>Visible toast</Toast>);
    expect(screen.getByText('Visible toast').closest('.toast')).toHaveClass('toastVisible');
  });

  it('clears timer when component unmounts', () => {
    const handleClose = jest.fn();
    const { unmount } = render(<Toast visible={true} duration={1000} onClose={handleClose}>Unmount toast</Toast>);
    
    unmount();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('resets timer when visibility changes', () => {
    const handleClose = jest.fn();
    const { rerender } = render(<Toast visible={true} duration={1000} onClose={handleClose}>Timer toast</Toast>);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    rerender(<Toast visible={false} duration={1000} onClose={handleClose}>Timer toast</Toast>);
    rerender(<Toast visible={true} duration={1000} onClose={handleClose}>Timer toast</Toast>);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(handleClose).not.toHaveBeenCalled();
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});