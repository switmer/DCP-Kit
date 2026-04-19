import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ProductCardProps {\n  /** default | alternate */\n  variant?: string;\n  /** Product image URL */\n  image: string;\n  /** Product title */\n  title: string;\n  /** Formatted price string */\n  price?: string;\n  children?: React.ReactNode;\n  & VariantProps<typeof productcardVariants>\n}

const productcardVariants = cva(
  "rounded-lg bg-white shadow",
  {
    variants: {
      variant: {\n        default: "bg-gray-500",\n        alternate: "bg-gray-100 text-gray-900"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ProductCard: React.FC<ProductCardProps> = ({
  variant = "default",\n  image,\n  title,\n  price,\n  children,\n  className,\n  ...props
}) => {
  const variants = productcardVariants({ variant, className });
  
  return (
    <div
      className={variants}
      {...props}
    >
      {children}
    </div>
  );
};

ProductCard.defaultProps = {\n  variant: "default"\n};