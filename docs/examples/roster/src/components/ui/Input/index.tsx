import * as React from "react";
import { Field, FieldAttributes } from "formik";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    FieldAttributes<any> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <Field
        autoComplete="off"
        type={type}
        className={cn(
          "flex h-14 w-full rounded-lg border-transparent border-[1.5px] duration-50 bg-zinc-900 p-4 text-md ring-offset-transparent placeholder:text-zinc-600 focus:border-white outline-none focus-visible:outline-none focus:ring-4 focus:ring-[#4e46b4] focus:ring-opacity-20 focus:rounded-xl focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
