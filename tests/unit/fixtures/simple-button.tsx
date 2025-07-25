import React from 'react';

/**
 * Simple button component for testing basic extraction
 */
export interface SimpleButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary';
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  variant = 'primary',
  children,
  onClick
}) => {
  return (
    <button
      className={`btn btn--${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default SimpleButton;