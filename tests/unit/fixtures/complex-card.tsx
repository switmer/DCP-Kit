import React from 'react';

/**
 * Complex card component for testing advanced extraction patterns
 */
export interface ComplexCardProps {
  /** Card variant with multiple options */
  variant?: 'default' | 'outlined' | 'filled' | 'elevated';
  /** Card size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether card is interactive */
  interactive?: boolean;
  /** Custom styling */
  className?: string;
  /** Card content */
  children: React.ReactNode;
  /** Optional header slot */
  header?: React.ReactNode;
  /** Optional footer slot */
  footer?: React.ReactNode;
  /** Optional actions */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Additional data attributes */
  'data-testid'?: string;
}

export const ComplexCard: React.FC<ComplexCardProps> = ({
  variant = 'default',
  size = 'md',
  interactive = false,
  className = '',
  children,
  header,
  footer,
  actions,
  loading = false,
  disabled = false,
  onClick,
  'data-testid': testId,
  ...props
}) => {
  const baseClasses = 'card';
  const variantClasses = {
    default: 'card--default',
    outlined: 'card--outlined',
    filled: 'card--filled',
    elevated: 'card--elevated'
  };
  
  const sizeClasses = {
    sm: 'card--sm',
    md: 'card--md',
    lg: 'card--lg',
    xl: 'card--xl'
  };
  
  const combinedClassName = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    interactive && 'card--interactive',
    loading && 'card--loading',
    disabled && 'card--disabled',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={combinedClassName}
      onClick={interactive && !disabled ? onClick : undefined}
      data-testid={testId}
      {...props}
    >
      {header && (
        <div className="card__header">
          {header}
        </div>
      )}
      
      <div className="card__content">
        {loading ? (
          <div className="card__loading">Loading...</div>
        ) : (
          children
        )}
      </div>
      
      {actions && actions.length > 0 && (
        <div className="card__actions">
          {actions.map((action, index) => (
            <button
              key={index}
              className={`btn btn--${action.variant || 'secondary'}`}
              onClick={action.onClick}
              disabled={disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      
      {footer && (
        <div className="card__footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default ComplexCard;