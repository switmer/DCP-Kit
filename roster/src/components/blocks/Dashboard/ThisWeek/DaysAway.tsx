import { FC } from "react";
import { ProjectType } from "@/types/type";
import { Icon } from "@/components/ui/Icon";
import { PulsingCircle } from "@/components/ui/PulsingCircle/PulsingCircle";

type Props = {
  callSheetDate: string;
};

export const DaysAway: FC<Props> = (props) => {
  const start = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  //-- create a new date set at midnight in local time.
  const end = new Date(
    new Date(props.callSheetDate as string).getFullYear(),
    new Date(props.callSheetDate as string).getMonth(),
    new Date(props.callSheetDate as string).getDate()
  );

  const differenceInTime = (end as any) - (start as any);
  const differenceInDays = Math.ceil(differenceInTime / (1000 * 60 * 60 * 24));

  if (differenceInDays === 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(37,43,18,0.5)]">
        {/*<Icon name="active-circle" className="w-4 h-4 text-lime-300" />*/}
        <PulsingCircle />

        <div className="text-[14px] font-medium text-lime-300">TODAY</div>
      </div>
    );
  }

  if (differenceInDays === 1) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(37,43,18,0.5)]">
        {/*<Icon name="active-circle" className="w-4 h-4 text-lime-300" />*/}
        <PulsingCircle />

        <div className="text-[14px] font-medium text-lime-300">TOMORROW</div>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 rounded-md bg-lime-300/5">
      <div className="text-sm font-medium">{`In ${differenceInDays} days`}</div>
    </div>
  );
};
