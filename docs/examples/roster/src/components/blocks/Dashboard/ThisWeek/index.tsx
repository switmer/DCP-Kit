import { FC, useEffect, useMemo, useState } from "react";
import {
  CallSheetMemberType,
  CallSheetType,
  CompanyCrewMemberType,
  CrewingContactAttempt,
  CrewingPositionCrew,
  CrewingPositionType,
  ProjectType,
} from "@/types/type";
import { ProjectSheetCard } from "@/components/blocks/Dashboard/ThisWeek/ProjectSheetCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { createPositionCrewMap } from "@/components/blocks/Crewing/SetOptionsFor/createPositionCrewMap";
import { toast } from "sonner";

type Props = {
  projects: (ProjectType & {
    call_sheet?: CallSheetType[] | null;
    members?: any[];
    membersCount?: number | null;
    callSheet?: string | null;
    callSheetId?: string | null;
    callSheetDate?: string | null;
    historical?: boolean | null;
    day_of_days?: string | null;
    callSheetMembers?: CallSheetMemberType[] | null;
  })[];
  loading: boolean;
};

export const ThisWeek: FC<Props> = (props) => {
  const [crewingPositions, setCrewingPositions] = useState<
    [string, { [key: string]: CompanyCrewMemberType[] }][]
  >([]);
  const [stagedCrew, setStagedCrew] = useState<
    [string, { [key: string]: CrewingPositionCrew[] }][]
  >([]);
  const [contactedCrew, setContactedCrew] = useState<CrewingContactAttempt[]>(
    []
  );

  const supabase = createClient();

  const filteredProjects = useMemo(() => {
    const today = new Date();

    today.setHours(0, 0, 0, 0); //-- set to midnight for consistent date checks.

    return props.projects
      .map((project) => {
        const validCallSheets = project.call_sheet?.filter((sheet) => {
          if (sheet.historical) return false;

          const callSheetDate = new Date(sheet.date as string);
          callSheetDate.setHours(0, 0, 0, 0);

          const differenceInDays = Math.ceil(
            (callSheetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          return differenceInDays >= 0 && differenceInDays <= 7;
        });

        return validCallSheets && validCallSheets.length > 0
          ? {
              ...project,
              call_sheet: validCallSheets.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : Infinity;
                const dateB = b.date ? new Date(b.date).getTime() : Infinity;
                return dateA - dateB;
              }),
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = a?.call_sheet?.[0]?.date
          ? new Date(a.call_sheet[0].date).getTime()
          : Infinity; //-- if somehow missing, push to end.
        const dateB = b?.call_sheet?.[0]?.date
          ? new Date(b.call_sheet[0].date).getTime()
          : Infinity;

        return dateA - dateB;
      });
  }, [props.projects]);

  const projectsCrewingIds = useMemo(() => {
    return filteredProjects
      .filter((p) => !p?.callSheet && p?.id)
      .map((p) => p?.id);
  }, [filteredProjects]);

  useEffect(() => {
    const fetchCrewingPositions = async () => {
      const results = await Promise.all(
        projectsCrewingIds
          //-- filter out undefined.
          .filter((projectId): projectId is string => !!projectId)
          .map(async (projectId) => {
            const positionData = await createPositionCrewMap(
              supabase,
              projectId,
              "positionData"
            );

            return [projectId, positionData];
          })
      );

      setCrewingPositions(
        results as [string, { [key: string]: CompanyCrewMemberType[] }][]
      );
    };

    if (projectsCrewingIds.length > 0) {
      fetchCrewingPositions();
    }
  }, [projectsCrewingIds]);

  useEffect(() => {
    const fetchCrewPositionData = async () => {
      const results = await Promise.all(
        crewingPositions.map(async (p) => {
          const crewPositionData = await createPositionCrewMap(
            supabase,
            p[0],
            "crewPositionData"
          );

          return [p[0], crewPositionData];
        })
      );

      setStagedCrew(
        results as [string, { [key: string]: CrewingPositionCrew[] }][]
      );
    };

    fetchCrewPositionData();
  }, [crewingPositions]);

  useEffect(() => {
    const dataSpread: any[] = [...[stagedCrew[0]?.[1]]];

    const positionIds = [
      ...new Set(dataSpread?.[0]?.map((el: any) => el.crewing_position)),
    ];

    const fetchContactAttemptStatuses = async () => {
      const {
        data: contactAttemptStatuses,
        error: fetchContactAttemptStatusesError,
      } = await supabase
        .from("crewing_contact_attempt")
        .select()
        .in("position", positionIds);

      if (!contactAttemptStatuses || fetchContactAttemptStatusesError) {
        console.error("Error: ", fetchContactAttemptStatusesError);
        toast.error("Something went wrong fetching contact attempts.");

        return;
      }

      setContactedCrew(contactAttemptStatuses);
    };

    fetchContactAttemptStatuses();
  }, [stagedCrew]);

  return (
    <div className="py-4">
      <div className="text-white text-3xl">This Week</div>

      {props.loading && (
        <div className="flex flex-col gap-5 w-[350px] h-[300px] p-[18px] mt-3 border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:rounded-2xl">
          <Skeleton className="w-[115px] h-5" />

          <div className="flex justify-between">
            <Skeleton className="w-[95px] h-5" />
            <Skeleton className="w-[95px] h-5" />
          </div>

          <Skeleton className="w-[250px] h-7" />

          <Skeleton className="w-[165px] h-3" />

          <Skeleton className="w-full h-3" />

          <div className="flex justify-between">
            <Skeleton className="w-[95px] h-3" />
            <Skeleton className="w-[15px] h-3" />
          </div>

          <div className="flex justify-between">
            <Skeleton className="w-[115px] h-3" />
            <Skeleton className="w-[15px] h-3" />
          </div>

          <div className="flex justify-between">
            <Skeleton className="w-[85px] h-3" />
            <Skeleton className="w-[15px] h-3" />
          </div>
        </div>
      )}

      {filteredProjects.length > 0 ? (
        <div className="flex gap-5 pt-3 overflow-x-scroll hide-scrollbars">
          {filteredProjects.map((project, i) => {
            if (!project) return;
            if (i > 7) return;

            // const positions = crewingPositions.filter(
            //   (p) => p[0] === project.id
            // );
            const positions = crewingPositions.map((p) => {
              if (p[0] === project.id) return p[1];
            });

            const stagedCrewMembers = stagedCrew.map((c) => {
              if (c[0] === project.id) return c[1];
            });

            if (!project.call_sheet) {
              return null;
            }

            return project.call_sheet.map((sheet) => {
              return (
                <ProjectSheetCard
                  key={sheet.id}
                  project={project}
                  sheet={sheet}
                  crewingPositions={
                    //@ts-ignore
                    positions[0] ? (positions[0] as CrewingPositionType[]) : []
                  }
                  stagedCrew={
                    stagedCrewMembers[0]
                      ? //@ts-ignore
                        (stagedCrewMembers[0] as CrewingPositionCrew[])
                      : []
                  }
                  contactedCrew={contactedCrew}
                />
              );
            });
          })}
        </div>
      ) : (
        <div className="pl-1 pt-2 text-white/70">
          No upcoming projects this week.
        </div>
      )}
    </div>
  );
};
