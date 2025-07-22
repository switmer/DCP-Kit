"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          success: "text-lime-300",
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:bg-opacity-0 group-[.toaster]:text-white group-[.toaster]:text-opacity-95 group-[.toaster]:text-sm group-[.toaster]:border group-[.toaster]:border-white group-[.toaster]:border-opacity-10 group-[.toaster]:backdrop-blur-md group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-2xl",
          description:
            "group-[.toast]:text-white group-[.toast]:text-opacity-95 group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:border group-[.toast]:border-white group-[.toast]:border-opacity-20 group-[.toast]:bg-opacity-0 group-[.toast]:text-white group-[.toast]:text-opacity-95",
          cancelButton:
            "group-[.toast]:bg-white group-[.toast]:border group-[.toast]:border-white group-[.toast]:border-opacity-20 group-[.toast]:bg-opacity-0 group-[.toast]:text-white group-[.toast]:text-opacity-95",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
