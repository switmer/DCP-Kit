import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonInlineProps {\n  /** Button label (observed: "Get in touch") */\n  children: any;\n  onClick?: () => void;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttoninlineVariants>\n}

const buttoninlineVariants = cva(
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
export const ButtonInline: React.FC<ButtonInlineProps> = ({
  children,\n  onClick,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttoninlineVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};