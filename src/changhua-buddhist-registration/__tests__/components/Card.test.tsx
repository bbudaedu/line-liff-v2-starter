import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/ui/Card';

describe('Card Component', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('card', 'default', 'padding-md');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText('Elevated')).toHaveClass('elevated');

    rerender(<Card variant="outlined">Outlined</Card>);
    expect(screen.getByText('Outlined')).toHaveClass('outlined');

    rerender(<Card variant="gradient">Gradient</Card>);
    expect(screen.getByText('Gradient')).toHaveClass('gradient');
  });

  it('renders different padding sizes', () => {
    const { rerender } = render(<Card padding="none">No padding</Card>);
    expect(screen.getByText('No padding')).toHaveClass('padding-none');

    rerender(<Card padding="sm">Small padding</Card>);
    expect(screen.getByText('Small padding')).toHaveClass('padding-sm');

    rerender(<Card padding="lg">Large padding</Card>);
    expect(screen.getByText('Large padding')).toHaveClass('padding-lg');
  });

  it('handles hoverable prop', () => {
    render(<Card hoverable>Hoverable card</Card>);
    expect(screen.getByText('Hoverable card')).toHaveClass('hoverable');
  });

  it('handles clickable prop', () => {
    const handleClick = jest.fn();
    render(<Card clickable onClick={handleClick}>Clickable card</Card>);
    
    const card = screen.getByText('Clickable card');
    expect(card).toHaveClass('clickable');
    expect(card.tagName).toBe('BUTTON');
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as div when not clickable', () => {
    render(<Card>Regular card</Card>);
    const card = screen.getByText('Regular card');
    expect(card.tagName).toBe('DIV');
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Custom</Card>);
    expect(screen.getByText('Custom')).toHaveClass('custom-card');
  });
});

describe('CardHeader Component', () => {
  it('renders correctly', () => {
    render(<CardHeader>Header content</CardHeader>);
    const header = screen.getByText('Header content');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('cardHeader');
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    expect(screen.getByText('Header')).toHaveClass('cardHeader', 'custom-header');
  });
});

describe('CardContent Component', () => {
  it('renders correctly', () => {
    render(<CardContent>Content text</CardContent>);
    const content = screen.getByText('Content text');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('cardContent');
  });

  it('applies custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    expect(screen.getByText('Content')).toHaveClass('cardContent', 'custom-content');
  });
});

describe('CardFooter Component', () => {
  it('renders correctly', () => {
    render(<CardFooter>Footer content</CardFooter>);
    const footer = screen.getByText('Footer content');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('cardFooter');
  });

  it('applies custom className', () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>);
    expect(screen.getByText('Footer')).toHaveClass('cardFooter', 'custom-footer');
  });
});

describe('Card Composition', () => {
  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>Card Title</CardHeader>
        <CardContent>Card body content</CardContent>
        <CardFooter>Card actions</CardFooter>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card body content')).toBeInTheDocument();
    expect(screen.getByText('Card actions')).toBeInTheDocument();
  });
});