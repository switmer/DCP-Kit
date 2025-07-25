'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parse } from 'date-fns';
import { CallSheetLoading } from '../CallSheetLoading';

import { toast } from 'sonner';
import { DepartmentRow, DepartmentTable } from '@/components/ui/Department';

import { Icon } from '@/components/ui/Icon';

import axios from 'axios';
import { ProductionContacts } from '../ProductionContacts';
import { Tab } from '@/components/ui/Tab';
import { PersonCard } from '@/components/ui/PersonCard';
import { Notes } from '../Notes';
import { MinimizePdf } from '@/components/ui/Pdf/Minimize';
import Link from 'next/link';
import { CallSheetType, Note, ProjectType } from '@/types/type';
import { debounce } from 'lodash';
import { CallSheetTitle } from '../Title';
import { CallSheetPreview } from '@/components/blocks/CallSheet/CallSheetPreview';
import { normalizeCallSheetMember } from '@/lib/utils';

const renderAlert = () => {
  return (
    <div className="flex w-full h-[45px] items-center mt-5 bg-[#F8D3131C] bg-opacity-10 text-base placeholder:text-stone-300 text-white p-4 rounded-2xl max-sm:h-[100px]">
      <Icon name="alert" className="w-6 h-6 max-sm:w-[80px] max-sm:h-[80px]" />
      <div className="text-[#FFEC8A] pl-3 max-sm:pl-4">
        This call sheet is being viewed as a historical record. Some features may be disabled or unavailable.
      </div>
    </div>
  );
};

const formatSheetDate = (date: string) => {
  try {
    const inputDate = parse(date, 'MM/dd/yy', new Date());

    if (isNaN(inputDate.getTime())) return date;

    return format(inputDate, 'EEE, MMM d');
  } catch {
    return date;
  }
};

let timeout: string | number | NodeJS.Timeout | undefined;

export const HistoricalCallSheet: React.FC<{
  src?: string | null;
  sheet:
    | (CallSheetType & {
        project: Omit<ProjectType, 'company' | 'slug' | 'created_at'>;
      })
    | any;
}> = ({ src, ...rest }) => {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sheet, setSheet] = useState<any>(rest?.sheet);
  const [startedPolling, setStartedPolling] = useState(false);
  const [loading, setLoading] = useState(sheet?.status !== 'ready');
  const [loadingReparse, setLoadingReparse] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [focusedMember, setFocusedMember] = useState<string | null>(null);
  const [crew, setCrew] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [sheetNotes, setSheetNotes] = useState<Note[]>([]);

  const supabase = createClient();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setFocusedMemberDebounced = useCallback(
    debounce((value: string | null) => {
      setFocusedMember(value);
    }, 150),
    [setFocusedMember],
  );

  const fetchSheetNotes = useCallback(() => {
    setLoading(true);

    supabase
      .from('note')
      .select()
      .eq('call_sheet', sheet?.id)
      .order('priority', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        setSheetNotes(data);
      });

    setLoading(false);
  }, [sheet?.id]);

  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const fetchCrew = useCallback(() => {
    setLoading(true);

    supabase
      .from('company_crew_member')
      .select('*', { count: 'exact' })
      .eq('company', sheet.company.id)
      .then(({ data }) => {
        if (!data) return;

        setCrew(data);
        setLoading(false);
      });

    setLoading(false);
  }, [sheet.company.id]);

  const fetchMembers = useCallback(() => {
    supabase
      .from('call_sheet_member')
      .select(
        `
        *,

        project_position(*, project_member(*))
      `,
      )
      .eq('call_sheet', sheet?.id)
      .order('order')
      .then(({ data }) => {
        if (!data) return;

        setMembers(data.map((m) => normalizeCallSheetMember(m as any)));

        setMembersLoading(false);
      });
  }, [sheet?.id, supabase]);

  const sendDepartmentCards = async (ids: string[]) => {
    await axios
      .post('/sms/call-card/bulk', {
        ids,
      })
      .then(() => {
        const sentTo = ids.filter((id) => members.find((m) => m.id === id)?.status === 'pending').length;

        toast.success(`Sent ${sentTo} call card${sentTo !== 1 ? 's' : ''}.`, {
          icon: <Icon name="checkmark" className="w-6 h-6 text-lime-300" />,
        });

        fetchMembers();
      })
      .catch(() => {
        toast.error('Something went wrong.');
      });
  };

  useEffect(() => {
    if (sheet?.status !== 'ready') return;

    fetchMembers();
    fetchCrew();
  }, [fetchMembers, fetchCrew, sheet, supabase]);

  useEffect(() => {
    if (!refreshKey) return;
    fetchMembers();
    fetchCrew();
  }, [fetchMembers, fetchCrew, refreshKey]);

  const filteredMembers = useMemo(() => {
    return members;
  }, [members]);

  const departments = useMemo(() => {
    if (!sheet || !sheet.raw_json) return [];

    const rawDepartments = sheet.raw_json.departments;
    if (Array.isArray(rawDepartments)) {
      if (rawDepartments.length > 0 && typeof rawDepartments[0] === 'string') {
        return rawDepartments;
      } else if (rawDepartments.length > 0 && typeof rawDepartments[0] === 'object') {
        return rawDepartments.map((dept) => dept.name);
      }
    }
    return [];
  }, [sheet]);

  const additionalDepartments = useMemo(() => {
    if (!sheet) return [];

    const uniqueDepartments = new Set<string>();

    members.forEach((member) => {
      if (!departments.includes(member.department)) {
        uniqueDepartments.add(member.department);
      }
    });

    return Array.from(uniqueDepartments);
  }, [departments, members, sheet]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (loading) {
    return <CallSheetLoading src={src} sheetSrc={sheet.src} status={sheet?.status} />;
  }

  return (
    <>
      <div className="flex flex-1 justify-center relative">
        <div className="flex w-full flex-col gap-3 items-start max-sm:w-screen max-sm:overflow-x-hidden max-sm:px-4 max-sm:bg-dashboard-empty-gradient">
          {renderAlert()}
          <div className="flex flex-col gap-6 sticky top-0 z-10 bg-background w-full bg-opacity-50 backdrop-blur-md pt-4 sm:pt-12 max-sm:max-w-screen max-sm:overflow-y-auto max-sm:gap-4">
            <div className="hidden w-full max-sm:flex">
              <Link href={'/'}>
                <Icon name="arrow-left" className="relative -left-2 h-10 w-10 text-white font-bold" />
              </Link>
            </div>

            <div className="flex gap-2 items-center max-sm:hidden">
              <Link
                href={'/'}
                className="flex text-zinc-600 hover:text-white duration-100 cursor-pointer text-sm leading-none gap-2 items-center"
              >
                <Icon name="home" className="w-5 h-5" />

                {sheet?.company?.name}
              </Link>

              <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

              <div className="flex text-zinc-600 duration-100 text-sm leading-none gap-2 items-center">
                {sheet?.project?.name}
              </div>

              <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

              <div className="text-white text-sm">
                {!loading && sheet?.raw_json?.full_date && formatSheetDate(sheet?.raw_json?.full_date)}
              </div>
            </div>

            <CallSheetTitle job_name={sheet?.raw_json?.job_name} sheet={sheet} />

            <div className="flex items-center gap-2 mb-4">
              <p className="text-pink-50 text-[22px] font-medium">
                {!loading && sheet?.raw_json?.full_date && formatSheetDate(sheet?.raw_json?.full_date)}
              </p>
            </div>
          </div>

          <ProductionContacts
            members={members}
            sheetId={sheet?.id}
            contacts={sheet?.raw_json?.key_contacts}
            call={sheet?.raw_json?.general_crew_call}
          />

          <Notes
            companyPolicies={[]}
            sheetNotes={sheetNotes}
            callSheet={sheet?.id}
            project={sheet?.project?.id}
            // locations={sheet?.raw_json?.locations}
            historical
          />

          <div className="flex gap-2 items-center w-full sticky top-[224px] z-20 flex-wrap bg-background bg-opacity-50 backdrop-blur-md">
            <div className="text-white text-[28px] font-normal">Crew</div>
            <Tab
              options={['list', 'grid']}
              selected={view}
              setSelected={setView as (arg0: string) => void}
              defaultWidth={51}
            />
          </div>

          {view === 'grid' && (
            <div className="w-full grid sm:grid-cols-2 xl:grid-cols-3 gap-8 self-start">
              {members.map((p) => (
                <PersonCard
                  // contactInfoVisible={
                  //   rest.sheet.project.contact_info_visible ?? false
                  // }
                  isHistorical={sheet.historical}
                  person={p}
                  key={p.id}
                  onClick={() => setFocusedMemberDebounced(p.id)}
                  generalCall={sheet?.raw_json?.general_crew_call}
                />
              ))}
            </div>
          )}

          {view === 'list' && (
            <div className="w-full flex flex-col self-start">
              <div className="flex flex-col flex-1 gap-6 max-sm:mb-[125px]">
                {[...departments, ...additionalDepartments]?.map((d: string) => {
                  const currentMembers = filteredMembers
                    .filter((m) => m.department === d)
                    .sort((a, b) => a.order - b.order);
                  const currentMembersIds = currentMembers.map((c) => c.id);
                  const department = sheet?.raw_json?.people?.[d];

                  if (currentMembers.length === 0) return null;

                  const isChecked = () => {
                    if (!currentMembersIds.length) return false;
                    if (currentMembersIds.every((c) => checked.includes(c))) {
                      return true;
                    }
                    if (currentMembersIds.some((c) => checked.includes(c))) {
                      return 'indeterminate';
                    }

                    return false;
                  };

                  return (
                    <DepartmentTable
                      isHistorical={sheet.historical}
                      title={d?.replaceAll('_', ' ')}
                      callTime={
                        department?.default_call_time ??
                        sheet?.raw_json?.departments?.find((dept: any) => dept.name === d)?.default_call_time
                      }
                      count={currentMembersIds?.length}
                      key={d}
                      loading={loading || membersLoading}
                      checked={isChecked()}
                      setChecked={(check) => {
                        if (check) {
                          setChecked([...checked, ...currentMembersIds]);
                          return;
                        }
                        setChecked(checked.filter((c) => !currentMembersIds.includes(c)));
                      }}
                      checkedCount={
                        checked
                          .filter((c) => currentMembersIds.includes(c))
                          .filter((c) => members.find((m) => m.id === c)?.status === 'pending').length
                      }
                      pendingCount={currentMembers.filter((c) => c.status === 'pending').length}
                      sentCount={currentMembers.filter((c) => !!c.sent_at).length}
                      confirmedCount={currentMembers.filter((c) => !!c.confirmed_at).length}
                      onSend={async (onlyChecked = false) => {
                        await sendDepartmentCards(
                          !onlyChecked ? currentMembersIds : checked.filter((c) => currentMembersIds.includes(c)),
                        );
                      }}
                    >
                      {currentMembers.map((m) => {
                        return (
                          <DepartmentRow
                            // contactInfoVisible={
                            //   rest.sheet.project.contact_info_visible ?? false
                            // }
                            isHistorical={sheet.historical}
                            key={m.id}
                            person={m}
                            checked={checked.includes(m.id)}
                            setChecked={(check) => {
                              if (check) {
                                setChecked([...checked, m.id]);
                                return;
                              }
                              setChecked(checked.filter((c) => c !== m.id));
                            }}
                            onClick={() => {
                              setFocusedMemberDebounced(m.id);
                            }}
                            isEntity={false}
                          />
                        );
                      })}
                    </DepartmentTable>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {src && (
          <MinimizePdf className="max-h-[calc(100vh-24px)] max-sm:hidden" sheetSrc={sheet.src} isLoading={loading} />
        )}
      </div>

      <CallSheetPreview
        {...{
          // contactInfoVisible: rest.sheet.project.contact_info_visible ?? false,
          focusedMember,
          setFocusedMember: setFocusedMemberDebounced,
          members,
          crew,
          sheet,
          departments,
          onUpdate: () => setRefreshKey((k) => k + 1),
        }}
      />
    </>
  );
};
