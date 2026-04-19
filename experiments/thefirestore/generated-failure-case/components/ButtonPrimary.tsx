import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonPrimaryProps {\n  children: any;\n  onClick?: () => void;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttonprimaryVariants>\n}

const buttonprimaryVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {\n        default: "bg-gray-500 border-gray-500 text-gray-500"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({
  children,\n  onClick,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttonprimaryVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};