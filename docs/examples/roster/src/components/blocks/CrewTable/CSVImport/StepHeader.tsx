"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const StepHeader: React.FC<{ n: number; title: string; className?: string }> = ({
  n,
  title,
  className,
}) => (
  <h3
    className={cn(
      "flex items-center gap-2 mb-4 text-lg font-medium text-white",
      className
    )}
  >
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3a4222] text-[#e6ff5a] text-lg font-bold">
      {n}
    </span>
    {title}
  </h3>
); 