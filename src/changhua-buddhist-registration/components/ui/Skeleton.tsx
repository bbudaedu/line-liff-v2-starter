import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  borderRadius,
  className = '',
  variant = 'text',
  animation = 'pulse',
  style: customStyle
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: borderRadius ? 
      (typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius) : 
      undefined,
    ...customStyle
  };

  const classes = [
    styles.skeleton,
    styles[variant],
    styles[animation],
    className
  ].filter(Boolean).join(' ');

  return <div className={classes} style={style} />;
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={className}>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton 
        key={index}
        height="1.2em"
        className={styles.textLine}
        style={{ 
          width: index === lines - 1 && lines > 1 ? '75%' : '100%',
          marginBottom: index < lines - 1 ? '8px' : '0'
        }}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${styles.skeletonCard} ${className}`}>
    <Skeleton height="200px" className={styles.cardImage} />
    <div className={styles.cardContent}>
      <Skeleton height="24px" width="80%" className={styles.cardTitle} />
      <SkeletonText lines={2} className={styles.cardDescription} />
      <div className={styles.cardActions}>
        <Skeleton height="40px" width="120px" borderRadius="8px" />
        <Skeleton height="40px" width="80px" borderRadius="8px" />
      </div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ 
  items?: number; 
  itemHeight?: string | number;
  className?: string;
}> = ({ 
  items = 3, 
  itemHeight = '60px',
  className = '' 
}) => (
  <div className={className}>
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className={styles.listItem}>
        <Skeleton 
          variant="circular" 
          width="40px" 
          height="40px" 
          className={styles.listAvatar}
        />
        <div className={styles.listContent}>
          <Skeleton height="16px" width="60%" />
          <Skeleton height="14px" width="40%" className={styles.listSubtext} />
        </div>
      </div>
    ))}
  </div>
);