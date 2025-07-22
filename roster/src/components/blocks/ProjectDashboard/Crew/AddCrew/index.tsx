import { Button } from '@/components/ui/Button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchAndFilter } from './SearchAndFilter';
import { useLocationFilter } from '@/queries/get-location-filter';
import { CompanyCrewMemberType, PositionType } from '@/types/type';
import { Member, MemberSkeleton, SelectedMember } from './Member';
import { capitalizeString, cn } from '@/lib/utils';
import { useCrewStore } from '@/store/crew';
import { useSetup } from '../SelectPositions';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { CreateCrew } from './CreateCrew';

export type CrewMember = CompanyCrewMemberType & {
  position: PositionType[];
  call_sheet_member: {
    id: string;
    call_sheet: {
      id: string;
      call_sheet_location: {
        id: number;
        location: {
          id: number;
        };
      }[];
    };
  }[];
};

interface CrewResponse {
  data: CrewMember[];
  error: any;
  count: number | null;
  hasMore: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const AddCrew = ({
  open,
  onClose,
  projectId,
  onUpdate,
  focusedProjectPositionId,
  focusedProjectPosition,
  focusedProjectDepartment,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
  focusedProjectPositionId?: number | null;
  focusedProjectPosition?: string;
  focusedProjectDepartment?: string;
}) => {
  const [saving, setSaving] = useState(false);
  const [checkedCrew, setCheckedCrew] = React.useState<CrewMember[]>([]);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = React.useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = React.useState<string[]>([]);
  const { data: locations, isLoading: locationsLoading } = useLocationFilter();
  const { structure, searchIndex } = useCrewStore();
  const [openAddMember, setOpenAddMember] = useState(false);
  useSetup();

  // Debounce search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteQuery<CrewResponse>({
    queryKey: ['crew', selectedLocations, selectedPositions, debouncedSearch, selectedDepartment],
    queryFn: async ({ pageParam = 0 }) => {
      const locationIds =
        selectedLocations.length > 0
          ? locations?.filter((l) => selectedLocations.includes(l.label)).flatMap((l) => l.locationIds)
          : [];

      const positionsFilter =
        selectedPositions.length > 0
          ? selectedPositions
              .map((p) => {
                const found = searchIndex.get(p.toLocaleLowerCase());

                if (!found) {
                  return [capitalizeString(p)];
                }

                return [found?.position, ...(found?.aliases ?? [])];
              })
              .filter((p) => !!p)
              .flat()
          : [];

      const params = new URLSearchParams();

      if (locationIds && !!locationIds.length) {
        locationIds.forEach((id) => params.append('locations', id.toString()));
      }

      if (positionsFilter && !!positionsFilter.length) {
        positionsFilter.forEach((p) => {
          if (typeof p === 'string') {
            params.append('positions', p);
          }
        });
      }

      if (!!selectedDepartment.length) {
        selectedDepartment.forEach((d) => {
          params.append('departments', d?.toLocaleLowerCase());
        });
      }

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      params.append('page', (pageParam as number).toString());

      const response = await fetch(`/api/crew?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch crew data');
      }

      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const crew = useMemo(() => {
    const seen = new Set<number>();
    const allItems = data?.pages.flatMap((page) => page.data) || [];

    const res = allItems.filter((d) => {
      if (seen.has(d.id)) {
        return false;
      }
      seen.add(d.id);
      return true;
    });

    return res;
  }, [data]);

  const positions = useMemo(() => {
    const uniquePositionsMap = new Map();

    Object.values(structure)
      .flat()
      .forEach((s) => {
        const found = searchIndex.get(s.position?.toLocaleLowerCase() ?? '');

        if (!found) {
          uniquePositionsMap.set(s.position, {
            position: s.position,
            aliases: [],
          });
          return;
        }

        uniquePositionsMap.set(found.position, {
          position: found.position,
          aliases: found.aliases,
        });
      });

    return Array.from(uniquePositionsMap.values());
  }, [searchIndex, structure]);

  const departments = useMemo(() => {
    return Object.keys(structure).map((r) => {
      const item = structure[r];
      return {
        label: item[0]?.prettyDepartment ?? r,
        value: item[0]?.prettyDepartment ?? r,
      };
    });
  }, [structure]);

  useEffect(() => {
    if (focusedProjectPosition && positions?.find((p) => p.position === focusedProjectPosition)) {
      setSelectedPositions([focusedProjectPosition]);
    }
  }, [focusedProjectPosition, positions]);

  useEffect(() => {
    if (focusedProjectDepartment && departments?.find((d) => d.label === focusedProjectDepartment)) {
      setSelectedDepartment([focusedProjectDepartment]);
    }
  }, [focusedProjectDepartment, departments]);

  const total = useMemo(() => {
    return data?.pages?.[0].count;
  }, [data?.pages]);

  const onSave = async () => {
    setSaving(true);

    const crew = checkedCrew.map((c) => {
      if (focusedProjectPositionId) {
        const found = searchIndex.get(focusedProjectPosition?.toLocaleLowerCase() ?? '');

        if (!found) {
          return {
            id: c.id,
            position: capitalizeString(focusedProjectPosition ?? ''),
            department: undefined,
          };
        }

        return {
          id: c.id,
          position: found?.position,
          department: found?.departments?.[0],
        };
      }

      const found = searchIndex.get(c.position?.[0]?.name?.toLocaleLowerCase() ?? '');

      if (!found) {
        return {
          id: c.id,
          position: capitalizeString(c.position?.[0]?.name ?? ''),
          department: !!c.position?.[0]?.department?.[0]
            ? capitalizeString(c.position?.[0]?.department?.[0])
            : undefined,
        };
      }

      return {
        id: c.id,
        position: found?.position ?? '--',
        department: found?.departments?.[0] ?? '--',
      };
    });

    const body: Record<string, any> = {
      project: projectId,
      crew,
    };

    if (focusedProjectPositionId) {
      body.targetProjectPositionId = focusedProjectPositionId;
    }

    const response = await fetch(`/api/project-crew`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      toast.error('Failed to add crew');
      setSaving(false);
      return;
    }

    onUpdate();
    onClose();
  };

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-full w-[1200px] gap-0">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Add Crew {focusedProjectPosition ? `- ${focusedProjectPosition}` : ''}</DialogTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>
        <div className="flex w-full min-h-[300px]">
          <div className="w-2/3 flex flex-col border-r gap-2 border-zinc-900 py-4 px-6">
            {!openAddMember && (
              <>
                <SearchAndFilter
                  search={search}
                  setSearch={setSearch}
                  selectedLocations={selectedLocations}
                  setSelectedLocations={setSelectedLocations}
                  locations={locations}
                  positions={positions}
                  departments={departments}
                  locationsLoading={locationsLoading}
                  selectedPositions={selectedPositions}
                  setSelectedPositions={setSelectedPositions}
                  selectedDepartment={selectedDepartment}
                  setSelectedDepartment={setSelectedDepartment}
                />

                <div className="flex items-center justify-between">
                  <div className={cn('text-sm font-medium h-5 flex items-center')}>
                    {isLoading ? (
                      <Skeleton className="w-[100px] h-3" />
                    ) : (
                      <>
                        {total ?? 0} match{total !== 1 && 'es'}
                      </>
                    )}
                  </div>
                  {!focusedProjectPosition && !!crew.length && (
                    <Button
                      variant="accent"
                      className="px-4 py-1 rounded-full text-sm h-7 font-semibold"
                      size="small"
                      onClick={() => {
                        setCheckedCrew(crew);
                      }}
                      disabled={!crew.length}
                    >
                      Add all results
                    </Button>
                  )}
                </div>

                <div id="scrollableDiv" className="overflow-auto h-[420px] relative -mt-2">
                  <div className="h-3 sticky top-[-1px] left-0 right-0 rotate-180 z-[10] bg-modal-gradient" />

                  <InfiniteScroll
                    dataLength={crew.length}
                    next={fetchNextPage}
                    hasMore={!!hasNextPage}
                    loader={<></>}
                    scrollableTarget="scrollableDiv"
                  >
                    {crew.map((m) => (
                      <Member
                        locations={locations}
                        key={m.id}
                        crewMember={m}
                        checked={checkedCrew.map((c) => c.id).includes(m.id)}
                        setCheckedCrew={(checked) => {
                          if (focusedProjectPositionId) {
                            checked ? setCheckedCrew([m]) : setCheckedCrew([]);
                            return;
                          }

                          if (!checked) {
                            setCheckedCrew((prev) => prev.filter((c) => c.id !== m.id));
                            return;
                          }

                          setCheckedCrew((prev) => [...prev, m]);
                        }}
                      />
                    ))}
                  </InfiniteScroll>
                  {!total && !(isFetching || isLoading) && (
                    <div className="text-center text-white/40 text-sm py-8 flex flex-col gap-2">
                      No crew members found.
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          className="w-auto px-2"
                          variant="accent"
                          size="small"
                          onClick={() => setOpenAddMember(true)}
                        >
                          Add a new crew member
                        </Button>
                      </div>
                    </div>
                  )}
                  {(isFetching || isLoading) && (
                    <>
                      <MemberSkeleton />
                      <MemberSkeleton />
                      <MemberSkeleton />
                    </>
                  )}
                  <div className="h-3 sticky bottom-[-1px] left-0 right-0 bg-modal-gradient z-[10]" />
                </div>
              </>
            )}
          </div>
          <div className="w-1/3 flex gap-2 flex-col py-4 px-6">
            <h3 className="font-medium">Selected Crew ({checkedCrew.length})</h3>
            <div className="relative flex gap-2 flex-col h-[512px]">
              <div className="h-3 absolute top-[-1px] left-0 right-0 rotate-180 z-[10] bg-modal-gradient" />
              {!checkedCrew.length && (
                <div className="text-center text-white/40 text-sm py-8">No crew members selected</div>
              )}
              <div className="overflow-auto h-full flex flex-col gap-2">
                <div className="h-1" />
                {checkedCrew.map((c) => {
                  return (
                    <SelectedMember
                      key={c.id}
                      crewMember={c}
                      unCheck={() => setCheckedCrew((prev) => prev.filter((i) => i.id !== c.id))}
                      updatePosition={(c: CrewMember) => {
                        setCheckedCrew((prev) => prev.map((i) => (i.id === c.id ? c : i)));
                      }}
                      position={focusedProjectPosition}
                    />
                  );
                })}
                <div className="h-1" />
              </div>
              <div className="h-3 absolute bottom-[-1px] left-0 right-0 bg-modal-gradient z-[10]" />
            </div>
          </div>
        </div>

        <CreateCrew
          position={focusedProjectPosition}
          open={openAddMember}
          onClose={() => setOpenAddMember(false)}
          onSave={(c) => {
            setCheckedCrew((prev) => [...prev, c]);
            setSearch('');
            setOpenAddMember(false);
          }}
        />

        <DialogFooter className="flex items-center">
          <div className="flex gap-2 flex-1 w-full justify-end">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={() => {
                onClose();
              }}
            >
              Cancel
            </Button>

            <Button
              className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed"
              variant="accent"
              size="compact"
              onClick={onSave}
              disabled={!checkedCrew.length || saving}
            >
              {saving ? <LoadingIndicator size="small" className="opacity-50" /> : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
