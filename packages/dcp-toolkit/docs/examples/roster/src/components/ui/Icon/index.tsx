import { cn } from "@/lib/utils";
import React from "react";

export const Icon: React.FC<{ name: string; className?: string }> = ({
  name,
  className,
}) => {
  return (
    <svg className={cn("fill-none", className)}>
      <use href={`/sprite.svg#icon-${name}`}></use>
    </svg>
  );
};
