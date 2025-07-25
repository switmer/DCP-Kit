import React from 'react';

export interface CardProps {
  /** Card title */
  title?: string;
  /** Card content */
  children: React.ReactNode;
  /** Card size */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Card component for content grouping
 */
export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  size = 'medium' 
}) => {
  return (
    <div className={`card card-${size}`}>
      {title && <div className="card-title">{title}</div>}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};