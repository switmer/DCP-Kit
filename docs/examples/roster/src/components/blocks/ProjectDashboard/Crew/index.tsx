'use client';

import { createClient } from '@/lib/supabase/client';
import { ProjectMemberType, ProjectPositionType, RateType } from '@/types/type';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrewTable } from './Table';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SelectPositions } from './SelectPositions';
import { useProjectStore } from '@/store/project';
import { AddCrew } from './AddCrew';
import { Editable } from '@/components/ui/Editable';
import { Sortable, SortableItem, SortableDragHandle } from '@/components/ui/Sortable';
import { toast } from 'sonner';
import { UniqueIdentifier } from '@dnd-kit/core';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible';
import { useCrewStore } from '@/store/crew';
import { useCompanyStore } from '@/store/company';

export type CrewMember = ProjectPositionType & {
  project_member?:
    | (ProjectMemberType & {
        crew?: {
          id?: number;
          role_rate?: RateType[];
        };
      })
    | null;
  call_sheet_member?: {
    id: string;
    call_sheet: { id: string; date: string | null } | null;
  }[];
};

interface DepartmentItem {
  id: UniqueIdentifier;
  department: string;
  members: CrewMember[];
}

export const Crew = ({ view, projectId }: { view: 'list' | 'departments'; projectId: string }) => {
  const [loading, setLoading] = useState(true);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [openPositions, setOpenPositions] = useState(false);
  const [focusedProjectDepartment, setFocusedProjectDepartment] = useState<string | undefined>(undefined);
  const [openCrew, setOpenCrew] = useState(false);
  const supabase = createClient();

  const { setProject } = useProjectStore();

  // Add a local state to track the current department order
  const [localDepartments, setLocalDepartments] = useState<DepartmentItem[]>([]);
  const [departmentRules, setDepartmentRules] = useState<any[]>([]);

  const { activeCompany } = useCompanyStore();

  const fetchCrew = useCallback(
    (bg = false) => {
      setLoading(bg);
      supabase
        .from('project_position')
        .select(
          `
            *, 
            call_sheet_member(
              id,
              call_sheet(
                id,
                date
              )
            ), 
            project_member(
              *,
              crew(
                id,
                role_rate(
                  *
                )
              )
            ) 
          `,
        )
        .eq('project', projectId)
        .order('department_order')
        .order('title')
        .then(({ data }) => {
          setCrew(data ?? []);
          setLoading(false);
        });
    },
    [projectId, supabase],
  );

  // NOTE: temp until we store department rules in crew store similar to position rules.
  const fetchDepartmentRules = useCallback(() => {
    if (!activeCompany) return;

    supabase
      .from('crew_rule_set')
      .select('rule_set')
      .eq('company', activeCompany)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const rules = data[0].rule_set;

          // filter to only include department rules.
          if (Array.isArray(rules)) {
            const departmentRules = rules.filter((rule: any) => rule.type === 'department');

            setDepartmentRules(departmentRules);
          }
        }
      });
  }, [activeCompany, supabase]);

  // get department override.
  const getDepartmentDisplayName = useCallback(
    (originalDepartment: string) => {
      const rule = departmentRules.find((rule) => rule.departments.includes(originalDepartment));
      return rule?.overrideDepartment || originalDepartment;
    },
    [departmentRules],
  );

  const initializeOrder = useCallback(async () => {
    if (!crew.length) return;

    const needsInitialization = crew.some((member) => member.department_order === null);

    if (needsInitialization) {
      const orderedMembers = crew.filter((member) => member.department_order !== null);
      const unorderedMembers = crew.filter((member) => member.department_order === null);

      let maxOrder = 0;
      if (orderedMembers.length > 0) {
        maxOrder = Math.max(...orderedMembers.map((m) => m.department_order || 0));
      }

      // Group unordered members by department
      const departments: Record<string, CrewMember[]> = {};
      unorderedMembers.forEach((member) => {
        const dept = member.department || 'Other';
        if (!departments[dept]) {
          departments[dept] = [];
        }
        departments[dept].push(member);
      });

      const updates: { id: number; department_order: number }[] = [];
      let globalOrder = maxOrder + 1; // Start from after the last ordered item

      Object.entries(departments).forEach(([dept, members]) => {
        members.forEach((member) => {
          updates.push({
            id: member.id,
            department_order: globalOrder++,
          });
        });
      });

      if (!!updates.length) {
        await supabase.from('project_position').upsert(updates, { onConflict: 'id' });
        fetchCrew();
      }
    }
  }, [crew, supabase, fetchCrew]);

  useEffect(() => {
    fetchCrew(true);
    fetchDepartmentRules();
    setProject(projectId);
  }, [projectId, fetchCrew, fetchDepartmentRules, setProject]);

  useEffect(() => {
    if (crew.length && !loading) {
      initializeOrder();
    }
  }, [crew, loading, initializeOrder]);

  const crewByDepartment = useMemo(() => {
    if (!crew?.length) return {};

    const departments: Record<string, CrewMember[]> = {};

    crew.forEach((member) => {
      const dept = member.department || 'Other';

      if (!departments[dept]) {
        departments[dept] = [];
      }

      departments[dept].push(member);
    });

    return departments;
  }, [crew]);

  const sortableDepartments = useMemo(() => {
    return Object.entries(crewByDepartment)
      .sort((a, b) => {
        const aMinOrder = Math.min(...a[1].map((m) => m.department_order ?? Number.MAX_SAFE_INTEGER));
        const bMinOrder = Math.min(...b[1].map((m) => m.department_order ?? Number.MAX_SAFE_INTEGER));
        return aMinOrder - bMinOrder;
      })
      .map(([department, members]) => ({
        id: department,
        department: getDepartmentDisplayName(department),
        originalDepartment: department,
        members,
      }));
  }, [crewByDepartment, getDepartmentDisplayName]);

  // update useEffect to synchronize the local state with memoized state when it changes.
  useEffect(() => {
    setLocalDepartments(sortableDepartments);
  }, [sortableDepartments]);

  const handleDepartmentReorder = useCallback(
    async (newOrder: DepartmentItem[]) => {
      try {
        setLocalDepartments(newOrder);

        let globalOrder = 1;
        const updates: { id: number; department_order: number }[] = [];

        for (const { department, members } of newOrder) {
          for (const member of members) {
            updates.push({
              id: member.id,
              department_order: globalOrder++,
            });
          }
        }

        if (updates.length > 0) {
          const { error } = await supabase.from('project_position').upsert(updates, { onConflict: 'id' });

          if (error) throw error;

          fetchCrew();
        }
      } catch (error) {
        // Revert local state on error
        setLocalDepartments(sortableDepartments);
        toast.error('Failed to update department order');
      }
    },
    [supabase, fetchCrew, sortableDepartments],
  );

  const listCrew = useMemo(() => {
    return crew.sort((a, b) => (a.department_order ?? 0) - (b.department_order ?? 0));
  }, [crew]);

  return (
    <>
      {view === 'list' ? (
        <div className="flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 rounded-2xl py-1 pr-1 pl-4 max-sm:mb-24">
          <div className="flex items-center gap-4 max-sm:gap-3">
            <div className="text-2xl text-white font-normal max-sm:text-xl">Crew List</div>
            <div className="flex gap-1 items-center justify-end flex-1">
              <Button
                className="text-sm gap-2 px-2 font-normal max-sm:text-xs max-sm:gap-1 max-sm:py-1"
                variant={'secondary'}
                size={'compact'}
                onClick={() => setOpenCrew(true)}
              >
                <Icon name="plus-circle" className="h-4 w-4 text-white/60 max-sm:h-3.5 max-sm:w-3.5" />
                Add crew
              </Button>

              <Button
                className="text-sm gap-2 px-2 font-normal max-sm:text-xs max-sm:gap-1 max-sm:py-1"
                variant={'secondary'}
                size={'compact'}
                onClick={() => setOpenPositions(true)}
              >
                <Icon name="plus-circle" className="h-4 w-4 text-white/60 max-sm:h-3.5 max-sm:w-3.5" />
                Add positions
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <CrewTable draggable loading={loading} data={listCrew} onUpdate={fetchCrew} projectId={projectId} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Sortable value={localDepartments} onValueChange={handleDepartmentReorder}>
            {localDepartments.map((item) => (
              <SortableItem key={item.id} value={item.id}>
                <Collapsible
                  defaultOpen
                  className="flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 rounded-2xl py-1 pr-1 pl-4 max-sm:mb-24"
                >
                  <CollapsibleTrigger className="flex items-center gap-3 cursor-pointer [&>svg]:data-[state=open]:rotate-90">
                    <Icon
                      name="chevron"
                      className="min-w-3 w-3 h-3 duration-100 text-white text-opacity-40 hover:text-opacity-100"
                    />

                    <SortableDragHandle variant="ghost" className="cursor-grab">
                      <Icon className="w-6 h-6 text-white opacity-50 hover:opacity-100" name="drag" />
                    </SortableDragHandle>

                    <div className="text-2xl text-white font-normal max-sm:text-xl flex items-center gap-2">
                      <Editable
                        className="text-2xl max-sm:text-xl min-w-fit"
                        type="text"
                        onChange={async (v) => {
                          const ids = item.members.map((m) => m.id);
                          await supabase.from('project_position').update({ department: v }).in('id', ids);

                          setCrew(crew.map((m) => (ids.includes(m.id) ? { ...m, department: v } : m)));
                        }}
                        value={item.department}
                      />

                      <span className="flex items-center justify-center h-6 px-3 text-[13px] text-white rounded-xl backdrop-blur-md bg-white bg-opacity-10">
                        {item.members.length}
                      </span>
                    </div>

                    <div className="flex gap-1 items-center justify-end flex-1">
                      <Button
                        className="text-sm gap-2 px-2 font-normal max-sm:text-xs max-sm:gap-1 max-sm:py-1"
                        variant={'secondary'}
                        size={'compact'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedProjectDepartment(item.department);
                          setOpenCrew(true);
                        }}
                      >
                        <Icon name="plus-circle" className="h-4 w-4 text-white/60 max-sm:h-3.5 max-sm:w-3.5" />
                        Add crew
                      </Button>

                      <Button
                        className="text-sm gap-2 px-2 font-normal max-sm:text-xs max-sm:gap-1 max-sm:py-1"
                        variant={'secondary'}
                        size={'compact'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPositions(true);
                        }}
                      >
                        <Icon name="plus-circle" className="h-4 w-4 text-white/60 max-sm:h-3.5 max-sm:w-3.5" />
                        Add positions
                      </Button>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="flex flex-col gap-6">
                      <CrewTable
                        draggable
                        department
                        loading={loading}
                        data={item.members}
                        onUpdate={fetchCrew}
                        projectId={projectId}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SortableItem>
            ))}
          </Sortable>
        </div>
      )}

      {openPositions && (
        <SelectPositions
          open={openPositions}
          onClose={() => setOpenPositions(false)}
          projectId={projectId}
          onUpdate={() => {
            fetchCrew();
          }}
        />
      )}

      {openCrew && (
        <AddCrew
          focusedProjectDepartment={focusedProjectDepartment}
          onUpdate={() => {
            fetchCrew();
          }}
          projectId={projectId}
          open={openCrew}
          onClose={() => {
            setOpenCrew(false);
            setFocusedProjectDepartment(undefined);
          }}
        />
      )}
    </>
  );
};
