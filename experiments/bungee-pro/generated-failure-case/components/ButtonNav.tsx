import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonNavProps {\n  /** Button label (observed: "Let's talk") */\n  children: any;\n  onClick?: () => void;\n  children?: React.ReactNode;\n  & VariantProps<typeof buttonnavVariants>\n}

const buttonnavVariants = cva(
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
export const ButtonNav: React.FC<ButtonNavProps> = ({
  children,\n  onClick,\n  children,\n  className,\n  ...props
}) => {
  const variants = buttonnavVariants({ variant, className });
  
  return (
    <button
      className={variants}
      {...props}
    >
      {children}
    </button>
  );
};