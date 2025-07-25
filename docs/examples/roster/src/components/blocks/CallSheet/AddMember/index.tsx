import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import * as Sentry from '@sentry/nextjs';
import { Icon } from '@/components/ui/Icon';
import { cn, makeName } from '@/lib/utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from '../../CrewTable/Search';
import { createClient } from '@/lib/supabase/client';
import { useCompanyStore } from '@/store/company';
import { CallSheetMemberType, CompanyCrewMemberType } from '@/types/type';
import { toast } from 'sonner';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Tooltip } from '@/components/ui/Tooltip';
import { parsePhoneNumber } from 'react-phone-number-input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Database } from '@/types/supabase';
import { capitalizeString } from '@/lib/utils';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { AddCrewForm } from '../../CrewTable/AddCrew/Form';
import { Position } from '@/rules/positions';
import { FormikValues } from 'formik';
import { processRole } from '@/lib/processRole';
import { formatPhoneNumber } from '@/lib/phone';
import { Tab } from '@/components/ui/Tab';
import { modernRuleToPosition } from '@/lib/rules/modernRuleToPosition';

export const AddCallSheetMember = ({
  onSave,
  sheetId,
  projectId,
  department,
  children,
  callTime,
  wrapTime,
  className,
  iconClassName,
}: {
  onSave: () => void;
  sheetId: string;
  projectId: string;
  department?: string;
  children?: React.ReactNode;
  callTime?: string;
  wrapTime?: string;
  className?: string;
  iconClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isForm, setIsForm] = useState(false);
  const [selected, setSelected] = useState<any>();
  const [crew, setCrew] = useState<
    (CompanyCrewMemberType & {
      position: Database['public']['Tables']['position']['Row'][];
    })[]
  >([]);
  const { activeCompany } = useCompanyStore();

  const departmentIsTalent = (value: string) => {
    return value.trim().toLowerCase() === 'talent';
  };

  const [crewType, setCrewType] = useState<'crew' | 'talent'>(departmentIsTalent(department ?? '') ? 'talent' : 'crew');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const { setPositionRules, setPositionRulesId } = useCrewStore();
  const { search: searchPositions } = useSearchPositions();

  const supabase = createClient();

  const fetchCrew = useCallback(async () => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('company_crew_member')
      .select(
        `
      *,
      position!inner(
        *
      )
    `,
        { count: 'exact' },
      )
      .eq('company', activeCompany as string)
      .order('name', { ascending: true })
      .range(from, to);

    if (!!search) {
      query = query.like('tfs', `%${search?.toLocaleLowerCase()}%`);
    }

    const { data, error, count } = await query;

    if (data) {
      setCrew((prev) => {
        if (page === 0) return data;
        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueNewData = data.filter((item) => !existingIds.has(item.id));
        return [...prev, ...uniqueNewData];
      });
      setHasMore(count ? (page + 1) * PAGE_SIZE < count : false);
    }

    if (error) {
      toast.error(error.message);
    }
  }, [activeCompany, search, page]);

  useEffect(() => {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany]);

  useEffect(() => {
    setPage(0);
  }, [search, activeCompany]);

  useEffect(() => {
    fetchCrew();
  }, [fetchCrew]);

  //-- check to see if we're adding a crew directly from the "talent" department table.
  useEffect(() => {
    if (!department) return;

    if (departmentIsTalent(department)) {
      setCrewType('talent');
      setIsForm(true);
    }
  }, [department, open]);

  const cleanedCrew = useMemo(() => {
    return crew.map((member) => {
      let phone;
      try {
        const parsedPhone = parsePhoneNumber(member?.phone as string, 'US');

        phone = parsedPhone?.formatNational();
      } catch {
        phone = member?.phone;
      }

      const position = [
        ...new Set(
          member.position
            ?.filter((p) => !!p.name)
            ?.map((p) => {
              const positionRes = searchPositions((p?.name as string)?.toLocaleLowerCase());

              return {
                position: positionRes?.position ?? capitalizeString(p?.name as string),
                department: positionRes?.departments?.[0] ?? '',
              };
            })
            .filter(Boolean),
        ),
      ];

      return {
        ...member,
        originalPhone: member.phone,
        phone,
        position,
      };
    });
  }, [crew, searchPositions, department]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSearch('');
        setIsForm(false);
        setSelected(null);
        setSaving(false);
      }, 100);
    }
  }, [open]);

  //-- reset form state when a member is successfully added.
  const handleSave = () => {
    setSelected(null);
    onSave();
  };

  const onSubmit = async (values: FormikValues) => {
    if (!activeCompany) return;

    setSaving(true);

    let crew_member;

    //-- if a member was selected from the list, use that member's id.
    if (selected && selected.id) {
      crew_member = {
        id: selected.id,
        company: activeCompany,
        name: values.name,
        email: values.email,
        phone: values.phone,
      };
    } else {
      //-- always create a new record for new members.
      const [first_name, last_name] = makeName(values.name);

      const { data, error } = await supabase
        .from('company_crew_member')
        .insert({
          company: activeCompany,
          email: values.email ? values.email : null,
          phone: values.phone ? values.phone : null,
          name: values.name,
          first_name,
          last_name,
        })
        .select()
        .single();

      if (error) {
        toast.error('Something went wrong creating crew member');
        setSaving(false);
        return;
      }

      crew_member = data;
    }

    try {
      await processRole(
        { title: values.position?.toLowerCase() } as CallSheetMemberType,
        {
          id: crew_member?.id,
          company: activeCompany,
        } as CompanyCrewMemberType,
        [values.department].flat(),
        supabase,
        (query: string) => modernRuleToPosition(searchPositions(query)),
      );
    } catch (e) {
      Sentry.captureException(e);
    }

    const { formattedPhone } = formatPhoneNumber(values.phone);

    let projectMemberId;
    let projectPositionId;
    let existingProjectMember;

    //-- only look for existing project member if a crew member was selected from the list.
    if (selected && selected.id) {
      //-- check for existing project member.
      const projectOrConditions = [];

      if (values.phone) projectOrConditions.push(`phone.eq.${values.phone}`);
      if (values.email) projectOrConditions.push(`email.eq.${values.email}`);

      let projectMemberQuery = supabase
        .from('project_member')
        .select('*, project_position(*)')
        .eq('project', projectId);

      if (projectOrConditions.length > 0) {
        projectMemberQuery = projectMemberQuery.or(projectOrConditions.join(','));
      }

      const { data: existingProjectMembers } = await projectMemberQuery;
      existingProjectMember = existingProjectMembers?.[0];
    }

    if (existingProjectMember) {
      //-- use existing project member.
      projectMemberId = existingProjectMember.id;

      //-- check for existing position with same title/department.
      const existingPosition = existingProjectMember.project_position?.find(
        (pos) =>
          pos.title?.toLowerCase() === values.position?.toLowerCase() &&
          pos.department?.toLowerCase() === values.department?.toLowerCase(),
      );

      if (existingPosition) {
        projectPositionId = existingPosition.id;
      } else {
        //-- create new position for existing member.
        const { data: newPosition } = await supabase
          .from('project_position')
          .insert({
            title: values.position,
            department: crewType === 'talent' ? 'Talent' : values.department,
            project_member: projectMemberId,
            project: projectId,
          })
          .select('id')
          .single();

        projectPositionId = newPosition?.id;
      }
    } else {
      //-- create new project member.
      const { data: projectMember } = await supabase
        .from('project_member')
        .insert({
          name: values.name,
          email: values.email,
          phone: formattedPhone || values.phone,
          project: projectId,
          crew: crew_member?.id,
        })
        .select('id')
        .single();

      projectMemberId = projectMember?.id;

      //-- create position for new member.
      const { data: projectPosition } = await supabase
        .from('project_position')
        .insert({
          title: values.position,
          department: crewType === 'talent' ? 'Talent' : values.department,
          project_member: projectMemberId,
          project: projectId,
        })
        .select('id')
        .single();

      projectPositionId = projectPosition?.id;
    }

    //-- update call sheet member insert to use found/created ids.
    const { error } = await supabase.from('call_sheet_member').insert({
      company: activeCompany,
      order: -1,
      call_sheet: sheetId,
      project: projectId,
      crew_member: crew_member?.id,
      call_time: values.call_time,
      wrap_time: values.wrap_time,
      project_position: projectPositionId,
      department: crewType === 'talent' ? 'Talent' : values.department,
    });

    if (error) {
      toast.error('Something went wrong');
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    handleSave();
    toast.success(`${values.name} added to your call sheet`);
  };

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <DialogTrigger>
        {children ? (
          children
        ) : (
          <Button variant="accent" size="compact" className={cn('text-sm font-bold gap-2 px-2', className)}>
            <Icon name="user" className={cn('w-6 h-6', iconClassName)} />
            Add Crew
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isForm && (
                  <button className="w-10 h-10 flex items-center justify-center" onClick={() => setIsForm(false)}>
                    <Icon name="arrow-left" className="text-accent w-full h-full" />
                  </button>
                )}

                {isForm ? <div>{crewType === 'crew' ? 'Add Crew' : 'Add Talent'}</div> : 'Add Crew'}
              </div>

              {isForm && (
                <Tab
                  className="h-[30px] bg-neutral-800"
                  selectedBackgroundColor="#404040"
                  selectedHeight="22"
                  options={['crew', 'talent']}
                  selected={crewType}
                  setSelected={setCrewType as (value: string) => void}
                  defaultWidth={30}
                />
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isForm ? (
          <>
            <AddCrewForm
              crewType={crewType}
              onCancel={() => setOpen(false)}
              loading={saving}
              onSubmit={onSubmit}
              position={selected?.position?.[0].position}
              department={department || selected?.position?.[0].department}
              name={selected?.name}
              email={selected?.email}
              phone={selected?.originalPhone}
              callTime={callTime}
              wrapTime={wrapTime}
              toSheet
            />
          </>
        ) : (
          <>
            <div className="flex overflow-hidden">
              <div className="p-5 flex flex-col flex-1">
                <div>
                  <Search search={search} setSearch={setSearch} placeholder={'Search by name, email or phone...'} />
                </div>
                <div id="scrollableDiv" style={{ height: 420, overflow: 'auto' }}>
                  <div className="h-4 sticky top-0 left-0 right-0 rotate-180 z-[100] bg-add-crew-gradient" />
                  <InfiniteScroll
                    dataLength={crew.length}
                    next={loadMore}
                    hasMore={hasMore}
                    loader={
                      <div className="flex flex-col gap-3">
                        <MemberSkeleton />
                        <MemberSkeleton />
                        <MemberSkeleton />
                      </div>
                    }
                    scrollableTarget="scrollableDiv"
                  >
                    {cleanedCrew.map((member) => (
                      <div
                        className="cursor-pointer p-3 flex gap-2 font-medium text-white text-base bg-opacity-5 rounded-[18px] bg-white mb-3 hover:bg-opacity-10 duration-100"
                        key={member.id}
                        onClick={() => {
                          setIsForm(true);
                          setSelected(member);
                        }}
                      >
                        <div className="flex flex-col gap-0 flex-1">
                          {member.name}
                          <span className="text-xs flex font-medium text-white text-opacity-50 w-full max-w-[320px]">
                            {[member.email, member.phone].filter((item) => !!item).join(' • ')}
                          </span>
                          <Tooltip content={''}>
                            <span className="text-xs flex font-medium text-white text-opacity-50 w-full max-w-[320px]">
                              <span className="truncate">{member.position.map((p) => p.position).join(' • ')}</span>
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </InfiniteScroll>
                  <div className="h-4 sticky bottom-0 left-0 right-0 bg-add-crew-gradient z-[100]" />
                </div>

                <Button
                  variant="accent"
                  className="mt-2 gap-1"
                  size={'compact'}
                  onClick={() => {
                    setIsForm(true);
                    setSelected(null);
                  }}
                >
                  <Icon name="plusAlt" className="w-5 h-5" />
                  Create new member
                </Button>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between items-center">
              <div className="flex-1"></div>
              <div className="flex gap-2">
                <Button
                  className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
                  variant="outline"
                  size="compact"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MemberSkeleton = () => {
  return (
    <div className="cursor-pointer p-3 flex gap-2 font-medium text-white text-base bg-opacity-5 rounded-[18px] bg-white mb-3">
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="w-[180px] h-2" />
        <Skeleton className="w-[280px] h-1.5" />
        <Skeleton className="w-[200px] h-1.5" />
      </div>
    </div>
  );
};
