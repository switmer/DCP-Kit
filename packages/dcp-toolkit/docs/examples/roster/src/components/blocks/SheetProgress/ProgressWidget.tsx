import { Icon } from "@/components/ui/Icon";
import { Pdf } from "@/components/ui/Pdf";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import React, { useEffect, useMemo, useState } from "react";
import { capitalizeString, cn } from "@/lib/utils";
import { useRouter } from "next-nprogress-bar";
import { useCallSheetProgressStore } from "@/store/callsheet-progress";
import { CallSheetType } from "@/types/type";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePathname } from "next/navigation";

export const ProgressWidget = () => {
  const { callSheets } = useCallSheetProgressStore();
  return (
    <div className="fixed bottom-6 right-[25px] flex flex-col gap-3 items-end">
      {callSheets.map((callSheet, i) => (
        <ProgressWidgetItem key={callSheet?.id ?? i} sheet={callSheet} />
      ))}
    </div>
  );
};

const ProgressWidgetItem = ({ sheet }: { sheet: CallSheetType }) => {
  const [minimized, setMinimized] = useState(false);
  const { removeCallSheet } = useCallSheetProgressStore();

  const router = useRouter();
  const pathName = usePathname();

  const { status, src, short_id } = sheet ?? {};
  /* @ts-ignore */
  const name = sheet?.raw_json?.job_name;

  const statusText = useMemo(() => {
    if (!status) return "Uploading call sheet";
    if (!minimized && !!status) return "Parsing call sheet";
    if (minimized) {
      switch (status) {
        case "parsing":
          return "Extracting all the details";
        case "processing":
          return "Generating call cards";
        default:
          return "";
      }
    }
    return "";
  }, [status, minimized]);

  useEffect(() => {
    if (status === "ready" && pathName.includes(`/sheet/${short_id}`)) {
      window.location.href = window.location.href;
      removeCallSheet(sheet.id);
    }
  }, [status]);

  if (status === "ready")
    return (
      <div
        className="bg-[#0f0f10] rounded-2xl flex p-3 items-start gap-2 w-[350px] max-w-full relative overflow-hidden pr-9 cursor-pointer"
        onClick={() => {
          router.push(`/sheet/${short_id}`);
          removeCallSheet(sheet.id);
        }}
      >
        <div className="w-[60px] aspect-[1/1.28] overflow-hidden relative">
          <div className="pointer-events-none rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 right-0 bottom-0"></div>
            {src && (
              <Pdf
                wrapperClassName="p-0"
                sheetSrc={src}
                ratio={1 / 1.28}
                rounded={false}
              />
            )}
          </div>
          {src && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/sheet/${short_id}`);
                removeCallSheet(sheet.id);
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-[#1d1b1c] bg-opacity-60 rounded-[16px] backdrop-blur-2xl flex-col justify-center items-center inline-flex cursor-pointer"
            >
              <Icon name="expand" className="text-lime-300 w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1 pt-[2px]">
          <div className="flex items-center gap-1 text-accent uppercase text-xs font-medium font-label">
            <Icon name="checkmark" className="w-4 h-4" />
            COMPLETED
          </div>
          <div className="text-white/95 text-base font-medium">
            {name ?? "Untitled Call Sheet"}
          </div>
        </div>
        <button
          className="w-4 h-4 flex items-center justify-center absolute top-2.5 right-2.5 text-white/40 hover:text-white duration-100"
          onClick={(e) => {
            e.stopPropagation();
            removeCallSheet(sheet.id);
          }}
        >
          <Icon name="cross" className="w-4 h-4" />
        </button>
      </div>
    );

  if (minimized)
    return (
      <div className="px-3 h-12 flex items-center gap-3 w-[320px] max-w-full bg-[#0f0f10] rounded-[16px] overflow-hidden relative z-[100]">
        <div className="w-6 h-6 flex items-center justify-center ml-3">
          <LoadingIndicator size="small" accent />
        </div>
        <div className="text-white text-base font-semibold flex-1">
          {statusText}
        </div>
        <button
          onClick={() => {
            setMinimized(false);
          }}
          className="w-6 h-6 flex items-center justify-center"
        >
          <Icon name="expand" className="text-lime-300 w-8 h-8" />
        </button>
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
    );

  return (
    <div className="max-w-full w-[600px] bg-[#0f0f10] rounded-3xl flex-col flex gap-2">
      <div className="flex justify-between items-center h-[70px] px-4 pl-6">
        <div className="flex items-center gap-3 text-white text-[22px] font-medium w-fit">
          {statusText}{" "}
          <div className="w-6 h-6 flex items-center justify-center">
            <LoadingIndicator size="small" accent />
          </div>
        </div>
        <button
          className="h-9 w-9 bg-[#1b1b1c]/80 rounded-md justify-center items-center flex group"
          onClick={() => setMinimized(true)}
        >
          <Icon
            name="chevron-small"
            className="w-6 h-6 text-white text-opacity-80 group-hover:text-opacity-100 duration-150 rotate-[90deg]"
          />
        </button>
      </div>
      <div className="flex items-start justify-between px-4 pb-4">
        <div className="flex-1 flex flex-col justify-center gap-1 h-[200px] px-4">
          <CallSheetLoadingStep
            done={!!status}
            active={!status}
            text="Uploading call sheet"
          />

          <CallSheetLoadingStep
            done={!!status && status !== "parsing"}
            active={status === "parsing"}
            text="Extracting all the details"
          />

          <CallSheetLoadingStep
            active={status === "processing"}
            text="Generating call cards"
            last
          />
        </div>
        <div className="w-[220px] aspect-[1/1.28] overflow-hidden relative bg-stone-900 bg-opacity-60 rounded-[20px]">
          <div className="pointer-events-none">
            <div className="absolute left-0 top-0 right-0 bottom-0">
              <Skeleton className="w-[220px] aspect-[1/1.28]" />
            </div>
            {src && (
              <Pdf
                wrapperClassName="p-0"
                sheetSrc={src}
                ratio={1 / 1.28}
                rounded={false}
              />
            )}
          </div>
          {src && (
            <button
              onClick={() => {
                router.push(`/sheet/${short_id}`);
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56px] h-[56px] bg-[#1d1b1c] bg-opacity-60 rounded-2xl backdrop-blur-2xl flex-col justify-center items-center inline-flex cursor-pointer"
            >
              <Icon name="expand" className="text-lime-300 w-8 h-8" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CallSheetLoadingStep: React.FC<{
  active?: boolean;
  done?: boolean;
  text: string;
  last?: boolean;
}> = ({ active, done, text, last }) => {
  const icon = done ? "check" : "circle";

  return (
    <div className={cn("flex flex-col gap-1", !last && "mb-1")}>
      <div className="flex items-center gap-4">
        {active ? (
          <div className="w-6 h-6">
            <LoadingIndicator size="small" accent />
          </div>
        ) : (
          <Icon name={icon} className="w-6 h-6" />
        )}

        <p
          className={`text-xl text-neutral-200 max-sm:text-md ${
            !active && !done && "text-opacity-60"
          } ${active && "font-bold"}`}
        >
          {text}
        </p>
      </div>

      {!last && (
        <div className="w-6 flex justify-center">
          <div
            className={`w-[2px] h-[26px] bg-neutral-200 bg-opacity-20 max-sm:h-[12px] ${
              done && `!bg-lime-300 !bg-opacity-100`
            } rounded-sm`}
          />
        </div>
      )}
    </div>
  );
};
