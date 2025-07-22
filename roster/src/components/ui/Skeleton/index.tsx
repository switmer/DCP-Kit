import { cn } from "@/lib/utils";
import React from "react";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-white bg-opacity-[0.10] backdrop-blur-md",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
