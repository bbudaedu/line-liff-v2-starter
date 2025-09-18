import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Grid, GridItem, Flex } from '../../components/layout/Grid';

describe('Grid Component', () => {
  it('renders with default props', () => {
    render(<Grid>Grid content</Grid>);
    const grid = screen.getByText('Grid content');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid', 'columns-1', 'gap-md', 'responsive');
  });

  it('renders different column counts correctly', () => {
    const { rerender } = render(<Grid columns={2}>Two columns</Grid>);
    expect(screen.getByText('Two columns')).toHaveClass('columns-2');

    rerender(<Grid columns={3}>Three columns</Grid>);
    expect(screen.getByText('Three columns')).toHaveClass('columns-3');

    rerender(<Grid columns={12}>Twelve columns</Grid>);
    expect(screen.getByText('Twelve columns')).toHaveClass('columns-12');
  });

  it('renders different gap sizes correctly', () => {
    const { rerender } = render(<Grid gap="none">No gap</Grid>);
    expect(screen.getByText('No gap')).toHaveClass('gap-none');

    rerender(<Grid gap="sm">Small gap</Grid>);
    expect(screen.getByText('Small gap')).toHaveClass('gap-sm');

    rerender(<Grid gap="xl">Extra large gap</Grid>);
    expect(screen.getByText('Extra large gap')).toHaveClass('gap-xl');
  });

  it('handles responsive prop', () => {
    const { rerender } = render(<Grid responsive={true}>Responsive grid</Grid>);
    expect(screen.getByText('Responsive grid')).toHaveClass('responsive');

    rerender(<Grid responsive={false}>Non-responsive grid</Grid>);
    expect(screen.getByText('Non-responsive grid')).not.toHaveClass('responsive');
  });

  it('applies custom className', () => {
    render(<Grid className="custom-grid">Custom grid</Grid>);
    expect(screen.getByText('Custom grid')).toHaveClass('custom-grid');
  });
});

describe('GridItem Component', () => {
  it('renders with default props', () => {
    render(<GridItem>Grid item content</GridItem>);
    const gridItem = screen.getByText('Grid item content');
    expect(gridItem).toBeInTheDocument();
    expect(gridItem).toHaveClass('gridItem');
  });

  it('handles span prop correctly', () => {
    const { rerender } = render(<GridItem span={2}>Span 2</GridItem>);
    expect(screen.getByText('Span 2')).toHaveClass('span-2');

    rerender(<GridItem span={6}>Span 6</GridItem>);
    expect(screen.getByText('Span 6')).toHaveClass('span-6');

    rerender(<GridItem span={12}>Span 12</GridItem>);
    expect(screen.getByText('Span 12')).toHaveClass('span-12');
  });

  it('handles offset prop correctly', () => {
    const { rerender } = render(<GridItem offset={1}>Offset 1</GridItem>);
    expect(screen.getByText('Offset 1')).toHaveClass('offset-1');

    rerender(<GridItem offset={4}>Offset 4</GridItem>);
    expect(screen.getByText('Offset 4')).toHaveClass('offset-4');

    rerender(<GridItem offset={6}>Offset 6</GridItem>);
    expect(screen.getByText('Offset 6')).toHaveClass('offset-6');
  });

  it('applies custom className', () => {
    render(<GridItem className="custom-item">Custom item</GridItem>);
    expect(screen.getByText('Custom item')).toHaveClass('custom-item');
  });

  it('combines span and offset classes', () => {
    render(<GridItem span={3} offset={2}>Span and offset</GridItem>);
    const item = screen.getByText('Span and offset');
    expect(item).toHaveClass('gridItem', 'span-3', 'offset-2');
  });
});

describe('Flex Component', () => {
  it('renders with default props', () => {
    render(<Flex>Flex content</Flex>);
    const flex = screen.getByText('Flex content');
    expect(flex).toBeInTheDocument();
    expect(flex).toHaveClass('flex', 'direction-row', 'justify-start', 'align-stretch', 'gap-none');
    expect(flex).not.toHaveClass('wrap');
  });

  it('renders different directions correctly', () => {
    const { rerender } = render(<Flex direction="column">Column flex</Flex>);
    expect(screen.getByText('Column flex')).toHaveClass('direction-column');

    rerender(<Flex direction="row-reverse">Row reverse flex</Flex>);
    expect(screen.getByText('Row reverse flex')).toHaveClass('direction-row-reverse');

    rerender(<Flex direction="column-reverse">Column reverse flex</Flex>);
    expect(screen.getByText('Column reverse flex')).toHaveClass('direction-column-reverse');
  });

  it('renders different justify values correctly', () => {
    const { rerender } = render(<Flex justify="center">Center justify</Flex>);
    expect(screen.getByText('Center justify')).toHaveClass('justify-center');

    rerender(<Flex justify="between">Space between</Flex>);
    expect(screen.getByText('Space between')).toHaveClass('justify-between');

    rerender(<Flex justify="evenly">Space evenly</Flex>);
    expect(screen.getByText('Space evenly')).toHaveClass('justify-evenly');
  });

  it('renders different align values correctly', () => {
    const { rerender } = render(<Flex align="center">Center align</Flex>);
    expect(screen.getByText('Center align')).toHaveClass('align-center');

    rerender(<Flex align="end">End align</Flex>);
    expect(screen.getByText('End align')).toHaveClass('align-end');

    rerender(<Flex align="baseline">Baseline align</Flex>);
    expect(screen.getByText('Baseline align')).toHaveClass('align-baseline');
  });

  it('handles wrap prop', () => {
    const { rerender } = render(<Flex wrap={true}>Wrap flex</Flex>);
    expect(screen.getByText('Wrap flex')).toHaveClass('wrap');

    rerender(<Flex wrap={false}>No wrap flex</Flex>);
    expect(screen.getByText('No wrap flex')).not.toHaveClass('wrap');
  });

  it('renders different gap sizes correctly', () => {
    const { rerender } = render(<Flex gap="sm">Small gap</Flex>);
    expect(screen.getByText('Small gap')).toHaveClass('gap-sm');

    rerender(<Flex gap="lg">Large gap</Flex>);
    expect(screen.getByText('Large gap')).toHaveClass('gap-lg');

    rerender(<Flex gap="xl">Extra large gap</Flex>);
    expect(screen.getByText('Extra large gap')).toHaveClass('gap-xl');
  });

  it('applies custom className', () => {
    render(<Flex className="custom-flex">Custom flex</Flex>);
    expect(screen.getByText('Custom flex')).toHaveClass('custom-flex');
  });

  it('combines multiple flex properties', () => {
    render(
      <Flex 
        direction="column" 
        justify="center" 
        align="center" 
        wrap={true} 
        gap="md"
        className="complex-flex"
      >
        Complex flex
      </Flex>
    );
    
    const flex = screen.getByText('Complex flex');
    expect(flex).toHaveClass(
      'flex', 
      'direction-column', 
      'justify-center', 
      'align-center', 
      'wrap', 
      'gap-md',
      'complex-flex'
    );
  });
});