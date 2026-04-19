import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonSecondaryProps {\n  children: any;\n  onClick?: () => void;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttonsecondaryVariants>\n}

const buttonsecondaryVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {\n        default: "bg-gray-500 text-gray-500"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ButtonSecondary: React.FC<ButtonSecondaryProps> = ({
  children,\n  onClick,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttonsecondaryVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};