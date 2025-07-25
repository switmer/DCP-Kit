"use client";
import Link from "next/link";
import { Icon } from "../Icon";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Profile } from "./Profile";
import React, { useEffect, useState } from "react";

export const Nav = () => {
  ("use client");
  const currentUrl = usePathname();

  return (
    <nav className={wrapperNavDesktopStyles + wrapperNavMobileStyles}>
      <Link
        href={"/"}
        className="w-full flex items-center justify-center p-6 max-sm:hidden"
      >
        <Icon name="logo-motif" className="h-8 w-8 text-lime-300" />
      </Link>

      <Link
        href={"/"}
        className={cn(
          "w-full flex items-center justify-center py-4 max-sm:py-1 max-sm:rounded-full hover:bg-white hover:bg-opacity-5 group",
          (currentUrl === "/" || currentUrl.startsWith("/sheet/")) &&
            "bg-opacity-[0.05] bg-lime-300 max-sm:bg-black/80"
        )}
      >
        <Icon
          name="home"
          className={cn(
            "h-7 w-7 text-zinc-600 group-hover:text-lime-300 duration-75 fill-none",
            (currentUrl === "/" || currentUrl.startsWith("/sheet/")) &&
              "text-lime-300"
          )}
        />

        <div
          className={cn(
            "hidden pl-[2px] font-bold text-sm",
            (currentUrl === "/" || currentUrl.startsWith("/sheet/")) &&
              "max-sm:block"
          )}
        >
          Home
        </div>
      </Link>

      <Link
        href={"/crew"}
        className={cn(
          "w-full flex items-center justify-center py-4 max-sm:py-1 max-sm:rounded-full hover:bg-white hover:bg-opacity-5 group",
          currentUrl === "/crew" &&
            "bg-opacity-[0.05] bg-lime-300 max-sm:bg-black/80"
        )}
      >
        <Icon
          name="users"
          className={cn(
            "h-7 w-7 text-zinc-600 group-hover:text-lime-300 duration-75 fill-none",
            currentUrl === "/crew" && "text-lime-300"
          )}
        />

        <div
          className={cn(
            "hidden pl-[2px] font-bold text-sm",
            currentUrl === "/crew" && "max-sm:block"
          )}
        >
          Crew
        </div>
      </Link>

      <Link
        href={"/settings"}
        className={cn(
          "w-full flex items-center justify-center py-4 max-sm:py-1 max-sm:rounded-full hover:bg-white hover:bg-opacity-5 group",
          currentUrl === "/settings" &&
            "bg-opacity-[0.05] bg-lime-300 max-sm:bg-black/80"
        )}
      >
        <Icon
          name="cog"
          className={cn(
            "h-7 w-7 text-zinc-600 group-hover:text-lime-300 duration-75 fill-none",
            currentUrl.includes("/settings") && "text-lime-300"
          )}
        />

        <div
          className={cn(
            "hidden pl-[2px] font-bold text-sm",
            currentUrl.includes("/settings") && "max-sm:block"
          )}
        >
          Settings
        </div>
      </Link>
      <div className="flex-1"></div>
      <Profile />
    </nav>
  );
};

const wrapperNavMobileStyles = `
    max-sm:flex-row
    max-sm:justify-evenly
    max-sm:w-[90%]
    max-sm:h-[60px]
    max-sm:[top:unset]
    max-sm:[left:10px]
    max-sm:[right:10px]
    max-sm:bottom-0
    max-sm:mb-5
    max-sm:mx-auto
    max-sm:px-2
    max-sm:bg-black/40
    max-sm:backdrop-blur-xl
    max-sm:rounded-full
  `;

const wrapperNavDesktopStyles = `
    z-20
    flex
    flex-col
    items-center
    w-[85px]
    fixed
    top-0
    left-0
    bottom-0
    bg-stone-850
    bg-opacity-30
  `;
