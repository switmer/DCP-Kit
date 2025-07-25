import { useCrewingStore } from "@/store/crewing";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export const Status = () => {
  const {
    focusCrewingPosition: fcp, requiredPositions,
  } = useCrewingStore();

  const focusCrewingPosition = useMemo(() => {
    return requiredPositions.find((p) => p.id === fcp?.id) ?? fcp;
  }, [fcp, requiredPositions]);

  return (
    <div className="flex gap items-center">
      <div className="w-[65px] text-white/opacity-60 text-sm font-medium leading-none">
        Status
      </div>
      <div className="flex gap-2 items-center">
        {["open", "closed"].includes(
          focusCrewingPosition?.hiring_status ?? ""
        ) && (
            <>
              <div className={cn("flex items-center justify-center")}>
                <Icon
                  name="send-circle"
                  className={cn(
                    "w-[22px] h-[22px] text-white text-opacity-40 fill-none"
                  )} />
              </div>
              <div className="text-white text-opacity-40 text-base">
                Not yet sent
              </div>
            </>
          )}
        {focusCrewingPosition?.hiring_status === "in_progress" && (
          <>
            <div className={cn("flex items-center justify-center")}>
              <Icon
                name="clock"
                className={cn(
                  "w-[22px] h-[22px] text-white text-opacity-40 fill-none"
                )} />
            </div>
            <div className="text-white text-opacity-40 text-base">
              In Progress
            </div>
          </>
        )}
        {focusCrewingPosition?.hiring_status === "completed" && (
          <>
            <div className={cn("flex items-center justify-center")}>
              <Icon
                name="check"
                className={cn(
                  "w-[22px] h-[22px] text-white text-opacity-40 fill-none"
                )} />
            </div>
            <div className="text-white text-opacity-40 text-base">
              Completed
            </div>
          </>
        )}
      </div>
    </div>
  );
};
