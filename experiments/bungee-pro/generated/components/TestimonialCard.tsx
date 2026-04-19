import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface TestimonialCardProps {\n  /** Reviewer photo URL */\n  image: string;\n  /** Testimonial quote text */\n  quote: string;\n  /** Reviewer name */\n  name: string;\n  /** Reviewer role/title */\n  role?: string;\n  children?: React.ReactNode;\n  & VariantProps<typeof testimonialcardVariants>\n}

const testimonialcardVariants = cva(
  "rounded-lg bg-white shadow",
  {
    variants: {
      variant: {\n        default: "bg-gray-500"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  image,\n  quote,\n  name,\n  role,\n  children,\n  className,\n  ...props
}) => {
  const variants = testimonialcardVariants({ variant, className });
  
  return (
    <div
      className={variants}
      {...props}
    >
      {children}
    </div>
  );
};