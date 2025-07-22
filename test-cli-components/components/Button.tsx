import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';

export interface ButtonProps {\n  variant: any;\n  size: any;\n  disabled: any;\n  children: any;\n  onClick: any;\n  children?: React.ReactNode;\n}


export const Button: React.FC<ButtonProps> = ({
  variant = "primary",\n  size = "medium",\n  disabled = false,\n  children = null,\n  onClick = null,\n  children,\n  className,\n  ...props
}) => {
  const classes = cn(className);
  
  return (
    <button
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
};

Button.defaultProps = {\n  variant: "primary",\n  size: "medium",\n  disabled: false,\n  children: null,\n  onClick: null\n};