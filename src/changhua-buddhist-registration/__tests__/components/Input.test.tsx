import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '../../components/ui/Input';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input', 'outlined');
  });

  it('renders with label', () => {
    render(<Input label="姓名" />);
    const label = screen.getByText('姓名');
    const input = screen.getByRole('textbox');
    
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.id);
  });

  it('shows required indicator', () => {
    render(<Input label="姓名" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('required');
  });

  it('displays error message', () => {
    render(<Input label="姓名" error="此欄位為必填" />);
    const input = screen.getByRole('textbox');
    const errorMessage = screen.getByText('此欄位為必填');
    
    expect(input).toHaveClass('error');
    expect(errorMessage).toHaveClass('errorText');
  });

  it('displays helper text', () => {
    render(<Input label="電話" helperText="請輸入手機號碼" />);
    const helperText = screen.getByText('請輸入手機號碼');
    expect(helperText).toHaveClass('helper');
  });

  it('handles different variants', () => {
    const { rerender } = render(<Input variant="filled" />);
    expect(screen.getByRole('textbox')).toHaveClass('filled');

    rerender(<Input variant="outlined" />);
    expect(screen.getByRole('textbox')).toHaveClass('outlined');
  });

  it('handles fullWidth prop', () => {
    render(<Input fullWidth />);
    expect(screen.getByRole('textbox').closest('.inputContainer')).toHaveClass('fullWidth');
  });

  it('renders with start icon', () => {
    const startIcon = <span data-testid="start-icon">📞</span>;
    render(<Input startIcon={startIcon} />);
    
    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('hasStartIcon');
  });

  it('renders with end icon', () => {
    const endIcon = <span data-testid="end-icon">✓</span>;
    render(<Input endIcon={endIcon} />);
    
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('hasEndIcon');
  });

  it('handles input changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test value');
  });

  it('handles focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('handles disabled state', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox').closest('.inputContainer')).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('generates unique id when not provided', () => {
    render(<Input label="Test" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test');
    
    expect(input.id).toBeTruthy();
    expect(label).toHaveAttribute('for', input.id);
  });

  it('uses provided id', () => {
    render(<Input id="custom-id" label="Test" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test');
    
    expect(input.id).toBe('custom-id');
    expect(label).toHaveAttribute('for', 'custom-id');
  });
});