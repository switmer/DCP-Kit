import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { CompanyCrewMemberType, RateType } from '@/types/type';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sortable, SortableDragHandle, SortableItem } from '@/components/ui/Sortable';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Editable } from '@/components/ui/Editable';
import { formatPhoneNumber } from '@/lib/phone';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { ManageRate } from '../ManageRate';
import { AutoCompleteCrew } from '@/components/blocks/CallSheet/ProductionContacts/AutoCompleteCrew';
import { useQuery } from '@tanstack/react-query';
import { Position } from '@/rules/positions';
import { createPortal } from 'react-dom';

import { DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SelectionToolbar } from '../SelectionToolbar';
import { DaysWorking } from '../DaysWorking';
import { CrewMember } from '..';
import { Tooltip } from '@/components/ui/Tooltip';
import { format } from 'date-fns';
import { AddCrew } from '../AddCrew';
import { useCompanyStore } from '@/store/company';
import { ModernRule } from '@/types/rules';

export const CrewTable = ({
  data,
  loading,
  onUpdate,
  projectId,
  draggable,
  department,
}: {
  data: CrewMember[];
  loading: boolean;
  onUpdate: () => void;
  projectId: string;
  draggable?: boolean;
  department?: boolean;
}) => {
  const supabase = createClient();
  const [localData, setLocalData] = useState(data);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [openAddMember, setOpenAddMember] = useState(false);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const { search: searchPositions } = useSearchPositions();
  const { activeCompany } = useCompanyStore();
  const [useAllCrew, setUseAllCrew] = useState(true);
  const [showInputMap, setShowInputMap] = useState<number | null>(null);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});

  const [openDaysWorking, setOpenDaysWorking] = useState(false);
  const [daysWorkingFor, setDaysWorkingFor] = useState<number[]>([]);

  /* manage rate */
  const [openManageRate, setOpenManageRate] = useState(false);
  const [rateToManage, setRateToManage] = useState<RateType | null>(null);
  const [crewToManage, setCrewToManage] = useState<number | undefined | null>(undefined);
  const [positionToManage, setPositionToManage] = useState<string | null>(null);

  // add state to track open dropdown
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // fetch company crew members for autocomplete
  const companyCrewQuery = useQuery({
    queryKey: ['companyCrew'],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data: companyCrew, error: fetchCompanyCrewError } = await supabase
        .from('company_crew_member')
        .select()
        .eq('company', activeCompany as string);

      if (!companyCrew || fetchCompanyCrewError) {
        toast.error('Something went wrong fetching company crew.');
        return [];
      }

      return companyCrew;
    },
  });

  const companyCrewMembers = useMemo(() => {
    return companyCrewQuery.data ?? [];
  }, [companyCrewQuery.data]);

  useEffect(() => {
    setLocalData([...data].sort((a, b) => (a.department_order ?? 0) - (b.department_order ?? 0)));
  }, [data]);

  // reset showInputMap when data changes (e.g., after a successful update).
  // useEffect(() => {
  //   // if a row has a project_member, make sure we're not showing the input for it.
  //   const newShowInputMap = { ...showInputMap };
  //   let changed = false;
  //
  //   data.forEach((row) => {
  //     if (row.project_member && showInputMap[row.id]) {
  //       newShowInputMap[row.id] = false;
  //       changed = true;
  //     }
  //   });
  //
  //   if (changed) {
  //     setShowInputMap(newShowInputMap);
  //   }
  // }, [data, showInputMap]);

  const handleReorder = async (newOrder: CrewMember[]) => {
    try {
      setLocalData(newOrder);

      if (department) {
        const { data: allPositions } = await supabase
          .from('project_position')
          .select('id, department_order, department')
          .eq('project', projectId)
          .order('department_order');

        if (allPositions) {
          const currentDept = newOrder[0]?.department || 'Other';

          const departmentPositions = allPositions.filter((pos) => (pos.department || 'Other') === currentDept);

          const updates: { id: number; department_order: number }[] = [];

          const minDeptOrder = Math.min(
            ...departmentPositions.map((pos) => pos.department_order ?? Number.MAX_SAFE_INTEGER),
          );

          newOrder.forEach((item, index) => {
            updates.push({
              id: item.id,
              department_order: minDeptOrder + index,
            });
          });

          const { error } = await supabase.from('project_position').upsert(updates, { onConflict: 'id' });

          if (error) throw error;
        }
      } else {
        const updates = newOrder.map((item, index) => ({
          id: item.id,
          department_order: index + 1,
        }));

        const { error } = await supabase.from('project_position').upsert(updates, { onConflict: 'id' });

        if (error) throw error;
      }

      onUpdate();
    } catch (error) {
      toast.error('Failed to update order');
      setLocalData(data);
    }
  };

  const handleUpdate = useCallback(
    async (key: string, value: any, row: (CrewMember & { original: { id: number } }) | any, addNew?: boolean) => {
      try {
        switch (key) {
          case 'title': {
            const { error } = await supabase.from('project_position').update({ title: value }).eq('id', row.id);
            if (error) throw error;
            break;
          }

          case 'department': {
            const { error } = await supabase.from('project_position').update({ department: value }).eq('id', row.id);
            if (error) throw error;
            break;
          }

          case 'phone':
          case 'email':
          case 'name': {
            let firstName;
            let lastName;

            if (key === 'name') {
              const nameValue = value.name || '';
              firstName = nameValue.split(' ')[0] ?? '';
              lastName = nameValue.split(' ').slice(1).join(' ') ?? '';
            }

            // if true, this is a selected crew member from the auto-complete.
            if (typeof value === 'object' && value !== null) {
              const crewMemberData = value as CompanyCrewMemberType;

              // if "add them" is clicked from the suggestions drop down, override other logic and add new company and project crew,
              // then update the existing position.
              if (addNew) {
                const { data: newCrewMember, error: crewError } = await supabase
                  .from('company_crew_member')
                  .insert({
                    company: activeCompany,
                    name: value.name ?? '',
                    first_name: firstName ?? '',
                    last_name: lastName ?? '',
                  })
                  .select()
                  .single();

                if (crewError || !newCrewMember) {
                  throw new Error('Failed to create crew member.');
                }

                toast.success('Successfully added new company crew member.');

                const { data: projectMember, error: projectMemberError } = await supabase
                  .from('project_member')
                  .insert({
                    project: projectId,
                    crew: newCrewMember.id,
                    name: newCrewMember.name,
                    // email: key === 'email' ? value : '',
                    // phone: key === 'phone' ? formatPhoneNumber(value).formattedPhone || value : '',
                  })
                  .select();

                if (projectMemberError) {
                  throw new Error('Failed to create project member.');
                }

                toast.success('Successfully added new project crew member.');

                const { error: positionError } = await supabase
                  .from('project_position')
                  .update({ project_member: projectMember[0].id })
                  .eq('id', row.id);

                if (positionError) {
                  throw new Error('Failed to update position.');
                }

                onUpdate();
                toast.success('Successfully updated position.');

                return;
              }

              if (!row.project_member?.id) {
                const { data: projectMember, error: projectMemberError } = await supabase
                  .from('project_member')
                  .insert({
                    project: projectId,
                    crew: crewMemberData.id,
                    name: crewMemberData.name || '',
                    email: crewMemberData.email || '',
                    phone: crewMemberData.phone || '',
                  })
                  .select();

                if (projectMemberError) {
                  throw new Error('Failed to create project member.');
                }

                const { error: positionError } = await supabase
                  .from('project_position')
                  .update({ project_member: projectMember[0].id })
                  .eq('id', row.id);

                if (positionError) {
                  throw new Error('Failed to update position.');
                }
              }
            } else {
              if (!row.project_member?.id) {
                // disallow creating a new company_crew_member record without a name.
                if (key !== 'name') return;

                const { data: newCrewMember, error: crewError } = await supabase
                  .from('company_crew_member')
                  .insert({
                    company: activeCompany,
                    name: key === 'name' ? value : '',
                    first_name: firstName ?? '',
                    last_name: lastName ?? '',
                  })
                  .select()
                  .single();

                if (crewError || !newCrewMember) {
                  throw new Error('Failed to create crew member.');
                }

                const { data: projectMember, error: projectMemberError } = await supabase
                  .from('project_member')
                  .insert({
                    project: projectId,
                    crew: newCrewMember.id,
                    name: key === 'name' ? value : '',
                    // email: key === 'email' ? value : '',
                    // phone: key === 'phone' ? formatPhoneNumber(value).formattedPhone || value : '',
                  })
                  .select();

                if (projectMemberError || !projectMember) {
                  await supabase.from('company_crew_member').delete().eq('id', newCrewMember.id);
                  throw new Error('Failed to create project member.');
                }

                const { error: positionError } = await supabase
                  .from('project_position')
                  .update({ project_member: projectMember[0].id })
                  .eq('id', row.id);

                if (positionError) {
                  throw new Error('Failed to update position.');
                }
              } else {
                // update existing project_member.
                const updateValue = key === 'phone' ? formatPhoneNumber(value).formattedPhone || value : value;

                const { error } = await supabase
                  .from('project_member')
                  .update({ [key]: updateValue })
                  .eq('id', row.project_member.id);

                if (error) throw error;

                // // Also update the corresponding company_crew_member record
                // if (row.project_member.crew_member) {
                //   const { error: crewUpdateError } = await supabase
                //     .from('company_crew_member')
                //     .update({ [key]: updateValue })
                //     .eq('id', row.project_member.crew_member);
                //
                //   if (crewUpdateError) {
                //     console.warn('Failed to update crew member record:', crewUpdateError);
                //   }
                // }
              }
            }

            break;
          }

          case 'status': {
            const { error } = await supabase.from('project_position').update({ status: value }).eq('id', row.id);
            if (error) throw error;
            break;
          }
        }

        onUpdate();
        toast.success('Updated successfully');
      } catch (error) {
        console.error('Update error:', error);
        toast.error('Failed to update');
      }

      setOpenDropdownId(null);
    },
    [onUpdate, supabase, activeCompany, projectId],
  );

  const columns: ColumnDef<CrewMember>[] = useMemo(
    () => [
      {
        id: 'drag',
        header: () => {
          const allChecked = localData.length > 0 && checkedIds.length === localData.length;
          const someChecked = checkedIds.length > 0 && checkedIds.length < localData.length;

          return (
            <div className="w-6 h-6 flex items-center justify-center">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setCheckedIds(localData.map((item) => item.id));
                  } else {
                    setCheckedIds([]);
                  }
                }}
                className={someChecked ? 'indeterminate' : ''}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const isChecked = checkedIds.includes(row.original.id);

          return (
            <div className="flex justify-start items-center">
              <div className="w-6 h-6 flex items-center justify-center">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    setCheckedIds((prev) => {
                      if (checked) {
                        return [...prev, row.original.id];
                      }
                      return prev.filter((id) => id !== row.original.id);
                    });
                  }}
                />
              </div>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: 'Position',
        cell: ({ row }) => {
          if (loading) {
            return (
              <div className="flex items-center gap-1">
                <Icon className={cn('w-4 h-4 text-white duration-150', `cursor-grab opacity-50`)} name="drag" />
                <Skeleton className="w-24 h-4" />
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1 w-[220px]">
              {draggable && (
                <SortableDragHandle variant="ghost">
                  <Icon className={cn('w-4 h-4 text-white duration-150', `cursor-grab opacity-50`)} name="drag" />
                </SortableDragHandle>
              )}

              <Editable
                className="w-full"
                type="text"
                onChange={(v) => handleUpdate('title', v, row.original)}
                value={row.original.title}
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'project_member.name',
        header: 'Name',
        cell: ({ row }) => {
          if (loading) {
            return (
              <div className="flex">
                <Skeleton className="w-24 h-4" />
              </div>
            );
          }

          if (!row.original.project_member) {
            // if there's no project member, show the "add member" button with an expand button to its left.
            return (
              <div className="flex items-center gap-2 w-[220px]">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="small"
                    className={cn(
                      'h-[32px] w-[32px] p-0 transition-opacity duration-300 ease-in-out',
                      showInputMap === row.original.id && 'opacity-0',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInputMap(row.original.id);
                      setInputValues((prev) => ({ ...prev, [row.original.id]: '' }));
                    }}
                  >
                    <Icon name="search" className="w-4 h-4 text-opacity-60 text-white" />
                  </Button>

                  {showInputMap === row.original.id && (
                    <div className="absolute left-0 top-0 ">
                      <AutoCompleteCrew
                        key={`crew-autocomplete-${row.original.id}`}
                        className="animate-expand-from-left bg-transparent"
                        type="table"
                        autoFocus={true}
                        placeholder="Enter name"
                        crewSuggestions={companyCrewMembers}
                        useAllCrew={useAllCrew}
                        value={inputValues[row.original.id] || ''}
                        onChange={async (v) => {
                          if (v && v.trim() !== '' && v !== row.original.project_member?.name) {
                            await handleUpdate('name', v, row.original);
                          }
                        }}
                        onBlur={(v) => {
                          // hide the input when it loses focus and no value was entered.
                          if (!v || v.trim() === '') {
                            setShowInputMap(null);

                            // clear the input value for this row.
                            setInputValues((prev) => {
                              const newValues = { ...prev };
                              delete newValues[row.original.id];
                              return newValues;
                            });
                          }
                        }}
                        onCrewClick={async (crew) => {
                          if (crew.name || crew.phone || crew.email) {
                            await handleUpdate('name', crew, row.original);
                          }

                          // clear the input value and hide the input after selecting a crew member.
                          setInputValues((prev) => {
                            const newValues = { ...prev };
                            delete newValues[row.original.id];
                            return newValues;
                          });

                          setShowInputMap(null);
                        }}
                      />
                    </div>
                  )}
                </div>

                {showInputMap !== row.original.id && (
                  <Button
                    variant={'outline'}
                    size={'compact'}
                    className="font-semibold gap-1 px-3 inline-flex h-[32px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenAddMember(true);
                      setFocusedRow(row.original.id);
                    }}
                  >
                    <Icon name="plus-circle" className="w-5 h-5 text-opacity-60 text-white" />
                    Add member
                  </Button>
                )}
              </div>
            );
          }

          return (
            <div className="flex items-center w-[220px]">
              {row.original.project_member && (
                <div className="flex">
                  <AutoCompleteCrew
                    key={`crew-autocomplete-member-${row.original.id}`}
                    className="w-full bg-transparent"
                    type="table"
                    placeholder="Enter name"
                    crewSuggestions={companyCrewMembers}
                    useAllCrew={useAllCrew}
                    value={row.original.project_member?.name || undefined}
                    onChange={async (v) => {
                      // this is only called when Enter is pressed or a suggestion is selected.
                      if (v && v.trim() !== '' && v !== row.original.project_member?.name) {
                        await handleUpdate('name', v, row.original);
                      }
                    }}
                    onBlur={(v) => {
                      return;
                    }}
                    onAddNewClick={(newCrew, addNew) => handleUpdate('name', newCrew, row.original, addNew)}
                    onCrewClick={async (crew) => {
                      if (crew.name) {
                        await handleUpdate('name', crew.name, row.original);
                      }

                      if (crew.email) {
                        await handleUpdate('email', crew.email, row.original);
                      }

                      if (crew.phone) {
                        await handleUpdate('phone', crew.phone, row.original);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          if (loading) {
            return (
              <div className="flex">
                <Skeleton className="w-24 h-4" />
              </div>
            );
          }

          return (
            <DropdownMenu
              open={openDropdownId === row.original.id}
              onOpenChange={(open) => {
                setOpenDropdownId(open ? row.original.id : null);
              }}
            >
              <DropdownMenuTrigger className="capitalize px-2 h-5 bg-white/5 rounded-[100px] flex items-center justify-center text-xs">
                {row.original?.status ? (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-2.5 py-1 border border-neutral-600',
                      row.original.status === 'confirmed' && 'text-lime-300 border-lime-300/80 bg-lime-300/30',
                      row.original.status === 'declined' && 'text-red-500 border-red-600/50 bg-red-700/30',
                      row.original.status === 'pending' && 'text-yellow-300 border-yellow-300 bg-yellow-300/30',
                      row.original.status === 'contacted' && 'text-blue-300 border-blue-400 bg-blue-400/30',
                    )}
                  >
                    {row.original.status}

                    <Icon
                      name="chevron"
                      className={cn(
                        'w-2 h-2 font-bold rotate-90',
                        // row.original.status === 'confirmed' && 'text-lime-300',
                      )}
                    />
                  </div>
                ) : (
                  <div className="">Select a status</div>
                )}
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="bottom"
                align="end"
                className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 gap-1 flex flex-col w-[160px]"
              >
                {['pending', 'contacted', 'confirmed', 'declined'].map((status) => (
                  <button
                    onClick={() => handleUpdate('status', status, row.original)}
                    className={cn(
                      'h-10 pl-3 pr-2 py-2 capitalize hover:bg-white hover:bg-opacity-5 rounded cursor-pointer text-sm gap-2 justify-between flex w-full items-center [&>button]:w-full [&>button]:text-left',
                      row.original?.status === status && 'bg-accent/5 hover:bg-accent/5',
                      status === 'confirmed'
                        ? 'text-lime-300'
                        : status === 'pending'
                          ? 'text-yellow-300'
                          : status === 'declined'
                            ? 'text-red-500'
                            : 'text-blue-300',
                    )}
                    key={status}
                  >
                    <div className="flex">{status}</div>

                    {row.original?.status === status && <Icon name="checkmark" className="w-5 h-5 text-accent" />}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
      {
        accessorKey: 'project_member.email',
        header: 'Email',
        cell: ({ row }) => {
          if (loading) {
            return <Skeleton className="w-24 h-4" />;
          }

          return (
            <div className="flex">
              <Editable
                className="w-full"
                type="email"
                onChange={(v) => handleUpdate('email', v, row.original)}
                value={row.original.project_member?.email}
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'project_member.phone',
        header: 'Phone',
        cell: ({ row }) => {
          if (loading) {
            return <Skeleton className="w-24 h-4" />;
          }

          return (
            <div className="flex w-[180px]">
              <Editable
                className="w-full"
                type="tel"
                onChange={(v) => handleUpdate('phone', v, row.original)}
                value={row.original.project_member?.phone}
              />
            </div>
          );
        },
      },
      {
        id: 'department',
        accessorKey: 'department',
        header: 'Department',
        cell: ({ row }) => {
          if (loading) {
            return <Skeleton className="w-24 h-4" />;
          }

          return (
            <div className="flex w-[180px]">
              <Editable
                className="w-full"
                type="text"
                onChange={(v) => handleUpdate('department', v, row.original)}
                value={row.original.department}
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'rate',
        header: 'Rate',
        cell: ({ row }) => {
          if (loading) {
            return <Skeleton className="w-20 h-4" />;
          }

          const rates = row.original.project_member?.crew?.role_rate;

          if (!row.original.title || !row.original.project_member?.crew?.id) {
            return <span className="text-white/40">--</span>;
          }

          const crewPosition = searchPositions(row.original.title);

          const rate = rates?.find((r) => {
            if (!r.role) return false;
            const position = searchPositions(r.role);

            return crewPosition?.position === position?.position;
          });

          if (!rate) {
            return (
              <Button
                variant={'outline'}
                size={'compact'}
                className="font-semibold gap-1 px-3 inline-flex h-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenManageRate(true);
                  setRateToManage(null);
                  setCrewToManage(row.original.project_member?.crew?.id);
                  setPositionToManage(row.original.title);
                }}
              >
                <Icon name="plus-circle" className="w-5 h-5 text-opacity-60 text-white" />
                Add rate
              </Button>
            );
          }

          return (
            <div className="flex items-center">
              <button
                onClick={() => {
                  setOpenManageRate(true);

                  if (rate) {
                    setRateToManage(rate);
                  }

                  if (row.original.project_member?.crew?.id) {
                    setCrewToManage(row.original.project_member?.crew?.id);
                  }

                  setPositionToManage(row.original.title);
                }}
                className={cn(
                  'flex items-center justify-center h-8 rounded-lg px-1 gap-1',
                  rate?.rate ? 'text-white' : 'text-white/40',
                  rate?.rate && 'bg-white bg-opacity-0 hover:bg-opacity-10 duration-100',
                )}
              >
                {rate?.rate ?? '--'}

                <span className="text-white/60 text-sm flex items-center gap-1">
                  {!!rate?.type && <span>/</span>}
                  {rate?.type === 'hour' ? 'hr' : rate?.type === 'day' ? 'day' : rate?.type === 'week' ? 'wk' : null}
                </span>
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: 'working',
        header: 'Working',

        cell: ({ row }) => {
          if (loading) {
            return <Skeleton className="w-[140px] h-4" />;
          }

          const workingDays = row.original.call_sheet_member || [];
          const dateString = workingDays.length
            ? workingDays
                .filter((day) => !!day?.call_sheet?.date)
                /* @ts-ignore */
                .map((day) => format(new Date(day.call_sheet.date), 'MMM d'))
                .join(', ')
            : '--';

          return (
            <div className="min-w-[140px]">
              {!!workingDays.length && (
                <button
                  className="mr-1 h-8 px-2 text-xs text-white py-1 rounded-lg bg-zinc-900 text-left overflow-hidden text-ellipsis whitespace-nowrap"
                  onClick={() => {
                    setDaysWorkingFor([row.original.id]);
                    setOpenDaysWorking(true);
                  }}
                >
                  {`${workingDays.length}d`}
                </button>
              )}

              <Tooltip content={`${!!workingDays.length ? `${dateString} - ` : ''}Click to assign work days`}>
                <button
                  className="h-8 px-2 text-xs text-white/60 py-1 rounded-lg bg-zinc-900 text-left overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]"
                  onClick={() => {
                    setDaysWorkingFor([row.original.id]);
                    setOpenDaysWorking(true);
                  }}
                >
                  <span className={workingDays.length ? '' : 'text-white/40'}>{dateString}</span>
                </button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [localData, checkedIds, loading, handleUpdate, searchPositions, openDropdownId, draggable, showInputMap],
  );

  const table = useReactTable({
    data: loading ? Array(5).fill({}) : localData,
    columns: !department ? columns : columns.filter((c) => c.id !== 'department'),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-zinc-600 border-opacity-20 h-14">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-white text-opacity-95 text-base leading-none font-bold h-14 px-3.5 py-0"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          <Sortable
            value={localData}
            onValueChange={(newData) => handleReorder(newData)}
            overlay={
              <Table>
                <TableBody>
                  <TableRow className="border-none">
                    <div className="h-14 w-full bg-white/5 rounded-xl" />
                  </TableRow>
                </TableBody>
              </Table>
            }
          >
            {table.getRowModel().rows?.length || loading ? (
              table.getRowModel().rows.map((row) => (
                <SortableItem key={row.id} value={row.original.id} asChild>
                  <TableRow className="group border-b border-white border-opacity-10 h-14">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn('px-3.5 py-0 h-14 text-white/95 text-base font-medium group-hover:bg-white/5')}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                </SortableItem>
              ))
            ) : (
              <TableRow className="h-14 border-none">
                <TableCell colSpan={columns.length} className="h-14 text-base text-center">
                  <span className="text-white/60">No crew members yet.</span>
                </TableCell>
              </TableRow>
            )}

            <TableRow className="h-14 border-none">
              <TableCell colSpan={columns.length} className="px-3.5 py-0 h-14">
                <AddPositionRow
                  projectId={projectId}
                  department={localData[0]?.department ?? undefined}
                  onUpdate={onUpdate}
                  companyCrewMembers={companyCrewMembers}
                  activeCompany={activeCompany as string}
                />
              </TableCell>
            </TableRow>
          </Sortable>
        </TableBody>
      </Table>

      {openAddMember && (
        <AddCrew
          open={openAddMember}
          onClose={() => setOpenAddMember(false)}
          onUpdate={onUpdate}
          projectId={projectId}
          focusedProjectPositionId={focusedRow}
          focusedProjectPosition={
            focusedRow ? (localData.find((item) => item.id === focusedRow)?.title ?? undefined) : undefined
          }
        />
      )}

      {crewToManage && positionToManage && (
        <ManageRate
          open={openManageRate}
          setOpen={(o) => {
            setOpenManageRate(o);

            if (!o) {
              setRateToManage(null);
              setCrewToManage(null);
              setPositionToManage(null);
            }
          }}
          onUpdate={onUpdate}
          crew={crewToManage}
          position={positionToManage}
          rate={rateToManage}
        />
      )}

      <SelectionToolbar
        checkedIds={checkedIds}
        setCheckedIds={setCheckedIds}
        onUpdate={onUpdate}
        setOpenDaysWorking={setOpenDaysWorking}
        setDaysWorkingFor={setDaysWorkingFor}
      />

      <DaysWorking
        open={openDaysWorking}
        onClose={() => {
          setDaysWorkingFor([]);
          setOpenDaysWorking(false);
        }}
        checkedIds={daysWorkingFor}
        data={localData}
        onUpdate={onUpdate}
      />
    </>
  );
};

const AddPositionRow = ({
  projectId,
  department,
  onUpdate,
  companyCrewMembers,
  activeCompany,
}: {
  projectId: string;
  department?: string;
  onUpdate: () => void;
  companyCrewMembers: CompanyCrewMemberType[];
  activeCompany: string;
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<(ModernRule | { type: 'crew'; crew: CompanyCrewMemberType })[]>(
    [],
  );
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { search: searchPositions, fuzzySearch } = useSearchPositions();
  const { searchIndex, setPositionRules } = useCrewStore();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // function to calculate dropdown position.
  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;

    const inputRect = inputRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const viewportHeight = window.innerHeight;

    // estimate dropdown height (or use a reasonable max height).
    // 40px per item + padding -- max 240px.
    const estimatedDropdownHeight = Math.min(searchResults.length * 40 + 20, 240);

    // check if dropdown would extend beyond bottom of viewport.
    const dropdownBottom = inputRect.bottom + estimatedDropdownHeight;
    const wouldOverflowBottom = dropdownBottom > viewportHeight;

    // position below by default, but above if it would overflow.
    if (wouldOverflowBottom) {
      // position above the input.
      setDropdownPosition({
        top: inputRect.top + scrollTop - estimatedDropdownHeight - 7,
        left: inputRect.left + scrollLeft,
        width: inputRect.width,
      });
    } else {
      // position below the input.
      setDropdownPosition({
        top: inputRect.bottom + scrollTop + 7,
        left: inputRect.left + scrollLeft,
        width: inputRect.width,
      });
    }
  }, [searchResults.length]);

  // initialize position rules if searchIndex is empty.
  useEffect(() => {
    if (!searchIndex || searchIndex.size === 0) {
      // import defaultPositionRules and set them.
      import('@/rules/positions').then(({ defaultPositionRules }) => {
        setPositionRules(defaultPositionRules);
      });
    }
  }, [searchIndex, setPositionRules]);

  // handle search input change.
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchValue(value);

    // reset selected index when input changes.
    setSelectedIndex(-1);

    if (value.trim() === '') {
      setSearchResults([]);
      setShowDropdown(false);

      return;
    }

    if (value.trim().length >= 1) {
      // use fuzzy search to find matching positions.
      const fuzzyResults = fuzzySearch(value);

      const positions = fuzzyResults
        .map((posName) => {
          const position = searchPositions(posName);

          return position;
        })
        .filter((pos): pos is ModernRule => {
          const valid = !!pos;

          return valid;
        })
        // filter positions by department if a department is specified.
        .filter((pos) => {
          // if no department is specified, include all positions.
          if (!department) return true;

          // check if the position belongs to the current department.
          const belongsToDepartment = pos.departments.some((dept) => dept.toLowerCase() === department.toLowerCase());

          return belongsToDepartment;
        });

      // search for matching crew members.
      const matchingCrewMembers = companyCrewMembers
        .filter((crew) => {
          if (!crew.name) return false;

          return crew.name.toLowerCase().includes(value.toLowerCase());
        })
        .map((crew) => ({ type: 'crew' as const, crew }));

      // combine positions and crew members, prioritizing positions.
      const combinedResults = [...positions, ...matchingCrewMembers];

      setSearchResults(combinedResults);
      // always show dropdown when searching, even if no results.
      setShowDropdown(true);

      // update dropdown position.
      updateDropdownPosition();
    } else {
      setShowDropdown(false);
    }
  };

  // handle keyboard navigation.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const selected = searchResults[selectedIndex];
          if ('type' in selected && selected.type === 'crew') {
            handleSelectCrewMember(selected.crew);
          } else {
            handleSelectPosition(selected as Position);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  const handleSelectPosition = async (position: Position) => {
    try {
      // create a new position in the project.
      const { error } = await supabase.from('project_position').insert({
        title: position.position,
        department: department || position.departments?.[0] || 'Other',
        project: projectId,
      });

      if (error) throw error;

      // clear search and hide dropdown.
      setSearchValue('');
      setShowDropdown(false);
      setSearchResults([]);

      onUpdate();
      toast.success(`Added position: ${position.position}`);
    } catch (error) {
      console.error('Error adding position:', error);
      toast.error('Failed to add position');
    }
  };

  const handleSelectCrewMember = async (crew: CompanyCrewMemberType) => {
    try {
      // first create a project member record.
      const { data: projectMember, error: projectMemberError } = await supabase
        .from('project_member')
        .insert({
          project: projectId,
          crew: crew.id,
          name: crew.name || '',
          email: crew.email || '',
          phone: crew.phone || '',
        })
        .select();

      if (projectMemberError || !projectMember) {
        throw new Error('Failed to create project member.');
      }

      // then create a position record linked to the new project member.
      const { error: positionError } = await supabase.from('project_position').insert({
        title: '',
        department: department || 'Other',
        project: projectId,
        project_member: projectMember[0].id,
      });

      if (positionError) {
        throw new Error('Failed to create position.');
      }

      // clear search and hide dropdown.
      setSearchValue('');
      setShowDropdown(false);
      setSearchResults([]);

      onUpdate();
      toast.success(`Added ${crew.name} to ${department || 'Other'} department`);
    } catch (error) {
      console.error('Error adding crew member:', error);
      toast.error('Failed to add crew member');
    }
  };

  // handle creating a custom position from user input.
  const handleCreateCustomPosition = async (positionName: string) => {
    if (!positionName.trim()) return;

    try {
      // create a new position in the project.
      const { error } = await supabase.from('project_position').insert({
        title: positionName.trim(),
        department: department || 'Other',
        project: projectId,
      });

      if (error) throw error;

      // clear search and hide dropdown.
      setSearchValue('');
      setShowDropdown(false);
      setSearchResults([]);

      onUpdate();
      toast.success(`Added position: ${positionName.trim()}`);
    } catch (error) {
      console.error('Error adding custom position:', error);
      toast.error('Failed to add position');
    }
  };

  // handle creating a custom crew member from user input.
  const handleCreateCustomCrew = async (crewName: string) => {
    if (!crewName.trim()) return;

    setShowDropdown(false);

    try {
      // first create a new company crew member.

      const firstName = crewName.split(' ')[0] ?? '';
      const lastName = crewName.split(' ').slice(1).join(' ') ?? '';

      const { data: newCrewMember, error: crewError } = await supabase
        .from('company_crew_member')
        .insert({
          company: activeCompany,
          name: crewName,
          first_name: firstName,
          last_name: lastName,
        })
        .select()
        .single();

      if (crewError || !newCrewMember) {
        throw new Error('Failed to create crew member.');
      }

      // Then create a project member record
      const { data: projectMember, error: projectMemberError } = await supabase
        .from('project_member')
        .insert({
          project: projectId,
          crew: newCrewMember.id,
          name: newCrewMember.name,
        })
        .select();

      if (projectMemberError || !projectMember) {
        // clean up the created company crew member if project member creation fails.
        await supabase.from('company_crew_member').delete().eq('id', newCrewMember.id);

        throw new Error('Failed to create project member.');
      }

      // finally create a position record linked to the new project member.
      const { error: positionError } = await supabase.from('project_position').insert({
        title: '',
        department: department || 'Other',
        project: projectId,
        project_member: projectMember[0].id,
      });

      if (positionError) {
        throw new Error('Failed to create position.');
      }

      // clear search and hide dropdown.
      setSearchValue('');
      setSearchResults([]);

      onUpdate();

      toast.success(`Added ${crewName.trim()} to ${department || 'Other'} department`);
    } catch (error) {
      console.error('Error adding crew member:', error);
      toast.error('Failed to add crew member');
    }
  };

  // handle click outside to close dropdown.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // update dropdown position on scroll/resize.
  useEffect(() => {
    if (!showDropdown) return;

    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showDropdown, updateDropdownPosition]);

  return (
    <div className="relative flex items-center">
      <div className="flex items-center w-full">
        <Icon name="search" className="absolute left-3 w-4 h-4 text-white text-opacity-60" />

        <input
          ref={inputRef}
          type="text"
          placeholder="Add position or crew..."
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // show dropdown immediately on focus if there are results.
            if (searchValue.trim() !== '' && searchResults.length > 0) {
              setShowDropdown(true);
              updateDropdownPosition();
            }
          }}
          className="flex-1 h-10 pl-9 pr-3 bg-white bg-opacity-5 border border-white border-opacity-10 rounded-lg text-white text-opacity-95 focus:outline-none focus:border-lime-300"
        />
      </div>

      {showDropdown &&
        dropdownPosition &&
        (typeof document !== 'undefined'
          ? createPortal(
              <div
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                  zIndex: 9999,
                  overflow: 'auto',
                }}
                className="bg-zinc-900 border-1 border-white rounded-lg w-auto max-w-[500px] max-h-[240px]"
              >
                {searchResults.length > 0 ? (
                  searchResults.map((result, index) => {
                    if ('type' in result && result.type === 'crew') {
                      // render crew member.
                      return (
                        <div
                          key={`crew-${result.crew.id}-${index}`}
                          className={cn(
                            'flex items-center px-3 py-2 hover:bg-white hover:bg-opacity-10 cursor-pointer',
                            selectedIndex === index && 'bg-white bg-opacity-10',
                          )}
                          onClick={() => handleSelectCrewMember(result.crew)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <Icon name="user" className="w-4 h-4 mr-2 text-lime-300" />
                          <div className="text-white font-bold">{result.crew.name}</div>
                          <div className="ml-2 text-xs text-white text-opacity-50">(Crew Member)</div>
                        </div>
                      );
                    } else {
                      // render position.
                      const position = result as Position;

                      return (
                        <div
                          key={`position-${position.position}-${index}`}
                          className={cn(
                            'flex items-center px-3 py-2 hover:bg-white hover:bg-opacity-10 cursor-pointer',
                            selectedIndex === index && 'bg-white bg-opacity-10',
                          )}
                          onClick={() => handleSelectPosition(position)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <Icon name="plus-circle" className="w-4 h-4 mr-2 text-white/60" />
                          <div className="text-white font-bold">{position.position}</div>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="flex flex-col">
                    <div
                      className="flex items-center px-3 py-2 text-white/50 text-sm hover:bg-white hover:bg-opacity-10 cursor-pointer"
                      onClick={() => handleCreateCustomPosition(searchValue)}
                    >
                      <Icon name="plus-circle" className="w-4 h-4 mr-2 text-lime-300" />

                      <div className="flex items-center">
                        <div className="text-white/100">{'Create "'}</div>
                        <div className="text-lime-300 font-bold">{searchValue}</div>
                        <div className="text-white/100">{'"'}</div>

                        <div className="ml-2 text-xs text-white text-opacity-50">(Position)</div>
                      </div>
                    </div>

                    <div
                      className="flex items-center px-3 py-2 text-white/50 text-sm hover:bg-white hover:bg-opacity-10 cursor-pointer"
                      onClick={() => handleCreateCustomCrew(searchValue)}
                    >
                      <Icon name="plus-circle" className="w-4 h-4 mr-2 text-lime-300" />

                      <div className="flex items-center">
                        <div className="text-white/100">{'Create "'}</div>
                        <div className="text-lime-300 font-bold">{searchValue}</div>
                        <div className="text-white/100">{'"'}</div>

                        <div className="ml-2 text-xs text-white text-opacity-50">(Crew Member)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>,
              document.body,
            )
          : null)}
    </div>
  );
};
