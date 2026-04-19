import React from 'react';\nimport { styled } from '@/lib/styled';\nimport { cn } from '@/lib/utils';\nimport { cva, type VariantProps } from 'class-variance-authority';

export interface ProjectCardProps {\n  /** Project cover image URL */\n  image: string;\n  /** Project logo URL (overlay on hover) */\n  logo?: string;\n  /** Project title */\n  title: string;\n  /** Project date label */\n  date: string;\n  children?: React.ReactNode;\n  & VariantProps<typeof projectcardVariants>\n}

const projectcardVariants = cva(
  "rounded-lg bg-white shadow",
  {
    variants: {
      variant: {\n        default: "text-gray-500"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);\n
export const ProjectCard: React.FC<ProjectCardProps> = ({
  image,\n  logo,\n  title,\n  date,\n  children,\n  className,\n  ...props
}) => {
  const variants = projectcardVariants({ variant, className });
  
  return (
    <div
      className={variants}
      {...props}
    >
      {children}
    </div>
  );
};