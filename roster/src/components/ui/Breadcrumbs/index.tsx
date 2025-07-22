"use client";
import Link from "next/link";
import React from "react";
import { Icon } from "../Icon";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export const Breadcrumbs: React.FC<{
  name?: string | null;
  items: {
    name?: string | null;
    href: string;
    onClick?: () => void;
  }[];
}> = ({ items, name }) => {
  const pathName = usePathname();

  return (
    <div className="flex gap-2 items-center max-sm:hidden">
      <Link
        href={"/"}
        className="flex text-zinc-600 hover:text-white duration-100 cursor-pointer text-sm leading-none gap-2 items-center"
      >
        <Icon name="home" className="w-5 h-5" />

        {name}
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <Icon name="chevron-small" className={cn("w-5 h-5 text-zinc-600")} />

          <Link
            href={item.href}
            onClick={item.onClick}
            className={cn(
              "flex text-zinc-600 duration-100 text-sm leading-none gap-2 items-center",
              pathName === item.href && "text-white"
            )}
          >
            {item.name}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
};
