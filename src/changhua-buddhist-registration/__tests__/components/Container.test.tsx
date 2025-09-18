import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Container } from '../../components/layout/Container';

describe('Container Component', () => {
  it('renders with default props', () => {
    render(<Container>Container content</Container>);
    const container = screen.getByText('Container content');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('container', 'maxWidth-md', 'padding-md', 'center');
  });

  it('renders different max widths correctly', () => {
    const { rerender } = render(<Container maxWidth="sm">Small container</Container>);
    expect(screen.getByText('Small container')).toHaveClass('maxWidth-sm');

    rerender(<Container maxWidth="lg">Large container</Container>);
    expect(screen.getByText('Large container')).toHaveClass('maxWidth-lg');

    rerender(<Container maxWidth="xl">Extra large container</Container>);
    expect(screen.getByText('Extra large container')).toHaveClass('maxWidth-xl');

    rerender(<Container maxWidth="full">Full width container</Container>);
    expect(screen.getByText('Full width container')).toHaveClass('maxWidth-full');
  });

  it('renders different padding sizes correctly', () => {
    const { rerender } = render(<Container padding="none">No padding</Container>);
    expect(screen.getByText('No padding')).toHaveClass('padding-none');

    rerender(<Container padding="sm">Small padding</Container>);
    expect(screen.getByText('Small padding')).toHaveClass('padding-sm');

    rerender(<Container padding="lg">Large padding</Container>);
    expect(screen.getByText('Large padding')).toHaveClass('padding-lg');
  });

  it('handles center prop', () => {
    const { rerender } = render(<Container center={true}>Centered container</Container>);
    expect(screen.getByText('Centered container')).toHaveClass('center');

    rerender(<Container center={false}>Not centered container</Container>);
    expect(screen.getByText('Not centered container')).not.toHaveClass('center');
  });

  it('applies custom className', () => {
    render(<Container className="custom-container">Custom container</Container>);
    expect(screen.getByText('Custom container')).toHaveClass('custom-container');
  });

  it('combines multiple classes correctly', () => {
    render(
      <Container 
        maxWidth="lg" 
        padding="sm" 
        center={false} 
        className="custom-class"
      >
        Multi-class container
      </Container>
    );
    
    const container = screen.getByText('Multi-class container');
    expect(container).toHaveClass('container', 'maxWidth-lg', 'padding-sm', 'custom-class');
    expect(container).not.toHaveClass('center');
  });
});