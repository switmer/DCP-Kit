'use client';

import { useCrewStore, useSearchPositions } from '@/store/crew';
import { Preview } from '../CrewTable/Preview';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Position } from '@/rules/positions';
import { toast } from 'sonner';
import { MemberProfileMobile } from '@/components/blocks/CrewTableMobile/MemberProfileMobile';
import { paramToString } from '@/lib/utils';
import { useRouter } from 'next-nprogress-bar';
import { useCompanyStore } from '@/store/company';

export const Crew: React.FC<{
  children: React.ReactElement;
}> = ({ children }) => {
  const supabase = createClient();
  const { search: searchPositions } = useSearchPositions();
  const { activeCompany } = useCompanyStore();
  const [vw, setVw] = useState<number>(1024); // Default to desktop width

  const router = useRouter();

  const {
    setLoading,
    setCrew,
    search,
    refreshKey,
    setCount,
    setCompany,
    setPositionRules,
    setPositionRulesId,
    structure,
    structureRefreshKey,
  } = useCrewStore();

  const params = useParams<{ department?: string; position?: string }>();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVw(window.innerWidth);
    }
  }, []);

  useEffect(() => {
    supabase
      .from('company')
      .select()
      .eq('id', activeCompany as string)
      .single()
      .then(({ data }) => {
        setCompany(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany]);

  useEffect(() => {
    setTimeout(() => {
      supabase
        .from('crew_rule_set')
        .select()
        .eq('company', activeCompany as string)
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
            return;
          }
          setPositionRules((data.rule_set as unknown as Position[]) ?? []);
          setPositionRulesId(data.id);
        });
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, refreshKey]);

  const selectedRole = useMemo(() => {
    return params.position ? paramToString(params.position) : null;
  }, [params.position]);

  const selectedDepartment = useMemo(() => {
    return params.department ? paramToString(params.department) : null;
  }, [params.department]);

  useEffect(() => {
    if (!Object.keys(structure).length || !structureRefreshKey) return;
    fetchCrew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, selectedDepartment, selectedRole, search, structure]);

  useEffect(() => {
    if (!refreshKey || !Object.keys(structure).length || !structureRefreshKey) return;

    setTimeout(() => {
      fetchCrew();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (
      !structureRefreshKey ||
      !selectedDepartment ||
      !structureRefreshKey ||
      !Object.keys(structure).length
    )
      return;

    if (!structure[selectedDepartment]) {
      router.push(`/crew`);
    }
  }, [selectedDepartment, structureRefreshKey, structure, router]);

  const fetchCrew = async () => {
    setLoading(true);
    let query = supabase
      .from('company_crew_member')
      .select(
        `
        *,
        position!inner(
          *
        ),
        call_sheet_member (
          project
        )
      `,
        { count: 'exact' },
      )
      .eq('company', activeCompany as string);

    if (selectedDepartment) {
      if (!selectedRole) {
        // lowercase for consistency with how structure keys are stored.
        const positionsWithin = structure[selectedDepartment.toLowerCase()]?.map((r) => r.position);

        if (!positionsWithin || positionsWithin.length === 0) {
          setCrew([]);
          setLoading(false);

          return;
        }

        const positionsQuery = positionsWithin
          ?.map((p) => {
            const found = searchPositions(p);

            if (!found) {
              return [p];
            }

            return [found?.position, ...(found?.aliases ?? [])];
          })
          .flat()
          .map((p) => `name.eq."${p?.toLocaleLowerCase()}"`)
          .join(', ');

        if (!positionsQuery) {
          setCrew([]);
          setLoading(false);

          return;
        }

        query = query.or(positionsQuery, { foreignTable: 'position' });
      } else {
        const role = searchPositions(selectedRole);
        const roleToSearch = [role?.position ?? selectedRole, ...(role?.aliases ?? [])];

        query = query.or(roleToSearch.map((r) => `name.eq."${r.toLocaleLowerCase()}"`).join(', '), {
          foreignTable: 'position',
        });
      }
    }

    if (!!search) {
      query = query.like('tfs', `%${search?.toLocaleLowerCase()}%`);
    }

    const { data, error, count } = await query;

    if (!selectedDepartment && !search && !selectedRole && count) {
      setCount(count);
    }

    if (data) {
      setCrew(data);
    }

    if (error) {
      toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <>
      {children}

      {vw >= 601 && <Preview />}
      {vw <= 600 && <MemberProfileMobile />}
    </>
  );
};
