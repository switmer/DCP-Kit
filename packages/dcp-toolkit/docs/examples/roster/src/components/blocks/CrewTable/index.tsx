"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { SortingState } from "@tanstack/react-table";
import {
  capitalizeString,
  cn,
  paramToString,
  stringToParam,
} from "@/lib/utils";
import { Search } from "./Search";
import { debounce } from "lodash";
import { ViewMenu } from "./ViewMenu";
import { Table } from "./Table";
import { UploadHistoricalButton } from "@/components/ui/UploadHistorical";
import { AddCrew } from "./AddCrew";
import { CSVImport } from "./CSVImport";
import { RankingTable } from "./RankingTable";
import { useParams } from "next/navigation";
import { useCrewStore, useSearchPositions } from "@/store/crew";
import { useRouter } from "next-nprogress-bar";
import { CompanyCrewMemberType } from "@/types/type";
import { createClient } from "@/lib/supabase/client";
import { useCrewingStore } from "@/store/crewing";
import { toast } from "sonner";
import { Json } from "@/types/supabase";
import { migrateRuleSet } from "@/lib/rules/migrateRules";
import { createDepartmentRule } from "@/lib/rules/createRules";
import { Editable } from "@/components/ui/Editable";

export interface Department {
  department: string;
  count: number;
}

export interface Role {
  role: string;
  count: number;
}

export const CrewTable: React.FC = () => {
  const {
    setSelected,
    setSearch: setDebouncedSearch,
    crew,
    loading,
    company,
    structure,
    setRefreshKey,
    setCrew,
    setStructure,
    refreshKey,
    setLoading,
  } = useCrewStore();
  const { crewingPositions } = useCrewingStore();
  // const [cardIsHovered, setCardIsHovered] = useState(false);
  // const hoverTimeoutRef = useRef<number | null>(null);
  // const [hoveredCrew, setHoveredCrew] =
  //   useState<CompanyCrewMemberType | null>();
  const [crewWorkedWith, setCrewWorkedWith] = useState<CompanyCrewMemberType[] | null>(null);

  // const [cursorCoords, setCursorCoords] = useState({
  //   x: 0,
  //   y: 0,
  // });
  // const latestMouseCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [crewMemberCounts, setCrewMemberCounts] = useState<{
    [key: number]: number;
  }>({});
  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'default' | 'department'>('department');
  const [isLoading, setIsLoading] = useState(false);

  const { search: searchPositions } = useSearchPositions();

  const router = useRouter();

  const supabase = createClient();

  const params = useParams<{ department?: string; position?: string }>();

  const selectedRole = useMemo(() => {
    return params.position ? paramToString(params.position) : null;
  }, [params.position]);

  const selectedDepartment = useMemo(() => {
    return params.department ? paramToString(params.department) : null;
  }, [params.department]);

  useEffect(() => {
    if (!company?.id || refreshKey === 0) return;

    const fetchCrewData = async () => {
      setLoading(true);

      try {
        let query = supabase
          .from('company_crew_member')
          .select(
            `
            *,
            position (
              id,
              name,
              department,
              company,
              created_at,
              crew,
              known
            )
          `,
          )
          .eq('company', company.id);

        if (selectedDepartment) {
          // Filter crew members by department
          query = query.filter('position.department', 'cs', `{${selectedDepartment.toLowerCase()}}`);
        }

        if (selectedRole) {
          // Filter crew members by role/position
          query = query.filter('position.name', 'ilike', `%${selectedRole}%`);
        }

        const { data: crewData, error } = await query;

        if (error) {
          console.error('Error fetching crew:', error);
          toast.error('Failed to fetch crew data');
          return;
        }

        setCrew(crewData || []);
      } catch (error) {
        console.error('Error fetching crew data:', error);
        toast.error('Failed to fetch crew data');
      } finally {
        setLoading(false);
      }
    };

    fetchCrewData();
  }, [refreshKey, company?.id, selectedDepartment, selectedRole, supabase, setCrew, setLoading]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSelectedDebounced = useCallback(
    debounce((value: number | null) => {
      setSelected(value);
    }, 150),
    [setSelected],
  );

  const handleUpdateDepartment = useCallback(
    async (oldDepartment: string, newDepartment: string) => {
      try {
        // get crew member IDs from the current data that are in this department view.
        const crewMemberIds = crew.map((member) => member.id);

        // get all positions for these crew members.
        const { data: allPositions, error: allError } = await supabase
          .from('position')
          .select('id, department, crew, name')
          .in('crew', crewMemberIds);

        if (allError) {
          console.error('Error fetching all positions:', allError);

          throw allError;
        }

        // filter positions that contain the old department in their array.
        const positionsToUpdate = allPositions?.filter((pos) => {
          return (
            pos.department && Array.isArray(pos.department) && pos.department.includes(oldDepartment.toLowerCase())
          );
        });

        if (!positionsToUpdate || positionsToUpdate.length === 0) {
          toast.error('No positions found to update');

          return;
        }

        // get unique position names that were affected.
        // const affectedPositionNames = [...new Set(positionsToUpdate.map((pos) => pos.name))];

        // create/update position/department rules.
        const { positionRules, positionRulesId, setPositionRules, company } = useCrewStore.getState();

        let modernRules = migrateRuleSet(positionRules);

        // check if department rule already exists.
        const existingDeptRuleIndex = modernRules.findIndex(
          (rule) => rule.type === 'department' && rule.departments.includes(oldDepartment.toLowerCase()),
        );

        const departmentRule = createDepartmentRule(oldDepartment, newDepartment);

        if (existingDeptRuleIndex !== -1) {
          modernRules[existingDeptRuleIndex] = departmentRule;
        } else {
          modernRules.push(departmentRule);
        }

        // save the updated rule set.
        const updates: Record<string, any> = {
          company: company?.id,
          rule_set: modernRules as unknown as Json,
        };

        if (positionRulesId) {
          updates.id = positionRulesId;
        }

        const { error: ruleUpdateError } = await supabase.from('crew_rule_set').upsert(updates);

        if (ruleUpdateError) {
          throw new Error('Failed to update department rules');
        }

        setPositionRules(modernRules);

        const updatePromises = positionsToUpdate.map((pos) => {
          const updatedDepartments = pos.department?.map((dept: string) =>
            dept.toLowerCase() === oldDepartment.toLowerCase() ? newDepartment.toLowerCase() : dept.toLowerCase(),
          );

          return supabase.from('position').update({ department: updatedDepartments }).eq('id', pos.id);
        });

        await Promise.all(updatePromises);

        toast.success('Department updated successfully');

        // Refresh the data to reflect the changes
        setRefreshKey();
      } catch (error) {
        toast.error('Failed to update department');
        console.error('Full error:', error);
      }
    },
    [crew, supabase, setCrew, setRefreshKey, structure, setStructure],
  );

  //-- REMARK: hover card stuff. -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  //-- fetch related crew members from hovered crew member's previous jobs.
  // useEffect(() => {
  //   const fetchCrewWorkedWith = async () => {
  //     if (!hoveredCrew || !crewingPositions) return;
  //
  //     setIsLoading(true);
  //
  //     //-- fetch all projects related to the current crew member.
  //     const { data: relatedProjects, error: relatedProjectsFetchError } =
  //       await supabase
  //         .from("call_sheet_member")
  //         .select("project")
  //         .eq("crew_member", hoveredCrew.id);
  //
  //     if (!relatedProjects) return;
  //
  //     if (relatedProjectsFetchError) {
  //       console.error("Error: ", relatedProjectsFetchError);
  //       toast.error("Something went wrong. Please try again.");
  //     }
  //
  //     //-- remove duplicate ids.
  //     const dedupedProjects = [
  //       ...new Set(relatedProjects.map((p) => p.project)),
  //     ];
  //
  //     if (!dedupedProjects) return;
  //
  //     //-- fetch all related crew from the deduped project ids.
  //     const { data: relatedCrew, error: relatedCrewFetchError } = await supabase
  //       .from("distinct_call_sheet_member")
  //       .select("crew_member")
  //       .in("project", dedupedProjects);
  //
  //     if (!relatedCrew) return;
  //
  //     if (relatedCrewFetchError) {
  //       console.error("Error: ", relatedCrewFetchError);
  //       toast.error("Something went wrong. Please try again.");
  //     }
  //
  //     //-- reduce related crew to individual counts of each crew_member id from relatedCrew.
  //     const crewMemberCounts: { [key: number]: number } = relatedCrew.reduce(
  //       (acc: { [key: number]: number }, item) => {
  //         const member = item.crew_member;
  //         if (member !== null) {
  //           acc[member] = (acc[member] || 0) + 1;
  //         }
  //         return acc;
  //       },
  //       {}
  //     );
  //
  //     setCrewMemberCounts(crewMemberCounts);
  //
  //     //-- dedupe the crew members and filter out the id of the crew we're hovering and any null values.
  //     const dedupedCrew = [
  //       ...new Set(relatedCrew.map((p) => p.crew_member)),
  //     ].filter((c) => c !== null && c !== hoveredCrew.id);
  //
  //     const { data: crewWorkedWith, error: crewWorkedWithFetchError } =
  //       await supabase
  //         .from("company_crew_member")
  //         .select()
  //         // .limit(3)
  //         .in("id", dedupedCrew);
  //
  //     if (!crewWorkedWith) return;
  //
  //     if (crewWorkedWithFetchError) {
  //       console.error("Error: ", crewWorkedWithFetchError);
  //       toast.error("Something went wrong. Please try again.");
  //
  //       return;
  //     }
  //
  //     const currentCrewIds = crewingPositions
  //       .map((p) => p.crewing_position_crew?.map((c) => c.crew))
  //       .flat();
  //
  //     const filteredCrewWorkedWith = crewWorkedWith.filter((c) =>
  //       currentCrewIds.includes(c.id)
  //     );
  //
  //     setCrewWorkedWith(filteredCrewWorkedWith);
  //
  //     setIsLoading(false);
  //   };
  //
  //   fetchCrewWorkedWith();
  // }, [hoveredCrew]);

  // const handleMouseEnterCrew = (
  //   crewMember: CompanyCrewMemberType,
  //   e: React.MouseEvent<HTMLDivElement>
  // ) => {
  //   if (!crewMember) return;
  //   if (hoveredCrew && crewMember.id === hoveredCrew.id) return;
  //
  //   // setCurrentPosition(positionTitle);
  //
  //   if (hoverTimeoutRef.current) {
  //     clearTimeout(hoverTimeoutRef.current);
  //   }
  //
  //   hoverTimeoutRef.current = window.setTimeout(() => {
  //     //-- use the latest mouse coordinates from the ref.
  //     setCursorCoords({
  //       x: latestMouseCoords.current.x,
  //       y: latestMouseCoords.current.y,
  //     });
  //
  //     setHoveredCrew(crewMember);
  //   }, 500);
  //
  //   // setCrewIsHovered(true);
  // };
  //
  // const handleMouseMove = (e: MouseEvent) => {
  //   latestMouseCoords.current = { x: e.clientX, y: e.clientY };
  // };
  //
  // useEffect(() => {
  //   window.addEventListener("mousemove", handleMouseMove);
  //
  //   return () => {
  //     window.removeEventListener("mousemove", handleMouseMove);
  //   };
  // }, []);

  // const handleMouseLeaveCrew = () => {
  //   if (cardIsHovered) return;
  //
  //   if (hoverTimeoutRef.current) {
  //     clearTimeout(hoverTimeoutRef.current);
  //     hoverTimeoutRef.current = null;
  //   }
  //
  //   setHoveredCrew(null);
  // };
  //-- REMARK: -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  useEffect(() => {
    const debouncedUpdate = debounce((searchValue) => {
      setDebouncedSearch(searchValue);
    }, 500);

    debouncedUpdate(search);

    return () => {
      debouncedUpdate.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const departments = useMemo(() => {
    if (!structure) return [];

    return Object.entries(structure).map(([department, data]) => {
      return {
        department,
        count: data.reduce((acc, d) => acc + d.count, 0),
      };
    });
  }, [structure]);

  const prettyDepartmentName = useMemo(() => {
    if (!selectedDepartment) return;
    return structure[selectedDepartment ?? '']?.[0]?.prettyDepartment ?? capitalizeString(selectedDepartment);
  }, [selectedDepartment, structure]);

  const prettyPositionName = useMemo(() => {
    if (!selectedRole) return;

    return searchPositions(selectedRole)?.position ?? capitalizeString(selectedRole);
  }, [selectedRole, searchPositions]);

  if (!mounted || !company) return <></>;

  return (
    <>
      <div className="flex w-screen overflow-hidden max-h-screen">
        <div className="flex flex-col gap-6 p-8 flex-1 max-w-[calc(100vw-300px-85px)] overflow-auto">
          <div className="flex gap-2 items-center">
            <Link
              href={'/'}
              className="flex text-zinc-600 hover:text-white duration-100 cursor-pointer text-sm leading-none gap-2 items-center"
            >
              <Icon name="home" className="w-5 h-5" />
              {company?.name}
            </Link>

            <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

            <Link
              href="/crew"
              className={cn(
                'text-white text-sm',
                (!!selectedRole || !!selectedDepartment) &&
                  'text-zinc-600 hover:text-white duration-100 cursor-pointer capitalize',
              )}
            >
              Crew List
            </Link>

            {selectedDepartment && (
              <>
                <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />
                <Link
                  className={cn(
                    'text-white text-sm',
                    !!selectedRole && 'text-zinc-600 hover:text-white duration-100 cursor-pointer capitalize',
                  )}
                  href={`/crew/${stringToParam(selectedDepartment)}`}
                >
                  {capitalizeString(selectedDepartment)}
                </Link>
              </>
            )}

            {selectedDepartment && selectedRole && (
              <>
                <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

                <div className="text-white text-sm">
                  {searchPositions(selectedRole)?.position ?? capitalizeString(selectedRole)}
                </div>
              </>
            )}
          </div>

          {!selectedRole && (
            <>
              <div className="flex justify-between items-center">
                <div className="text-white text-[38px] leading-none flex items-center gap-4">
                  <Icon name="users" className="w-12 h-12 text-lime-300 fill-none" />

                  {!selectedDepartment && 'Crew List'}

                  {!!selectedDepartment && !selectedRole && (
                    <Editable
                      className="text-[38px] leading-none h-[50px] max-w-[500px]"
                      type="text"
                      onChange={async (newValue) => {
                        if (selectedDepartment && newValue !== selectedDepartment) {
                          await handleUpdateDepartment(selectedDepartment, newValue);
                          // Navigate to the new department URL
                          router.push(`/crew/${stringToParam(newValue)}`);
                        }
                      }}
                      value={prettyDepartmentName}
                    />
                  )}

                  {!!selectedDepartment && !!selectedRole && prettyPositionName}
                </div>

                <div className="flex items-center gap-2">
                  <UploadHistoricalButton />

                  <CSVImport
                    companyId={company?.id}
                    onUpdate={() => {
                      setRefreshKey();
                    }}
                  />

                  <AddCrew
                    department={selectedDepartment ?? undefined}
                    companyId={company?.id}
                    onUpdate={() => {
                      setRefreshKey();
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 items-center w-full">
                <Search
                  {...{
                    search,
                    setSearch,
                    placeholder: selectedDepartment && `Search crew...`,
                  }}
                />

                {!selectedDepartment && <ViewMenu {...{ view, setView }} />}
              </div>
            </>
          )}

          {crew.length === 0 && (
            <>
              <div className="flex flex-col gap-4 items-center justify-center py-16 bg-dashboard-empty-gradient backdrop-blur-md rounded-2xl max-sm:px-2 max-sm:py-10 max-sm:mb-[100px]">
                <Icon name="user" className="w-10 h-10 text-lime-300" />

                <div className="flex-col justify-center items-center gap-2 flex px-6">
                  <div className="text-center text-white text-xl font-bold leading-normal">
                    You don&apos;t have any crew yet.
                  </div>

                  <div className="text-center text-white text-opacity-75 text-sm font-normal leading-tight max-sm:leading-snug">
                    Crew members from parsed call sheets and that have been individually added will be displayed here.
                  </div>
                </div>

                <AddCrew
                  department={selectedDepartment ?? undefined}
                  companyId={company?.id}
                  onUpdate={() => {
                    setRefreshKey();
                  }}
                />
              </div>
            </>
          )}

          {view === 'department' && !selectedDepartment ? (
            <div className="flex flex-col gap-6 w-full">
              {departments.map((d, i) => {
                const dept = structure[d.department];

                // Get all the positions and their possible aliases
                const positionsWithin = dept
                  ?.map((r) => {
                    const p = r.position;
                    const found = searchPositions(p);

                    if (!found) {
                      return [p];
                    }

                    return [found?.position, ...(found?.aliases ?? [])];
                  })
                  .flat()
                  .map((p) => p?.toLowerCase());

                // Filter crew members by checking both position names AND department names
                const data = crew.filter((c) => {
                  const matchesPosition = c.position.some((p) => positionsWithin.includes(p.name?.toLowerCase() ?? ''));

                  // Also check if any of the crew member's position departments match this department
                  const matchesDepartment = c.position.some((p) =>
                    p.department?.some((deptName: string) => deptName.toLowerCase() === d.department.toLowerCase()),
                  );

                  return matchesPosition || matchesDepartment;
                });

                if (!data.length) return null;

                return (
                  <Table
                    title={dept[0].prettyDepartment}
                    key={`${i}-${d.department}`}
                    data={data}
                    loading={loading}
                    setSelectedDepartment={() => router.push(`/crew/${stringToParam(d.department)}`)}
                    department={d.department}
                    onRowClick={setSelectedDebounced}
                    sorting={sorting}
                    setSorting={setSorting}
                    onUpdateDepartment={handleUpdateDepartment}
                  />
                );
              })}
            </div>
          ) : (
            <>
              {selectedRole ? (
                <>
                  <div className="flex justify-between">
                    <div className="text-white text-[38px] leading-none flex items-center gap-4 capitalize">
                      <Icon name="users" className="w-12 h-12 text-lime-300 fill-none" />

                      {prettyPositionName}
                    </div>

                    <AddCrew
                      department={selectedDepartment ?? undefined}
                      position={selectedRole ?? undefined}
                      companyId={company?.id}
                      onUpdate={() => {
                        setRefreshKey();
                      }}
                    />
                  </div>

                  <RankingTable
                    data={crew}
                    loading={loading}
                    selectedDepartment={selectedDepartment}
                    selectedRole={selectedRole}
                    onRowClick={setSelectedDebounced}
                    companyId={company.id}
                  />
                </>
              ) : (
                <Table
                  data={crew}
                  onRowClick={setSelectedDebounced}
                  loading={loading}
                  department={selectedDepartment}
                  selectedRole={selectedRole}
                  sorting={sorting}
                  setSorting={setSorting}
                  // handleMouseEnterCrew={handleMouseEnterCrew}
                  // handleMouseLeaveCrew={handleMouseLeaveCrew}
                  hideDepartment
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* REMARK: hover card stuff. */}
      {/*
      {hoveredCrew && (
        <HoverCrewCard
          crewMember={hoveredCrew}
          crewWorkedWith={crewWorkedWith}
          crewMemberCounts={crewMemberCounts}
          setCrewWorkedWith={setCrewWorkedWith}
          setCardIsHovered={setCardIsHovered}
          setHoveredCrew={setHoveredCrew}
          cursorCoords={cursorCoords}
          // positionTitle={}
          isLoading={isLoading}
        />
      )}
      */}
      {/* REMARK: -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */}
    </>
  );
};
