import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner, Skeleton, LoadingDots } from '../../components/ui/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const spinnerContainer = container.firstChild as HTMLElement;
    expect(spinnerContainer).toHaveClass('container');
    
    const spinner = spinnerContainer.querySelector('.spinner');
    expect(spinner).toHaveClass('spinner', 'md', 'primary');
  });

  it('renders different sizes correctly', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    expect(container.querySelector('.spinner')).toHaveClass('sm');

    rerender(<LoadingSpinner size="lg" />);
    expect(container.querySelector('.spinner')).toHaveClass('lg');
  });

  it('renders different variants correctly', () => {
    const { container, rerender } = render(<LoadingSpinner variant="secondary" />);
    expect(container.querySelector('.spinner')).toHaveClass('secondary');

    rerender(<LoadingSpinner variant="accent" />);
    expect(container.querySelector('.spinner')).toHaveClass('accent');
  });

  it('displays text when provided', () => {
    render(<LoadingSpinner text="載入中..." />);
    expect(screen.getByText('載入中...')).toBeInTheDocument();
    expect(screen.getByText('載入中...')).toHaveClass('text');
  });

  it('handles fullScreen prop', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.firstChild).toHaveClass('container', 'fullScreen');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    expect(container.firstChild).toHaveClass('custom-spinner');
  });
});

describe('Skeleton Component', () => {
  it('renders with default props', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('skeleton', 'text', 'pulse');
    expect(skeleton).toHaveStyle({ width: '100%', height: '1em' });
  });

  it('handles custom dimensions', () => {
    const { container } = render(<Skeleton width={200} height={50} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('handles string dimensions', () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '50%', height: '2rem' });
  });

  it('renders different variants correctly', () => {
    const { container, rerender } = render(<Skeleton variant="rectangular" />);
    expect(container.firstChild).toHaveClass('rectangular');

    rerender(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass('circular');
  });

  it('handles different animations', () => {
    const { container, rerender } = render(<Skeleton animation="wave" />);
    expect(container.firstChild).toHaveClass('wave');

    rerender(<Skeleton animation="none" />);
    expect(container.firstChild).toHaveClass('none');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-skeleton" />);
    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});

describe('LoadingDots Component', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingDots />);
    const dots = container.firstChild as HTMLElement;
    expect(dots).toHaveClass('dots', 'dots-md', 'dots-primary');
    
    const dotElements = dots.querySelectorAll('.dot');
    expect(dotElements).toHaveLength(3);
  });

  it('renders different sizes correctly', () => {
    const { container, rerender } = render(<LoadingDots size="sm" />);
    expect(container.firstChild).toHaveClass('dots-sm');

    rerender(<LoadingDots size="lg" />);
    expect(container.firstChild).toHaveClass('dots-lg');
  });

  it('renders different variants correctly', () => {
    const { container, rerender } = render(<LoadingDots variant="secondary" />);
    expect(container.firstChild).toHaveClass('dots-secondary');

    rerender(<LoadingDots variant="accent" />);
    expect(container.firstChild).toHaveClass('dots-accent');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingDots className="custom-dots" />);
    expect(container.firstChild).toHaveClass('custom-dots');
  });

  it('renders correct number of dots', () => {
    const { container } = render(<LoadingDots />);
    const dots = container.firstChild as HTMLElement;
    const dotElements = dots.querySelectorAll('.dot');
    expect(dotElements).toHaveLength(3);
  });
});