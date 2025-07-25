import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { searchDepartments } from '@/rules/departments';
import { capitalizeString } from '@/lib/utils';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { Position } from '@/rules/positions';
import { useCompanyStore } from '@/store/company';
import { modernRuleToPosition } from '@/lib/rules/modernRuleToPosition';

export const useSetup = () => {
  const supabase = createClient();
  const [fetchedRules, setFetchedRules] = useState(false);
  const { search: searchPositions } = useSearchPositions();

  const { setStructure, setPositionRules, setPositionRulesId } = useCrewStore();
  const { activeCompany } = useCompanyStore();

  const fetchPositionRules = async () => {
    if (!activeCompany) return;
    return await supabase
      .from('crew_rule_set')
      .select()
      .eq('company', activeCompany)
      .single()
      .then(({ data }) => {
        if (!data) {
          supabase
            .from('crew_rule_set')
            .insert({ company: activeCompany, rule_set: [] })
            .select()
            .then(({ data: d }) => {
              if (!d?.[0]) return;
              setPositionRules((d?.[0].rule_set as unknown as Position[]) ?? []);
              setPositionRulesId(d?.[0].id);
            });
          setFetchedRules(true);
          return;
        }

        setPositionRules((data.rule_set as unknown as Position[]) ?? []);
        setPositionRulesId(data.id);
        setFetchedRules(true);
      });
  };

  const fetchStructure = async () => {
    if (!activeCompany) return;
    return await supabase.rpc('get_crew_positions', { company_id: activeCompany }).then(({ data }) => {
      const result: Record<
        string,
        { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]
      > = {};
      /* @ts-ignore */
      data?.forEach((d) => {
        const modernRule = searchPositions(d.name);
        const rule = modernRuleToPosition(modernRule);

        if (!rule) {
          if (!d.department?.[0]) return;

          const prettyDepartment = searchDepartments(d.department[0])?.department ?? capitalizeString(d.department[0]);
          const originalDepartment = d.department[0];
          const key = prettyDepartment.toLocaleLowerCase();

          result[key] = [
            ...(result[key] ?? []),
            {
              position: capitalizeString(d.name),
              count: d.crew_count,
              prettyDepartment,
              originalDepartment,
            },
          ];
          return;
        }

        const key = rule.departments?.[0]?.toLocaleLowerCase();
        const originalDepartment = d.department?.[0] ?? rule.departments?.[0] ?? '';
        const existingItem = result?.[key]?.find((d) => d.position === rule.position);

        if (existingItem) {
          existingItem.count += d.crew_count;
          return;
        }

        result[key] = [
          ...(result?.[key] ?? []),
          {
            position: rule.position,
            count: d.crew_count,
            prettyDepartment: rule.departments?.[0],
            originalDepartment,
          },
        ];
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
    });
  };

  useEffect(() => {
    if (!fetchedRules) return;
    fetchStructure();
  }, [fetchedRules]);

  useEffect(() => {
    if (!activeCompany) return;

    fetchPositionRules();
  }, [activeCompany]);
};
