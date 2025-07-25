'use client';

import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { capitalizeString, cn, paramToString, stringToParam } from '@/lib/utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCrewStore, useSearchDepartments, useSearchPositions } from '@/store/crew';
import { searchDepartments } from '@/rules/departments';
import { toast } from 'sonner';
import { Json } from '@/types/supabase';
import { migrateRuleSet } from '@/lib/rules/migrateRules';
import { createDepartmentRule } from '@/lib/rules/createRules';

export const Sidebar: React.FC = () => {
  const { company, count, structure, setStructure, structureRefreshKey } = useCrewStore();
  const { search: searchPositions } = useSearchPositions();
  const { search: searchDepartmentRules } = useSearchDepartments();
  const companyId = company?.id;

  const [loading, setLoading] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const supabase = createClient();

  const params = useParams<{ department?: string; position?: string }>();

  const selectedRole = useMemo(() => {
    return params.position ? paramToString(params.position) : null;
  }, [params.position]);

  const selectedDepartment = useMemo(() => {
    return params.department ? paramToString(params.department) : null;
  }, [params.department]);

  // get pretty department name.
  const getPrettyDepartmentName = useCallback(
    (departmentName: string): string => {
      // check custom department rules.
      const departmentRule = searchDepartmentRules(departmentName.toLowerCase());

      if (departmentRule && departmentRule.overrideDepartment) {
        return departmentRule.overrideDepartment;
      }

      // fall back to static department lookup.
      const staticDepartment = searchDepartments(departmentName.toLowerCase());
      if (staticDepartment) {
        return staticDepartment.department;
      }

      return capitalizeString(departmentName);
    },
    [searchDepartmentRules],
  );

  const handleEditDepartment = useCallback((departmentKey: string, currentName: string) => {
    setEditingDepartment(departmentKey);
    setEditingValue(currentName);
  }, []);

  const handleSaveDepartment = useCallback(
    async (departmentKey: string, newName: string) => {
      if (!newName.trim()) {
        toast.error('Department name cannot be empty');
        return;
      }

      try {
        const { positionRules, positionRulesId, setPositionRules, setRefreshKey } = useCrewStore.getState();

        // get the original department name.
        const originalDepartmentName = structure[departmentKey]?.[0]?.originalDepartment;

        if (!originalDepartmentName) {
          toast.error('Could not find original department name');
          return;
        }

        // create/update department rules.
        let modernRules = migrateRuleSet(positionRules);

        // first, try to find a rule that matches the original department name...
        let existingDeptRuleIndex = modernRules.findIndex(
          (rule) => rule.type === 'department' && rule.departments.includes(originalDepartmentName.toLowerCase()),
        );

        // ...if not found, try to find a rule that matches the department key (current name)...
        if (existingDeptRuleIndex === -1) {
          existingDeptRuleIndex = modernRules.findIndex(
            (rule) => rule.type === 'department' && rule.departments.includes(departmentKey.toLowerCase()),
          );
        }

        // ...if still not found, look for a rule where the overrideDepartment matches the current pretty name.
        if (existingDeptRuleIndex === -1) {
          const currentPrettyName = structure[departmentKey]?.[0]?.prettyDepartment;
          if (currentPrettyName) {
            existingDeptRuleIndex = modernRules.findIndex(
              (rule) => rule.type === 'department' && rule.overrideDepartment === currentPrettyName,
            );
          }
        }

        const departmentRule = createDepartmentRule(originalDepartmentName, newName);

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

        // trigger full refresh of the crew data and structure.
        setRefreshKey();

        toast.success('Department name updated successfully');
        setEditingDepartment(null);
        setEditingValue('');
      } catch (error) {
        console.error('Error updating department:', error);
        toast.error('Failed to update department name');
      }
    },
    [structure, company?.id, supabase],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingDepartment(null);
    setEditingValue('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, departmentKey: string) => {
      if (e.key === 'Enter') {
        handleSaveDepartment(departmentKey, editingValue);
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [editingValue, handleSaveDepartment, handleCancelEdit],
  );

  useEffect(() => {
    if (!companyId || !structureRefreshKey) return;
    setLoading(true);

    supabase.rpc('get_crew_positions', { company_id: companyId }).then(({ data }) => {
      const result: Record<
        string,
        { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]
      > = {};

      data?.forEach((d) => {
        const rule = searchPositions(d.name);

        if (!rule) {
          if (!d.department?.[0]) return;

          // use the department name exactly as it comes from the database.
          const departmentFromDB = d.department[0];
          const prettyDepartment = getPrettyDepartmentName(departmentFromDB);

          // use the actual department name as the key (this should be the custom department).
          const key = departmentFromDB.toLowerCase();

          result[key] = [
            ...(result[key] ?? []),
            {
              position: capitalizeString(d.name),
              count: d.crew_count,
              prettyDepartment,
              originalDepartment: departmentFromDB,
            },
          ];

          return;
        }

        if (rule.type === 'position') {
          // for positions with rules, use the department from the database (which should be custom if updated).
          const departmentFromDB = d.department?.[0];

          if (!departmentFromDB) return;

          const prettyDepartment = getPrettyDepartmentName(departmentFromDB);
          const key = departmentFromDB.toLowerCase();

          const existingItem = result?.[key]?.find((item) => item.position === rule.position);

          if (existingItem) {
            existingItem.count += d.crew_count;
            return;
          }

          result[key] = [
            ...(result?.[key] ?? []),
            {
              position: rule.position || '',
              count: d.crew_count,
              prettyDepartment,
              originalDepartment: departmentFromDB,
            },
          ];
        }
      });

      const sortedResult = Object.keys(result)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = result[key];
            return acc;
          },
          {} as Record<
            string,
            { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]
          >,
        );

      setStructure(sortedResult);
      setLoading(false);
    });
  }, [companyId, structureRefreshKey, searchPositions, getPrettyDepartmentName]);

  if (!!selectedDepartment) {
    return (
      <div className="min-w-[300px] max-w-[300px] sticky top-0 max-h-screen overflow-scroll p-8 bg-neutral-700 bg-opacity-25 backdrop-blur-2xl min-h-screen gap-6 flex-col flex max-sm:hidden">
        <div className="flex flex-col gap-2">
          <Link href={`/crew`} className="w-10 h-10 flex items-center justify-center">
            <Icon name="arrow-left" className="text-lime-300 w-10 h-10" />
          </Link>

          <Link
            href={`/crew/${params.department}`}
            className={cn('text-white text-[28px] font-normal capitalize', !!selectedRole && 'cursor-pointer')}
          >
            {selectedDepartment && structure[selectedDepartment.toLowerCase()]?.[0]?.prettyDepartment 
              ? structure[selectedDepartment.toLowerCase()][0].prettyDepartment 
              : getPrettyDepartmentName(selectedDepartment || '')}
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <div className=" text-zinc-600 text-sm">Jump to</div>

          {(loading ? [...new Array(5)] : structure[selectedDepartment.toLowerCase()])?.map((r, i) => {
            if (loading) {
              return (
                <div
                  key={i}
                  className="flex justify-between items-center text-white text-opacity-60 text-lg cursor-pointer hover:text-opacity-100 duration-150"
                >
                  <Skeleton className="w-[140px] h-6" />
                  <Skeleton className="w-3 h-6" />
                </div>
              );
            }

            const p = searchPositions(r.position)?.position ?? r.position;

            return (
              <Link
                key={r.position}
                className={cn(
                  'flex justify-between items-center text-white text-opacity-60 text-lg cursor-pointer hover:text-opacity-100 duration-150',
                  selectedRole?.toLowerCase() === r.position?.toLowerCase() && 'text-opacity-100',
                )}
                href={`/crew/${params.department}/${stringToParam(p)}`}
              >
                {p}
                <span className="text-white text-opacity-30 text-[13px]">{r.count}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] sticky top-0 py-8 pl-8 pr-5 bg-neutral-700 bg-opacity-25 backdrop-blur-2xl min-h-screen gap-6 overflow-auto max-sm:hidden">
      <div className="text-white text-[28px] font-normal">Crew List</div>
      <div className="flex flex-col gap-3">
        <Link
          className={cn(
            'flex justify-between items-center text-white text-opacity-60 text-lg cursor-pointer hover:text-opacity-100 duration-150',
            selectedDepartment === null && 'text-opacity-100',
          )}
          href={'/crew'}
        >
          Full Roster
          <span className="text-white text-opacity-30 text-[13px]">{count ? count : <></>}</span>
        </Link>

        <div className=" text-zinc-600 text-sm">Departments</div>
        {loading
          ? [...new Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center text-white text-opacity-60 text-lg cursor-pointer hover:text-opacity-100 duration-150"
              >
                <Skeleton className="w-[140px] h-6" />
                <Skeleton className="w-3 h-6" />
              </div>
            ))
          : Object.keys(structure)?.map((r) => {
              const item = structure[r];
              const count = item.reduce((sum, item) => sum + item.count, 0);
              const departmentName = item[0]?.prettyDepartment ?? (/^[a-z0-9 ]*$/.test(r) ? capitalizeString(r) : r);
              const isEditing = editingDepartment === r;

              if (isEditing) {
                return (
                  <div
                    key={r}
                    className={cn(
                      'flex justify-between items-center text-white text-opacity-60 text-lg cursor-pointer hover:text-opacity-100 duration-150',
                      selectedDepartment?.toLowerCase() === r?.toLowerCase() && 'text-opacity-100',
                    )}
                  >
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveDepartment(r, editingValue)}
                      onKeyDown={(e) => handleKeyDown(e, r)}
                      className="bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-white text-lg flex-1 mr-2"
                      autoFocus
                    />
                    <span className="text-white text-opacity-30 text-[13px]">{count}</span>
                  </div>
                );
              }

              return (
                <div
                  key={r}
                  className={cn(
                    'group/dept flex justify-between items-center text-white text-opacity-60 text-lg hover:text-opacity-100 duration-150',
                    selectedDepartment?.toLowerCase() === r?.toLowerCase() && 'text-opacity-100',
                  )}
                >
                  <Link href={`/crew/${stringToParam(r)}`} className="flex-1 cursor-pointer">
                    {departmentName}
                  </Link>

                  <span className="text-white text-opacity-30 text-[13px] pr-3 group-hover/dept:hidden">{count}</span>

                  <button
                    className="group/button z-10 relative left-[4px] hidden group-hover/dept:flex items-center justify-center w-[35px] h-[20px] cursor-pointer"
                    onClick={() => handleEditDepartment(r, departmentName)}
                  >
                    <Icon name="edit" className="w-4 h-4 text-white/40 group-hover/button:text-white/60" />
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
};
