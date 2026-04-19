import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonSmallProps {\n  children: any;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttonsmallVariants>\n}

const buttonsmallVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {\n        default: "p-4"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ButtonSmall: React.FC<ButtonSmallProps> = ({
  children,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttonsmallVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};