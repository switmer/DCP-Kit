import { DepartmentStats } from "./DepartmentStats";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PositionOptions } from "./Options";
import { Collapsible } from "@radix-ui/react-collapsible";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";
import { Position } from "@/rules/positions";
import { CrewingPositionType } from "@/types/type";
import { useCrewingStore } from "@/store/crewing";
import { cn } from "@/lib/utils";
import scrollIntoView from "scroll-into-view-if-needed";
import React, { useMemo } from "react";

export const Department: React.FC<{
  department: string;
  positions: Position[];
  openSetup: (p?: CrewingPositionType) => void;
}> = ({ department, positions, openSetup }) => {
  const {
    requiredPositions,
    setFocusCrewingPosition,
    focusCrewingPosition,
    crewingPositions,
  } = useCrewingStore();

  const positionsWithRequired = useMemo(() => {
    return positions.map((position) => ({
      ...position,
      required: requiredPositions.find((p) => p.position === position.position),
    }));
  }, [positions, requiredPositions]);

  return (
    <div className="flex gap-2 flex-col">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="text-white w-full text-[28px] leading-none flex items-center gap-2 [&>svg]:data-[state=open]:rotate-90">
          <Icon
            name="chevron-small"
            className="min-w-[18px] w-[18px] h-[18px] duration-100 text-white text-opacity-40"
          />
          {department}
          <DepartmentStats positions={positionsWithRequired} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="rounded-2xl border border-white border-opacity-10 flex-col flex overflow-hidden">
            <div className="grid grid-cols-[200px_66px_1fr] gap-2 border-b border-b-white border-opacity-10 h-12 items-center px-5">
              <div className="uppercase text-white text-sm font-medium text-opacity-60 font-label">
                Position
              </div>
              <div className="uppercase text-white text-sm font-medium text-opacity-60 font-label flex items-center justify-end px-2">
                Needed
              </div>
              <div className="uppercase text-white text-sm font-medium text-opacity-60 font-label px-2">
                Crew
              </div>
            </div>
            {positionsWithRequired.map((position, i) => {
              const found = position.required;

              return (
                <div
                  className={cn(
                    "grid grid-cols-[200px_66px_1fr] gap-2 border-b-white border-opacity-10 min-h-12 items-start px-5 py-2 relative hover:bg-white hover:bg-opacity-[0.04] cursor-pointer duration-100",
                    "before:content-[''] before:w-[3px] before:bg-white before:top-0 before:left-0 before:bottom-0 before:absolute before:duration-100 before:opacity-0",
                    i !== positions.length - 1 && "border-b",
                    found?.id === focusCrewingPosition?.id &&
                      "bg-white bg-opacity-[0.04] before:opacity-100"
                  )}
                  key={position.position}
                  onClick={() => {
                    setFocusCrewingPosition(found);
                  }}
                  ref={(el) => {
                    if (found?.id === focusCrewingPosition?.id && el) {
                      scrollIntoView(el, {
                        scrollMode: "if-needed",
                        block: "nearest",
                        inline: "nearest",
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  <div className="text-base text-white text-opacity-95 font-semibold flex items-center gap-2 min-h-10">
                    {found?.hiring_status === "completed" ? (
                      <div className="bg-accent rounded-full flex items-center justify-center min-w-[18px] w-[18px] h-[18px]">
                        <Icon
                          className="w-4 h-4 text-zinc-950"
                          name="checkmark-alternative"
                        />
                      </div>
                    ) : (
                      <Icon
                        className="min-w-[18px] w-[18px] h-[18px] text-zinc-500"
                        name="circle-dotted"
                      />
                    )}

                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {position.position}
                    </span>
                  </div>

                  <div className="text-sm text-white text-opacity-20 font-semibold flex justify-end items-center px-2 min-h-10">
                    {found?.quantity}
                  </div>

                  <div className="px-2 flex-1 flex flex-col gap-2">
                    {!!found?.crewing_position_crew?.length && (
                      <PositionOptions
                        position={found}
                        positionTitle={position.position}
                        crewingPositions={crewingPositions ?? null}
                      />
                    )}
                    {["closed", "open"].includes(
                      found?.hiring_status || ""
                    ) && (
                      <div>
                        <Button
                          variant={"outline"}
                          size={"compact"}
                          className="font-semibold gap-1 px-3 inline-flex h-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSetup(found);
                          }}
                        >
                          <Icon
                            name="plus-circle"
                            className="w-5 h-5 text-opacity-60 text-white"
                          />
                          Add options
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
