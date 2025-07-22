import React from 'react';

/**
 * Card component for displaying content in a structured layout
 * Provides consistent spacing and visual hierarchy
 */
export interface CardProps {
  /** Card variant */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Card padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Whether card is interactive */
  interactive?: boolean;
  /** Card content */
  children: React.ReactNode;
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Click handler for interactive cards */
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  interactive = false,
  children,
  header,
  footer,
  onClick,
  ...props
}) => {
  const baseClasses = 'rounded-lg transition-colors';
  
  const variantClasses = {
    default: 'bg-white',
    outlined: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg'
  };
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };
  
  const interactiveClasses = interactive 
    ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' 
    : '';
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses}`}
      onClick={interactive ? onClick : undefined}
      {...props}
    >
      {header && (
        <div className="mb-4 border-b border-gray-100 pb-3">
          {header}
        </div>
      )}
      
      <div className="flex-1">
        {children}
      </div>
      
      {footer && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;