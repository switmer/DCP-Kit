import React from 'react';

export interface ButtonProps {
  /** Button text */
  children: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Click handler */
  onClick?: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
}

/**
 * Primary Button component for user interactions
 */
export function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false 
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;