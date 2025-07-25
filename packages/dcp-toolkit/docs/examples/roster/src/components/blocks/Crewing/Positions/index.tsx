import { useSearchPositions } from "@/store/crew";
import { useCrewingStore } from "@/store/crewing";
import { filterPositions, groupByDepartments } from "@/lib/utils";
import { Position } from "@/rules/positions";
import React, { useEffect, useMemo, useState } from "react";
import { CrewingPositionType } from "@/types/type";

import { Department } from "./Department";

export const Positions: React.FC<{
  openSetup: (p?: CrewingPositionType) => void;
}> = ({ openSetup }) => {
  const [search, setSearch] = useState("");
  const { requiredPositions, setCrewingPositions, crewingPositions } =
    useCrewingStore();
  const { search: searchPositions } = useSearchPositions();

  const groupedAndFiltered = useMemo(() => {
    const targetRules = requiredPositions
      .map((p) => {
        const searchedPosition = searchPositions(p.position ?? "");

        return searchedPosition;
      })
      .filter((p) => !!p);

    return groupByDepartments(
      filterPositions(targetRules as Position[], search?.trim())
    );
  }, [requiredPositions, search, searchPositions]);

  useEffect(() => {
    setCrewingPositions(requiredPositions);
  }, [groupedAndFiltered]);

  return (
    <div className="flex flex-col gap-6 mt-6">
      {Object.entries(groupedAndFiltered).map(([department, positions]) => (
        <Department
          department={department}
          positions={positions}
          openSetup={openSetup}
          key={department}
        />
      ))}
    </div>
  );
};
