import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonProps {\n  /** Visual treatment */\n  variant?: string;\n  /** Button label */\n  children: any;\n  /** Click handler */\n  onClick?: () => void;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttonVariants>\n}

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {\n        ghost: "bg-gray-500 text-gray-500 p-4",\n        solid: "bg-gray-500 text-gray-500 p-4"
      }
    },
    defaultVariants: {
      variant: "ghost"
    }
  }
);\n
export const Button: React.FC<ButtonProps> = ({
  variant = "ghost",\n  children,\n  onClick,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttonVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};

Button.defaultProps = {\n  variant: "ghost"\n};