"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";

const AlertDialogRoot = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-background/50 backdrop-blur-[4px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "w-full max-w-lg fixed left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%] max-sm:translate-y-[-225px] gap-3 px-8 py-6 bg-stone-950 rounded-3xl backdrop-blur-[24.99px] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    />
  </>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-4 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse mt-4 sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-[22px] font-bold m-0", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-base text-neutral-100 text-opacity-70 m-0", className)}
    {...props}
  />
));
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      buttonVariants({ variant: "accent", size: "compact" }),
      "text-sm font-semibold",
      className
    )}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline", size: "compact" }),
      "text-neutral-300 text-sm font-semibold",
      className
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export const AlertDialog: React.FC<{
  children: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onCancel?: () => void;
  onConfirm: () => Promise<void>;
  isDelete?: boolean;
  withPortal?: boolean;
  asChild?: boolean;
}> = ({
  children,
  title,
  description,
  onCancel,
  onConfirm,
  isDelete,
  actionLabel,
  withPortal = false,
  asChild = false,
}) => {
  if (withPortal) {
    return (
      <AlertDialogRoot>
        <AlertDialogTrigger
          asChild={asChild}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </AlertDialogTrigger>

        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>

              <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="max-sm:flex max-sm:flex-col-reverse max-sm:gap-3">
              <AlertDialogCancel className="px-[14px]" onClick={onCancel}>
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                className={cn(
                  "px-[14px] hover:bg-opacity-80",
                  isDelete && "bg-[#EC6655] hover:bg-[#EC6655]"
                )}
                onClick={onConfirm}
              >
                {isDelete ? "Confirm Delete" : actionLabel ?? "Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialogRoot>
    );
  }

  return (
    <AlertDialogRoot>
      <AlertDialogTrigger
        asChild={asChild}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>

          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="max-sm:flex max-sm:flex-col-reverse max-sm:gap-3">
          <AlertDialogCancel className="px-[14px]" onClick={onCancel}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            className={cn(
              "px-[14px] hover:bg-opacity-80",
              isDelete && "bg-[#EC6655] hover:bg-[#EC6655]"
            )}
            onClick={onConfirm}
          >
            {isDelete ? "Confirm Delete" : actionLabel ?? "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
};
