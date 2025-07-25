import { cn } from "@/lib/utils";
import React from "react";

export const LoadingIndicator: React.FC<{
  size?: "default" | "small" | "medium" | "xsmall";
  className?: string;
  accent?: boolean;
  dark?: boolean;
}> = ({ size = "default", className, accent, dark }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-full",
        size === "xsmall" && "h-4",
        size === "small" && "h-6",
        size === "default" && "h-[192px]",
        size === "medium" && "h-[72px]"
      )}
    >
      <div
        className={cn(
          "animate-spin loading",
          size === "small" && "loading--small",
          size === "medium" && "loading--medium",
          size === "xsmall" && "loading--xsmall",
          accent && "loading--accent",
          dark && "loading--dark",
          className
        )}
      ></div>
    </div>
  );
};
