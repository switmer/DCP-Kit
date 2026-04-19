import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface CategoryTileProps {\n  /** Category hero image URL */\n  image: string;\n  /** Category label (e.g., 'HELMETS') */\n  label: string;\n  /** Category page URL */\n  href: string;\n  children?: React.ReactNode;\n  & VariantProps<typeof categorytileVariants>\n}

const categorytileVariants = cva(
  "rounded-lg bg-white shadow",
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
export const CategoryTile: React.FC<CategoryTileProps> = ({
  image,\n  label,\n  href,\n  children,\n  className,\n  ...props
}) => {
  const variants = categorytileVariants({ variant, className });
  
  return (
    <div
      className={variants}
      {...props}
    >
      {children}
    </div>
  );
};