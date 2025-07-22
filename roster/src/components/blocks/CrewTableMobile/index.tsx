'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { debounce } from 'lodash';
import { Search } from '@/components/blocks/CrewTable/Search';
import { ViewMenu } from '@/components/blocks/CrewTable/ViewMenu';
import { TableMobile } from '@/components/blocks/CrewTableMobile/TableMobile';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { useRouter } from 'next-nprogress-bar';
import { useParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export interface Department {
  department: string;
  count: number;
}

export interface Role {
  role: string;
  count: number;
}

const paramToString = (str: string) => {
  return str.replace(/-/g, ' ');
};

const stringToParam = (str: string) => {
  return encodeURIComponent(str.replace(/ /g, '-').toLowerCase());
};

export const CrewTableMobile: React.FC = () => {
  const { setSelected, setSearch: setDebouncedSearch, crew, loading, company, structure } = useCrewStore();

  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'default' | 'department'>('department');
  const [isLoading, setIsLoading] = useState(false);

  const { search: searchPositions } = useSearchPositions();

  const router = useRouter();

  const params = useParams<{ department?: string; position?: string }>();

  const selectedRole = useMemo(() => {
    return params.position ? paramToString(params.position) : null;
  }, [params.position]);

  const selectedDepartment = useMemo(() => {
    return params.department ? paramToString(params.department) : null;
  }, [params.department]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSelectedDebounced = useCallback(
    debounce((value: number | null) => {
      setSelected(value);
    }, 150),
    [setSelected],
  );

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

  if (!mounted || !company) return <></>;

  return (
    <>
      <div className="flex w-screen overflow-hidden h-screen bg-crew-list-mobile-gradient">
        <div className="flex flex-col gap-5 p-8 flex-1 w-full overflow-auto px-3 mb-[100px] hide-scrollbars">
          {!selectedRole && (
            <>
              <div className="flex justify-between items-center">
                <div className="flex items-center justify-between w-full gap-4 text-white text-[38px] font-bold leading-none capitalize px-2">
                  {!selectedDepartment && 'Crew List'}

                  {selectedDepartment && (
                    <div className="text-white text-[38px] leading-none flex items-center gap-1 capitalize">
                      <div onClick={() => router.push('/crew/')} className="hidden w-[40px] max-sm:flex">
                        <Icon name="arrow-left" className="relative -left-2 h-10 w-10 text-white font-bold" />
                      </div>

                      {/*<Icon*/}
                      {/*  name="users"*/}
                      {/*  className="w-12 h-12 text-lime-300 fill-none"*/}
                      {/*/>*/}

                      {!selectedDepartment && 'Crew List'}

                      {!!selectedDepartment && decodeURIComponent(selectedDepartment)}
                    </div>
                  )}

                  {!selectedDepartment && <ViewMenu {...{ view, setView }} />}
                </div>
              </div>

              <div className="flex w-full items-center gap-2 px-2">
                <Search
                  {...{
                    search,
                    setSearch,
                    placeholder: selectedDepartment && `Search crew...`,
                  }}
                />
              </div>
            </>
          )}

          {view === 'department' && departments.length === 0 && (
            <div className="text-center">No crew information found.</div>
          )}

          {view === 'department' && (
            <div className="flex flex-col w-full gap-0">
              {departments.map((d, i) => {
                const dept = structure[d.department];

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
                  .map((p) => p?.toLocaleLowerCase());

                const data = crew.filter((c) => c.position.some((p) => positionsWithin.includes(p.name ?? '')));

                if (
                  (!data.length && d.department === selectedDepartment) ||
                  (!data.length && i + 1 === departments.length && !selectedDepartment)
                ) {
                  return (
                    <div key={i} className="text-center">
                      No results found.
                    </div>
                  );
                }

                if (!data.length) return null;

                return (
                  <TableMobile
                    title={dept[0].prettyDepartment}
                    key={`${i}-${d.department}`}
                    data={data}
                    loading={loading}
                    setSelectedDepartment={() => router.push(`/crew/${stringToParam(d.department)}`)}
                    department={d.department}
                    selectedRole={selectedRole}
                    onRowClick={setSelectedDebounced}
                    sorting={sorting}
                    setSorting={setSorting}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
