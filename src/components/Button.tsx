import React from 'react';

interface ButtonProps {
  /** The button's variant style */
  variant?: 'primary' | 'secondary';
  /** The button's label text */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}

/**
 * A simple button component
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  onClick
}) => {
  return (
    <button
      className={`button button--${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}; 