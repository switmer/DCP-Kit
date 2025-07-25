import { ProjectMemberType, ProjectPositionType } from "@/types/type";
import { useEffect, useState } from "react";
import { capitalizeString } from "@/lib/utils";

type CrewMember = ProjectPositionType & {
  project_member?: ProjectMemberType | null;
  call_sheet_member?: { id: string }[];
};

export const ProjectCardCrewTable = ({
  data,
}: {
  data: CrewMember[];
  onUpdate: () => void;
  projectId: string;
}) => {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  if (!localData.length)
    return (
      <div className="">No crew members assigned to this project yet.</div>
    );

  const renderStatusTag = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <div
            className="w-auto h-auto px-3 text-sm font-bold rounded-full"
            style={{
              backgroundColor: "#45403099",
              color: "rgba(253,186,116,.9)",
              border: "1px solid rgba(253,186,116,.7)",
            }}
          >
            Pending
          </div>
        );

      case "confirmed":
        return (
          <div
            className="w-auto h-auto px-3 text-sm font-bold rounded-full"
            style={{
              backgroundColor: "#324235",
              color: "rgba(93,191,103,.9)",
              border: "1px solid rgba(93,191,103,.7)",
            }}
          >
            Confirmed
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col p-4 gap-4">
      {localData.map((member) => {
        return (
          <div key={member.id} className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="font-bold text-[18px]">
                {member?.project_member?.name &&
                  capitalizeString(member.project_member.name)}
              </div>

              <div className="font-medium text-sm text-white/60">
                {member.title && capitalizeString(member.title)}
              </div>
            </div>

            {renderStatusTag("pending")}
          </div>
        );
      })}
    </div>
  );
};
