import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';

export interface SimpleButtonProps {\n  variant: any;\n  children: any;\n  onClick: any;\n  children?: React.ReactNode;\n}


export const SimpleButton: React.FC<SimpleButtonProps> = ({
  variant = "primary",\n  children = null,\n  onClick = null,\n  children,\n  className,\n  ...props
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

SimpleButton.defaultProps = {\n  variant: "primary",\n  children: null,\n  onClick: null\n};