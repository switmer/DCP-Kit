"use client";
import { cn } from "@/lib/utils";
import React from "react";

export const StepCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "rounded-xl p-6 bg-zinc-900/50 space-y-4",
      className
    )}
    {...props}
  />
); 