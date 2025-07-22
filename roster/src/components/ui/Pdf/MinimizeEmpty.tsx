import React, { FC } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

type Props = {
  className?: string;
  handleMakePDFClick: () => void;
  isLoading: boolean;
};

export const MinimizeEmpty: FC<Props> = (props) => {
  return (
    <div
      className={cn(
        "group right-4 bottom-4 fixed z-50 w-[118px] h-[170px] cursor-pointer",
        props.className
      )}
      onClick={props.handleMakePDFClick}
    >
      <div className="h-full p-2 bg-white bg-opacity-10 rounded-[10px] backdrop-blur-sm">
        <div className="pb-2 text-stone-300 text-xs font-medium flex justify-between">
          Call Sheet
          <div className="w-8 h-4 px-1.5 py-0.5 bg-white bg-opacity-20 rounded justify-center items-center inline-flex">
            <div className="text-center text-white text-[10px] ">PDF</div>
          </div>
        </div>

        <div className="h-[130px] bg-lime-300/15 rounded-[8px] pointer-events-none"></div>
      </div>

      <div
        className={cn(
          "absolute mt-2 left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 p-2 bg-stone-900 rounded-2xl backdrop-blur-2xl cursor-pointer"
          // props.isLoading && "top-1/2"
        )}
      >
        {!props.isLoading ? (
          <Icon
            name="wizard-wand"
            className="w-5 h-5 text-lime-300/65 group-hover:text-lime-300/90"
          />
        ) : (
          <LoadingIndicator size="small" />
        )}
      </div>

      {!props.isLoading && (
        <div
          className={cn(
            "absolute top-[110px] left-[22px] text-lime-300/80 font-bold group-hover:text-lime-300/100"
          )}
        >
          Generate
        </div>
      )}
    </div>
  );
};
