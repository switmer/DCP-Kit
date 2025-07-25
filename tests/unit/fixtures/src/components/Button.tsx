import React from 'react';

/**
 * A versatile button component for actions
 */
export interface ButtonProps {
  /**
   * Button variation style
   */
  variant?: 'primary' | 'secondary' | 'tertiary';
  
  /**
   * Button size
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Button contents
   */
  children: React.ReactNode;
  
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  children,
  onClick,
}) => {
  const baseStyle = "px-4 py-2 rounded font-semibold";
  
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    tertiary: "bg-transparent text-blue-600 hover:text-blue-800",
  };
  
  const sizeStyles = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg px-6 py-3",
  };
  
  const disabledStyle = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";
  
  return (
    <button
      type="button"
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyle}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button; 