import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from '../../CrewTable/Search';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { createClient } from '@/lib/supabase/client';
import { useCompanyStore } from '@/store/company';
import { CompanyCrewMemberType, CallSheetMemberType } from '@/types/type';
import { Database } from '@/types/supabase';
import { toast } from 'sonner';
import { Position } from '@/rules/positions';
import { parsePhoneNumber } from 'react-phone-number-input';
import { capitalizeString, makeName } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { AddCrewForm } from '../../CrewTable/AddCrew/Form';
import { FormikValues } from 'formik';
import { processRole } from '@/lib/processRole';
import { modernRuleToPosition } from '@/lib/rules/modernRuleToPosition';

export const AddMember = ({
  open,
  onClose,
  projectId,
  onUpdate,
  focusedProjectPositionId,
  focusedProjectPosition,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
  focusedProjectPositionId?: number | null;
  focusedProjectPosition?: string;
}) => {
  const [isForm, setIsForm] = useState(false);
  const [search, setSearch] = useState(focusedProjectPosition ?? '');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>();
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const { setPositionRules, setPositionRulesId } = useCrewStore();
  const { search: searchPositions } = useSearchPositions();

  const supabase = createClient();
  const { activeCompany } = useCompanyStore();

  const [crew, setCrew] = useState<
    (CompanyCrewMemberType & {
      position: Database['public']['Tables']['position']['Row'][];
    })[]
  >([]);

  const onSubmit = async (v: FormikValues) => {
    try {
      setSaving(true);
      //-- build "or" conditions separately to account for null values.
      const orConditions = [];

      if (v.phone) orConditions.push(`phone.eq.${v.phone}`);
      if (v.email) orConditions.push(`email.eq.${v.email}`);

      //-- only perform "or" if we have conditions.
      let query = supabase
        .from('company_crew_member')
        .select('*')
        .eq('company', activeCompany as string);

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }

      const { data: existingCrewMembers, error: crewLookupError } = await query;

      if (crewLookupError) {
        toast.error('Error looking up crew member');
        setSaving(false);
        return;
      }

      let crewMemberId = existingCrewMembers?.[0]?.id;

      //-- create new crew member if none exists
      if (!crewMemberId) {
        const [first_name, last_name] = makeName(v.name);

        const { data: newCrewMember, error: crewError } = await supabase
          .from('company_crew_member')
          .insert({
            company: activeCompany as string,
            email: v.email ? v.email : null,
            phone: v.phone ? v.phone : null,
            name: v.name,
            first_name,
            last_name,
          })
          .select('id')
          .single();

        if (crewError) {
          toast.error(crewError.message);
          setSaving(false);
          return;
        }

        crewMemberId = newCrewMember?.id;
      }

      //-- check for existing project member.
      const projectOrConditions = [];

      if (v.phone) projectOrConditions.push(`phone.eq.${v.phone}`);
      if (v.email) projectOrConditions.push(`email.eq.${v.email}`);

      let projectMemberQuery = supabase.from('project_member').select('*').eq('project', projectId);

      if (projectOrConditions.length > 0) {
        projectMemberQuery = projectMemberQuery.or(projectOrConditions.join(','));
      }

      const { data: existingProjectMembers } = await projectMemberQuery;

      let projectMemberId = existingProjectMembers?.[0]?.id;

      if (!projectMemberId) {
        //-- create new project member.
        const { data: projectMember, error: memberError } = await supabase
          .from('project_member')
          .insert({
            name: v.name,
            email: v.email,
            phone: v.phone,
            project: projectId,
            crew: crewMemberId,
          })
          .select('id')
          .single();

        if (memberError) {
          toast.error(memberError.message);
          setSaving(false);
          return;
        }

        projectMemberId = projectMember?.id;
      }

      let title = v.position;
      let department = Array.isArray(v.department) ? v.department[0] : v.department;

      if (focusedProjectPositionId) {
        //-- update existing position.
        const { error: positionError } = await supabase
          .from('project_position')
          .update({
            title,
            department,
            project_member: projectMemberId,
          })
          .eq('id', focusedProjectPositionId);

        if (positionError) {
          toast.error(positionError.message);
          setSaving(false);
          return;
        }
      } else {
        //-- create new position.
        const { error: positionError } = await supabase.from('project_position').insert({
          title,
          department,
          project_member: projectMemberId,
          project: projectId,
        });

        if (positionError) {
          toast.error(positionError.message);
          setSaving(false);
          return;
        }
      }

      if (title && department) {
        //-- format the tfs field as {department} position.
        const tfsValue = `{${department.toLowerCase()}} ${title.toLowerCase()}`;

        //-- update the tfs field in the company_crew_member record.
        await supabase.from('company_crew_member').update({ tfs: tfsValue }).eq('id', crewMemberId);

        //-- process the role to ensure proper department and position association.
        await processRole(
          { title: title.toLowerCase() } as CallSheetMemberType,
          { id: crewMemberId, company: activeCompany as string } as CompanyCrewMemberType,
          [department].flat(),
          supabase,
          (query: string) => modernRuleToPosition(searchPositions(query)),
        );
      }

      setSaving(false);
      onUpdate();
      onClose();
      toast.success(`${v.name} added to your crew`);
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
      setSaving(false);
    }
  };

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
  }, [page, supabase, activeCompany, search]);

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

  useEffect(() => {
    if (focusedProjectPosition) {
      setSearch(focusedProjectPosition);
    }
  }, [focusedProjectPositionId]);

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
  }, [crew, searchPositions]);

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
      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items center gap-2 items-center">
              {isForm && (
                <button className="w-10 h-10 flex items-center justify-center" onClick={() => setIsForm(false)}>
                  <Icon name="arrow-left" className="text-accent w-full h-full" />
                </button>
              )}
              Add Crew
            </div>
          </DialogTitle>
        </DialogHeader>

        {isForm ? (
          <>
            <AddCrewForm
              onCancel={onClose}
              loading={saving}
              onSubmit={onSubmit}
              position={selected?.position?.[0].position}
              department={selected?.position?.[0].department}
              name={selected?.name}
              email={selected?.email}
              phone={selected?.originalPhone}
              toProject
              toSheet
              hasPosition={!!focusedProjectPositionId}
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
                  variant={'accent'}
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
                  onClick={() => onClose()}
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
