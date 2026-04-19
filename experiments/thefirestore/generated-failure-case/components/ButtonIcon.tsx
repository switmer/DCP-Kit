import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonIconProps {\n  icon: any;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttoniconVariants>\n}

const buttoniconVariants = cva(
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
export const ButtonIcon: React.FC<ButtonIconProps> = ({
  icon,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttoniconVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};