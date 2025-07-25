import React from 'react';

interface ButtonProps {
  /** The text content of the button */
  children: React.ReactNode;
  /** Optional variant style */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Primary button component for user interaction
 * 
 * @example
 * ```tsx
 * <Button variant="primary">Click Me</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  disabled = false,
  onClick
}) => {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
    outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}; 