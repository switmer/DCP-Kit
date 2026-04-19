import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonInputActionProps {\n  children?: any;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttoninputactionVariants>\n}

const buttoninputactionVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {\n        default: "m-4"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ButtonInputAction: React.FC<ButtonInputActionProps> = ({
  children,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttoninputactionVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};