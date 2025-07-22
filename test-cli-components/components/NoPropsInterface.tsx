import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';

export interface NoPropsInterfaceProps {\n  children?: React.ReactNode;\n}


export const NoPropsInterface: React.FC<NoPropsInterfaceProps> = ({
  children,\n  className,\n  ...props
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