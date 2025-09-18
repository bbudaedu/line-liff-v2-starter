import React from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  closable?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
  title?: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  size = 'md',
  closable = false,
  onClose,
  icon,
  title,
  className = ''
}) => {
  const alertClasses = [
    styles.alert,
    styles[variant],
    styles[size],
    className
  ].filter(Boolean).join(' ');

  const defaultIcons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };

  const displayIcon = icon || defaultIcons[variant];

  return (
    <div className={alertClasses} role="alert">
      <div className={styles.content}>
        {displayIcon && (
          <div className={styles.icon}>
            {displayIcon}
          </div>
        )}
        
        <div className={styles.message}>
          {title && <div className={styles.title}>{title}</div>}
          <div className={styles.description}>{children}</div>
        </div>
        
        {closable && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="關閉提示"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export interface ToastProps extends Omit<AlertProps, 'closable'> {
  visible?: boolean;
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  children,
  variant = 'info',
  visible = true,
  duration = 3000,
  position = 'top',
  onClose,
  ...alertProps
}) => {
  React.useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const toastClasses = [
    styles.toast,
    styles[`toast-${position}`],
    visible && styles.toastVisible
  ].filter(Boolean).join(' ');

  return (
    <div className={toastClasses}>
      <Alert
        {...alertProps}
        variant={variant}
        closable={true}
        onClose={onClose}
      >
        {children}
      </Alert>
    </div>
  );
};

export default Alert;