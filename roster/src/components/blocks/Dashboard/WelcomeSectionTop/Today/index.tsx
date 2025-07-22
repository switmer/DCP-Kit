import { format } from "date-fns";
import { FC } from "react";
import { cn } from "@/lib/utils";

type Props = {
  mobile: boolean;
};

export const Today: FC<Props> = (props) => {
  return (
    <div className="flex flex-col w-full">
      {props.mobile && <div className="text-2xl font-bold">Today</div>}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "text-xl text-stone-400/80 font-medium",
            !props.mobile && "text-white"
          )}
        >
          {props.mobile
            ? format(new Date().toISOString(), "EEEE, MMM d")
            : format(new Date().toISOString(), "EEE, MMM d")}
        </div>

        {/* TODO: implement. */}
        {/*<div>weather</div>*/}
      </div>
    </div>
  );
};
