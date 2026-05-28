// Greenpack Pro - Spinner Component
// Reusable loading spinner with customizable size and colors

import React from 'react';
import clsx from 'clsx';

interface SpinnerProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 24, 
  color = '#1A73E8',
  className 
}) => {
  return (
    <div
      className={clsx('inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent', className)}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        color: color,
        borderWidth: Math.max(2, Math.floor(typeof size === 'number' ? size / 12 : 2)),
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Small spinner for buttons
export const SmallSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <Spinner size={16} className={className} />
);

// Large spinner for full page loading
export const LargeSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <Spinner size={48} className={className} />
);

export default Spinner;