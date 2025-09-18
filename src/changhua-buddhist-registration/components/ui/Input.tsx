import React, { forwardRef } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  variant?: 'outlined' | 'filled';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  fullWidth = false,
  variant = 'outlined',
  startIcon,
  endIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const containerClasses = [
    styles.inputContainer,
    fullWidth && styles.fullWidth,
    error && styles.hasError,
    className
  ].filter(Boolean).join(' ');

  const inputClasses = [
    styles.input,
    styles[variant],
    startIcon && styles.hasStartIcon,
    endIcon && styles.hasEndIcon,
    error && styles.error
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        {startIcon && <div className={styles.startIcon}>{startIcon}</div>}
        
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          {...props}
        />
        
        {endIcon && <div className={styles.endIcon}>{endIcon}</div>}
      </div>
      
      {(error || helperText) && (
        <div className={styles.helperText}>
          {error ? (
            <span className={styles.errorText}>{error}</span>
          ) : (
            <span className={styles.helper}>{helperText}</span>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;