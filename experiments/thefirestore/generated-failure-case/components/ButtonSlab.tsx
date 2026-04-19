import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonSlabProps {\n  children: any;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttonslabVariants>\n}

const buttonslabVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {\n        default: "bg-gray-100 text-gray-900"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ButtonSlab: React.FC<ButtonSlabProps> = ({
  children,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttonslabVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};