import { FC, useCallback, useEffect, useState } from "react";
import { ProjectCardView } from "@/components/blocks/ProjectCard/index";
import {
  ProjectMemberType,
  ProjectPositionType,
  ProjectType,
} from "@/types/type";
import { createClient } from "@/lib/supabase/client";
import { ProjectCardCrewTable } from "@/components/blocks/ProjectCard/ProjectCardCrewTable";

type Props = {
  project: ProjectType;
  view: ProjectCardView;
  setViewCallback: (view: ProjectCardView) => void;
};

export const ProjectCardCrewList: FC<Props> = (props) => {
  const [selectedMember, setSelectedMember] = useState(null);

  const [crew, setCrew] = useState<
    (ProjectPositionType & {
      project_member?: ProjectMemberType | null;
      call_sheet_member?: { id: string }[];
    })[]
  >([]);
  const [openPositions, setOpenPositions] = useState(false);
  const supabase = createClient();

  const fetchCrew = useCallback(() => {
    supabase
      .from("project_position")
      .select("*, call_sheet_member(id), project_member(*)")
      .eq("project", props.project.id)
      .then(({ data }) => setCrew(data ?? []));
  }, [props.project.id, supabase]);

  useEffect(() => {
    fetchCrew();
  }, [props.project.id]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // //-- if we're in profile view, prevent default behavior and close the sidebar.
      // if (props.view === "profile") {
      //   event.preventDefault();
      //   setSelectedMember(null);
      //   props.setViewCallback("crew");
      // }

      if (props.view === "crew") {
        event.preventDefault();
        props.setViewCallback("project");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [props.view]);

  return (
    <>
      <div className="flex flex-col gap-2 bg-[#151515] rounded-2xl p-4 max-sm:relative max-sm:top-[40px]">
        <div className="flex items-center gap-2">
          <div className="text-2xl text-white px-4 pt-3 pb-0 mb-0">
            Crew List
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <ProjectCardCrewTable
            data={crew}
            onUpdate={fetchCrew}
            projectId={props.project.id}
          />
        </div>
      </div>
    </>
  );
};
