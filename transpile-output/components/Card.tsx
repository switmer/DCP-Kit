import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';

export interface CardProps {\n  variant: any;\n  padding: any;\n  interactive: any;\n  children: any;\n  header: any;\n  footer: any;\n  onClick: any;\n  children?: React.ReactNode;\n}


export const Card: React.FC<CardProps> = ({
  variant = "default",\n  padding = "md",\n  interactive = false,\n  children = null,\n  header = null,\n  footer = null,\n  onClick = null,\n  children,\n  className,\n  ...props
}) => {
  const classes = cn(className);
  
  return (
    <div
      className={classes}
      {...props}
    >
      {children}
    </div>
  );
};

Card.defaultProps = {\n  variant: "default",\n  padding: "md",\n  interactive: false,\n  children: null,\n  header: null,\n  footer: null,\n  onClick: null\n};