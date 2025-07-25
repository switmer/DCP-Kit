import { Icon } from "@/components/ui/Icon";
import { Pdf } from "@/components/ui/Pdf";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import React from "react";

export const CallSheetLoading: React.FC<{
  src?: string | null;
  sheetSrc: string;
  status: "ready" | "draft" | "parsing" | "error" | "processing";
}> = ({ src, sheetSrc, status }) => {
  return (
    <div className="w-full flex-col lg:flex-row flex flex-1 gap-[56px] pt-4 sm:pt-12">
      <div className="flex flex-col gap-[62px] w-full lg:w-[55%]">
        <h3 className="text-[38px] leading-snug">Okay, just a minute...</h3>
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <CallSheetLoadingStep
              done={!!status}
              active={!status}
              text="Uploading call sheet"
            />

            <CallSheetLoadingStep
              done={status !== "draft"}
              active={status === "draft"}
              text="Spinning up some AI magic"
            />

            <CallSheetLoadingStep
              done={!["draft", "parsing"].includes(status)}
              active={status === "parsing"}
              text="Extracting all the details"
            />

            <CallSheetLoadingStep
              done={status === "ready"}
              active={status === "processing"}
              text="Generating call cards"
              last
            />
          </div>
        </div>
      </div>

      {sheetSrc && (
        <div className="flex-1 justify-center items-center w-full h-full">
          <Pdf
            sheetSrc={sheetSrc}
            ratio={1 / 1.28}
            className="flex justify-center items-center w-full h-full"
          />
        </div>
      )}
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-4">
        {active ? (
          <div className="w-6 h-6">
            <LoadingIndicator size="small" accent />
          </div>
        ) : (
          <Icon name={icon} className="w-6 h-6" />
        )}
        <p
          className={`text-xl text-neutral-200 ${
            !active && !done && "text-opacity-60"
          } ${active && "font-bold"}`}
        >
          {text}
        </p>
      </div>
      {!last && (
        <div className="w-6 flex justify-center">
          <div
            className={`w-[2px] h-[26px] bg-neutral-200 !bg-opacity-60 ${
              done && `!bg-lime-300`
            } rounded-sm`}
          />
        </div>
      )}
    </div>
  );
};
