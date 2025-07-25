"use client";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { ProgressWidget } from "./ProgressWidget";
import { useCallSheetProgressStore } from "@/store/callsheet-progress";
import { usePathname } from "next/navigation";
import { useCompanyStore } from "@/store/company";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

export const SheetProgress = () => {
  const pathName = usePathname();
  const { activeCompany } = useCompanyStore();
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  const {
    fetchCallSheets,
    updateCallSheet,
    bulkUploadCallSheets,
    bulkUploadCallSheetsTotal,
    removeCallSheet,
  } = useCallSheetProgressStore();

  useEffect(() => {
    if (!activeCompany || !!realtimeRef.current) {
      console.log("[sheet-progress] Skipping subscription setup:", {
        activeCompany,
        existingSubscription: !!realtimeRef.current,
      });
      return;
    }

    const supabase = createClient();

    console.log(
      "[sheet-progress] Setting up subscription for company:",
      activeCompany
    );

    realtimeRef.current = supabase
      .channel("call_sheet")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sheet",
          filter: `company=eq.${activeCompany}`,
        },

        (payload) => {
          console.log("[sheet-progress] Received payload:", payload);
          if (
            ["ready", "parsing", "error", "processing"].includes(
              /* @ts-ignore */
              payload?.new?.status
            )
          ) {
            /* @ts-ignore */
            if (
              ["ready", "error"].includes(
                /* @ts-ignore */
                payload?.new?.status
              )
            ) {
              /* @ts-ignore */
              if (payload?.new?.status === "error") {
                toast.error(
                  "Something went wrong processing the call sheet. Please try again.",
                  {
                    duration: 30000,
                  }
                );
                /* @ts-ignore */
                removeCallSheet(payload?.new?.id);
              } else {
                /* @ts-ignore */
                updateCallSheet(payload?.new?.id, {
                  /* @ts-ignore */
                  raw_json: payload?.new?.raw_json,
                });
              }
            }
            fetchCallSheets();
          }
        }
      )
      .subscribe((status) => {
        console.log("[sheet-progress] Subscription status:", status);
      });

    return () => {
      console.log("[sheet-progress] Unsubscribing and cleaning up");
      realtimeRef.current?.unsubscribe();
      realtimeRef.current = null;
    };
  }, [activeCompany]);

  useEffect(() => {
    fetchCallSheets();
  }, [fetchCallSheets]);

  if (["/auth"].some((path) => pathName.startsWith(path))) return null;

  return (
    <>
      <ProgressWidget />
      <div
        className={cn(
          "duration-200 overflow-hidden pointer-events-none max-w-[380px] w-full min-h-12 p-3 pl-6 bg-stone-900 bg-opacity-70 rounded-2xl backdrop-blur-2xl justify-between items-center gap-3 flex fixed bottom-6 left-1/2 -translate-x-1/2",
          bulkUploadCallSheets.length
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-[88px] opacity-0"
        )}
      >
        <div className="w-6">
          <LoadingIndicator size="small" accent />
        </div>

        <div className="text-white text-base font-semibold">
          Parsing call sheets
        </div>

        {bulkUploadCallSheets.length > 0 && (
          <>
            <div className="w-auto h-6 px-2 py-0.5 bg-lime-300 bg-opacity-10 rounded-xl backdrop-blur-sm justify-center items-center gap-1 inline-flex">
              <div className="text-lime-300 text-[13px] font-normal leading-tight">
                {bulkUploadCallSheets.length} left
                {bulkUploadCallSheetsTotal > 0 &&
                  ` out of ${bulkUploadCallSheetsTotal}`}
              </div>
            </div>
          </>
        )}
        <svg
          className="absolute left-1/2 -translate-x-1/2 bottom-0"
          width="213"
          height="2"
          viewBox="0 0 213 2"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.5 2C0.947718 2 0.5 1.55228 0.5 1C0.5 0.447715 0.947715 0 1.5 0L211.5 0C212.052 0 212.5 0.447715 212.5 1C212.5 1.55228 212.052 2 211.5 2L1.5 2Z"
            fill="url(#paint0_linear_2283_246264)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_2283_246264"
              x1="0.5"
              y1="1"
              x2="212.5"
              y2="1"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#CAFC66" stopOpacity="0" />
              <stop offset="0.5" stopColor="#CAFC66" />
              <stop offset="1" stopColor="#CAFC66" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
};
