import React, { use, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parse } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRouter } from 'next-nprogress-bar';
import { cn, groupByDepartments } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

type Props = {
  id?: number | null;
  expanding?: boolean;
  scrollCallback?: () => void;
};

type ProjectDate = {
  month: string;
  year: string;
};

type Project = {
  projectName: string;
  projectDates: ProjectDate[];
  roles: string[];
  callSheetShortId: string;
};

function collectUniqueProjectsAndRoles(
  data:
    | {
        title: string | null;

        project: {
          id: string;
          name: string | null;
          dates: string[] | null;
        } | null;

        call_sheet: {
          short_id: string | null;
        } | null;
      }[]
    | null,
) {
  if (!data) return {};

  const uniqueProjects: {
    [projectId: string]: {
      projectName: string;
      projectDates: { month: string; year: string }[];
      roles: Set<string>;
      callSheetShortId: string;
    };
  } = {};

  data.forEach((member) => {
    if (member.project) {
      const projectId = member.project.id;
      const callSheetShortId = member.call_sheet?.short_id ?? null;
      const projectName = member.project.name ?? 'Untitled';
      const projectDates = (member?.project?.dates ?? [])
        .map((date) => {
          let parsedDate;

          try {
            parsedDate = parse(date, 'MM/dd/yy', new Date());
          } catch {
            return { year: '', month: '' };
          }

          return {
            year: format(parsedDate, 'yyyy'),
            month: format(parsedDate, 'MM'),
          };
        })
        .filter((d) => !!d?.year);

      const roleName = member.title;

      if (!uniqueProjects[projectId]) {
        uniqueProjects[projectId] = {
          projectName: projectName,
          projectDates: projectDates,
          roles: new Set(),
          callSheetShortId: callSheetShortId as string,
        };
      }

      if (roleName) {
        uniqueProjects[projectId].roles.add(roleName);
      }
    }
  });

  const groupedProjects: {
    [year: string]: Project[];
  } = {};

  for (const projectId in uniqueProjects) {
    if (uniqueProjects.hasOwnProperty(projectId)) {
      const { projectName, projectDates, callSheetShortId, roles } = uniqueProjects[projectId];

      // projectDates.forEach((date) => {
      projectDates.sort((a, b) => {
        const yearA = parseInt(a.year, 10);
        const yearB = parseInt(b.year, 10);

        const monthA = parseInt(a.month, 10);
        const monthB = parseInt(b.month, 10);

        if (yearA !== yearB) {
          return yearB - yearA;
        }

        return monthB - monthA;
      });

      //-- skip this project if it doesn't have any dates.
      if (!projectDates.length) {
        continue;
      }

      const year = projectDates[0].year;

      if (!groupedProjects[year]) {
        groupedProjects[year] = [];
      }

      groupedProjects[year].push({
        projectName,
        projectDates,
        roles: Array.from(roles),
        callSheetShortId,
      });
      // });
    }
  }

  const getMostRecentDate = (project: Project): ProjectDate => {
    return project.projectDates.reduce((latest, current) => {
      const yearA = parseInt(latest.year, 10);
      const yearB = parseInt(current.year, 10);

      const monthA = parseInt(latest.month, 10);
      const monthB = parseInt(current.month, 10);

      if (yearB > yearA || (yearB === yearA && monthB > monthA)) {
        return current;
      }

      return latest;
    });
  };

  const sortProjects = (projects: { [key: string]: Project[] }): { [key: string]: Project[] } => {
    const sortedProjects: { [key: string]: Project[] } = {};

    Object.keys(projects).forEach((year) => {
      sortedProjects[year] = projects[year].slice().sort((a, b) => {
        const recentDateA = getMostRecentDate(a);
        const recentDateB = getMostRecentDate(b);

        const yearA = parseInt(recentDateA.year, 10);
        const yearB = parseInt(recentDateB.year, 10);

        const monthA = parseInt(recentDateA.month, 10);
        const monthB = parseInt(recentDateB.month, 10);

        if (yearA !== yearB) {
          return yearB - yearA;
        }

        return monthB - monthA;
      });
    });

    return sortedProjects;
  };

  return sortProjects(groupedProjects);
}

export const RelatedJobs: React.FC<Props> = (props) => {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [projects, setProjects] = useState<{
    [year: string]: Project[];
  }>({});

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!props.id) return;

    setLoading(true);

    supabase
      .from('call_sheet_member')
      .select(
        `
      title,
      short_id,
      project (
        id,
        name,
        dates
      ),
      call_sheet(
        short_id
      )
      `,
      )
      .eq('crew_member', props.id)

      .then(({ data }) => {
        if (data?.length) {
          setProjects(collectUniqueProjectsAndRoles(data));
        }

        setLoading(false);
      });
  }, [props.id]);

  useEffect(() => {
    if (expanded) {
      if (props.scrollCallback) {
        props.scrollCallback();
      }
    }
  }, [expanded]);

  const count = useMemo(() => {
    return Object.values(projects).flat().length;
  }, [projects]);

  // Even if there are no projects, we still want to show the header and a message

  return (
    <div className={cn('flex flex-col gap-6', props.expanding && 'w-full')}>
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center', props.expanding && 'w-full pl-8 pr-10')}>
          {props.expanding ? (
            <div
              className="flex items-center justify-between w-full cursor-pointer"
              onClick={() => setExpanded((prev) => !prev)}
            >
              <div className="flex">
                <div className="text-[17px] font-bold text-white/85">Related jobs</div>

                {!loading && (
                  <div className="w-[33px] h-6 text-[13px] ml-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm justify-center items-center flex">
                    {count}
                  </div>
                )}
              </div>

              <div>
                <Icon
                  name="chevron"
                  className={cn('w-[14px] h-[14px] text-white/90 hover:text-white/100', expanded && 'rotate-90')}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="text-white font-bold text-base">Related jobs</div>

              {!loading && (
                <div className="w-[33px] h-6 text-[13px] ml-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm justify-center items-center flex">
                  {count}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-col pb-4">
        {/* loading skeletons */}
        {loading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="gap-3 flex" key={i}>
                <div className="w-[65px] min-w-[65px] gap-1 flex flex-col">
                  <div className="text-neutral-400 text-xs font-medium">
                    <Skeleton className="w-[30px] h-3" />
                  </div>

                  <div className="text-neutral-400 text-2xl font-normal">
                    <Skeleton className="w-full h-4" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-white font-bold text-base">
                    <Skeleton className="w-[160px] h-4" />
                  </div>

                  <div className="text-white text-opacity-60 text-[13px] font-medium leading-none">
                    <Skeleton className="w-[50px] h-3" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {props.expanding && (
          <>
            {expanded &&
              !loading &&
              (Object.keys(projects)?.length ? (
                Object.keys(projects)
                  ?.reverse()
                  .map((year) => {
                    const p = projects[year];
                    const uniqueMonthsSet = new Set();

                    p.forEach((proj) => {
                      if (!proj.projectDates || !proj.projectDates.length) return;

                      const month = parseInt(proj.projectDates[0].month);

                      if (!isNaN(month)) {
                        uniqueMonthsSet.add(month);
                      }
                    });

                    return (
                      <div className="flex flex-col gap-3 px-10 pb-2 w-full" key={year}>
                        <div className="flex justify-between w-full">
                          <div className="flex flex-col gap-4">
                            {p.map((project, i) => {
                              //-- skip projects with no dates.
                              if (!project.projectDates || !project.projectDates.length) return null;

                              const prevProjMonth =
                                i > 0 && p[i - 1].projectDates && p[i - 1].projectDates.length
                                  ? p[i - 1].projectDates[0].month
                                  : '';
                              const currentProjMonth = project.projectDates[0].month;

                              return (
                                <div
                                  className="flex flex-col gap-1 cursor-pointer"
                                  key={`${project.projectName}-${i}`}
                                  onClick={() => {
                                    router.push(`/sheet/${project.callSheetShortId}`);
                                  }}
                                >
                                  <div
                                    className={cn(
                                      'text-neutral-400 text-[15px] font-bold',
                                      prevProjMonth === currentProjMonth && 'hidden',
                                    )}
                                  >
                                    {format(project.projectDates[0].month, 'MMMM')}
                                  </div>

                                  <div className="text-white font-bold text-base pl-3">{project.projectName}</div>

                                  <div className="text-neutral-500/90 text-[13px] font-semibold leading-none pl-3">
                                    {project.roles?.join(', ')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="text-neutral-500/80 text-xl font-medium">{year}</div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col gap-3 px-10 pb-2 w-full">
                  <div className="text-white/70 text-base">No related jobs found.</div>
                </div>
              ))}
          </>
        )}

        {!props.expanding && !loading ? (
          Object.keys(projects)?.length ? (
            Object.keys(projects)
              ?.reverse()
              .map((year) => {
                const p = projects[year];
                const uniqueMonthsSet = new Set();

                p.forEach((proj) => {
                  if (!proj.projectDates || !proj.projectDates.length) return;

                  const month = parseInt(proj.projectDates[0].month);

                  if (!isNaN(month)) {
                    uniqueMonthsSet.add(month);
                  }
                });

                return (
                  <div className="flex flex-col gap-3" key={year}>
                    <div className="flex justify-between w-[350px]">
                      <div className="flex flex-col gap-4">
                        {p.map((project, i) => {
                          // Skip projects with no dates
                          if (!project.projectDates || !project.projectDates.length) return null;

                          const prevProjMonth =
                            i > 0 && p[i - 1].projectDates && p[i - 1].projectDates.length
                              ? p[i - 1].projectDates[0].month
                              : '';
                          const currentProjMonth = project.projectDates[0].month;

                          return (
                            <div
                              className="flex flex-col gap-1 cursor-pointer"
                              key={`${project.projectName}-${i}`}
                              onClick={() => {
                                router.push(`/sheet/${project.callSheetShortId}`);
                              }}
                            >
                              <div
                                className={cn(
                                  'text-neutral-400 text-[15px] font-bold',
                                  prevProjMonth === currentProjMonth && 'hidden',
                                )}
                              >
                                {format(project.projectDates[0].month, 'MMMM')}
                              </div>

                              <div className="text-white font-bold text-base pl-3">{project.projectName}</div>

                              <div className="text-neutral-500/90 text-[13px] font-semibold leading-none pl-3">
                                {project.roles?.join(', ')}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-neutral-500/80 text-xl font-medium">{year}</div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-white/70 text-base">No related jobs found.</div>
          )
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};
