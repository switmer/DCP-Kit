import { useCrewingStore } from "@/store/crewing";
import useOutsideClick from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { Automation } from "./Automation";
import { Crew } from "./Crew";
import { TextMessage } from "./TextMessage";
import { AvailabilityCheck } from "./AvailabilityCheck";
import { Navigation } from "./Navigation";
import { Status } from "./Status";
import { Header } from "./Header";
import React, { useMemo } from "react";
import { CrewingPositionType } from "@/types/type";

export const Sidebar: React.FC<{
  openSetup: (p?: CrewingPositionType) => void;
}> = ({ openSetup }) => {
  const {
    focusCrewingPosition: fcp,
    setFocusCrewingPosition,
    requiredPositions,
  } = useCrewingStore();

  const focusCrewingPosition = useMemo(() => {
    return requiredPositions.find((p) => p.id === fcp?.id) ?? fcp;
  }, [fcp, requiredPositions]);

  const ref = useOutsideClick(() => {
    if (!focusCrewingPosition) return;

    setFocusCrewingPosition(null);
  });

  return (
    <div ref={ref}>
      <div
        className={cn(
          "max-w-[500px] overflow-y-auto w-full  z-50 p-8 bg-stone-950 rounded-3xl gap-6 flex flex-col top-0 right-0 bottom-0 fixed translate-x-[100%] opacity-0 duration-300",
          focusCrewingPosition && "translate-x-0 opacity-100"
        )}
      >
        <div className="flex flex-col gap-6">
          <div className="flex gap-3 flex-col">
            {!!focusCrewingPosition?.position && (
              <Header position={focusCrewingPosition?.position} />
            )}

            <div className="flex flex-col gap-4">
              <Status />
              <Navigation />
            </div>
          </div>
          {["open", "closed"].includes(
            focusCrewingPosition?.hiring_status ?? ""
          ) && (
            <>
              <Automation />
              <Crew openSetup={openSetup} />
              <TextMessage />
              <AvailabilityCheck />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
