import { Icon } from "@/components/ui/Icon";
import { CrewingPositionType } from "@/types/type";
import { useMemo } from "react";

export const DepartmentStats: React.FC<{
  positions: {
    required: CrewingPositionType | undefined;
    position: string;
    overridePosition?: string | null | undefined;
    departments: string[];
    aliases: string[];
  }[];
}> = ({ positions }) => {
  const stats = useMemo(() => {
    return [
      {
        use: "Positions without crew options set",
        icon: "circle-dotted",
        color: "text-orange-600",
        count: positions.filter(
          (p) => !p.required?.crewing_position_crew?.length
        ).length,
      },
      {
        use: "Positions with crew options not yet contacted",
        icon: "send-wait",
        color: "text-current",
        count: positions.filter((p) => p.required?.hiring_status === "open")
          .length,
      },
      {
        use: "Crew options contacted, awaiting response",
        icon: "clock",
        color: "text-current",
        count: positions.filter(
          (p) => p.required?.hiring_status === "in_progress"
        ).length,
      },
      {
        use: "Confirmed",
        icon: "check",
        color: "text-accent",
        count: positions.filter(
          (p) => p.required?.hiring_status === "completed"
        ).length,
      },
    ];
  }, [positions]);

  return (
    <div className="px-6 gap-6 flex items-center flex-1">
      <div className="flex-1 h-2 bg-crewing-pattern"></div>
      <div className="flex items-center gap-4">
        {stats.map((s) => (
          <div
            key={s.use}
            className={`flex gap-1 ${s.color} text-base items-center`}
          >
            <Icon className="w-5 h-5 text-current font-label" name={s.icon} />
            {s.count}
          </div>
        ))}
      </div>
    </div>
  );
};
