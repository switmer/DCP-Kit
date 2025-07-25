import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

const buttonVariants = cva(
  "inline-flex items-center gap-4 justify-center whitespace-nowrap rounded-xl text-md font-primary font-bold focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary-foreground text-primary hover:opacity-90 disabled:text-primary-foreground disabled:bg-white disabled:bg-opacity-[0.08] disabled:pointer-events-none",
        secondary: "bg-white bg-opacity-5",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent hover:opacity-70 duration-150",
        outline:
          "bg-transparent text-neutral-300 border border-white border-opacity-30 font-medium",

        outlineAccent:
          "shadow border border-lime-300 border-opacity-20 bg-transparent text-lime-300 text-opacity-90 text-sm font-semibold",
        outlineAccentAlt:
          "rounded-2xl shadow border border-accent border-opacity-20 bg-transparent text-accent text-opacity-90",
        ghost: "bg-transparent text-white font-600 text-md",
        danger: "bg-[#EC6655] hover:bg-[#EC6655] text-[#EC6655]",
        alert: "bg-yellow-400 hover:bg-yellow-400 text-stone-950",
      },
      size: {
        default: "h-14 px-4",
        medium: "h-[50px] text-base",
        compact: "h-[42px] text-[15px]",
        small: "h-[34px] text-[13px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
