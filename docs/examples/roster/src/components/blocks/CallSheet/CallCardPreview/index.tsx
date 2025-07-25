import * as Sentry from '@sentry/nextjs';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';

import { Icon } from '@/components/ui/Icon';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { createClient } from '@/lib/supabase/client';
import { cn, getGreeting } from '@/lib/utils';
import { CallSheetMemberType, CallSheetType, CompanyCrewMemberType } from '@/types/type';
import axios from 'axios';
import { addHours, addMinutes, format, parse } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';

import { toast } from 'sonner';
import { CustomSmsDialog } from '../CustomSmsDialog';
import useOutsideClick from '@/lib/hooks/useClickOutside';
import ReactTimeAgo from 'react-time-ago';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en.json';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Editable } from '@/components/ui/Editable';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { processRole } from '@/lib/processRole';
import { useSearchPositions } from '@/store/crew';
import { useCallSheetStore } from '@/store/callsheet';
import { CallCardContent } from '../../CallCard/CallCardContent';
import { Activity } from './Activity';
import { Database } from '@/types/supabase';
import { formatPhoneNumber } from '@/lib/phone';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';
import { modernRuleToPosition } from '@/lib/rules/modernRuleToPosition';
TimeAgo.setDefaultLocale(en.locale);
TimeAgo.addLocale(en);

export const CallCardPreview: React.FC<{
  // contactInfoVisible: boolean;
  members: CallSheetMemberType[];
  focusedMember?: string | null;
  setFocusedMember: (id: string | null) => void;
  onUpdate: () => void;
  sheet: CallSheetType;
  departments?: string[];
  forceLive?: boolean;
  entityNames?: string[];
}> = ({
  // contactInfoVisible,
  members,
  focusedMember,
  setFocusedMember,
  onUpdate,
  sheet,
  departments,
  forceLive,
  entityNames,
}) => {
  const [isHistorical, setIsHistorical] = useState<boolean>(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<CallSheetMemberType | null>(null);
  const [sent, setSent] = useState(
    !['pending', 'call-card-sms-failed'].includes(
      currentMember?.status as Database['public']['Enums']['CallSheetMemberStatus'],
    ),
  );
  const [showWrap, setShowWrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedAddress, setParsedAddress] = useState<any>();
  const { search: searchPositions } = useSearchPositions();
  const [isEntityContact, setIsEntityContact] = useState(false);

  useEffect(() => {
    setIsEntityContact(false);

    if (!entityNames || entityNames.length === 0) return;
    if (!currentMember || !currentMember?.department) return;

    if (entityNames.includes(currentMember.department)) {
      setIsEntityContact(true);
    }
  }, [currentMember]);

  const onSend = () => {
    if (!currentMember) return;

    setLoading(true);

    axios.get(`/sms/call-card/${currentMember.id}`).then(() => {
      setSent(true);
      setLoading(false);
      onUpdate();
    });
  };

  useEffect(() => {
    setCurrentMember(members.find((m) => m.id === focusedMember) as CallSheetMemberType);
  }, [focusedMember, members]);

  useEffect(() => {
    setSent(
      !['pending', 'call-card-sms-failed'].includes(
        currentMember?.status as Database['public']['Enums']['CallSheetMemberStatus'],
      ),
    );
  }, [currentMember?.status]);

  useEffect(() => {
    if (forceLive) {
      setIsHistorical(false);

      return;
    }

    setIsHistorical(sheet?.historical as boolean);
  }, []);

  const supabase = createClient();

  const ref = useOutsideClick(() => {
    setFocusedMember(null);
  });

  useEffect(() => {
    if (!focusedMember) setShowWrap(false);
  }, [focusedMember]);

  const changeMember = (prev: boolean = false) => {
    const currentIndex = members.findIndex((m) => m.id === focusedMember);

    if (prev) {
      if (currentIndex === 0) return;
      setFocusedMember(members[currentIndex - 1].id);
      return;
    }

    if (currentIndex === members.length - 1) return;

    setFocusedMember(members[currentIndex + 1].id);
  };

  const isFirstMember = useMemo(() => {
    return members.findIndex((m) => m.id === focusedMember) === 0;
  }, [members, focusedMember]);

  const isLastMember = useMemo(() => {
    return members.findIndex((m) => m.id === focusedMember) === members.length - 1;
  }, [members, focusedMember]);

  const { callPush } = useCallSheetStore();

  const initials = useMemo(() => {
    const words = currentMember?.name?.split(' ') ?? [];

    let initials = '';

    if (!words) return '-';

    for (const word of words) {
      if (word.length > 0 && initials.length < 2) {
        initials += word[0]?.toUpperCase();
      }
    }

    return initials;
  }, [currentMember?.name]);

  const onChange = (k: keyof CallSheetMemberType, v: any) => {
    if (!currentMember) return;

    let value = v;

    if (k === 'phone') {
      const { formattedPhone } = formatPhoneNumber(v);
      value = formattedPhone ?? v;
    }

    setCurrentMember(
      (prev) =>
        ({
          ...prev,
          [k]: value,
        }) as CallSheetMemberType,
    );

    if (['title', 'department'].includes(k)) {
      /* @ts-ignore */
      if (!currentMember.project_position?.id) return;

      supabase
        .from('project_position')
        .update({
          [k]: value,
        })
        /* @ts-ignore */
        .eq('id', currentMember.project_position?.id)
        .then(() => {
          onUpdate();
          toast.success(`${currentMember?.name} details updated`);

          // update call sheet's updated_at timestamp.
          if (sheet?.id) {
            updateCallSheetTimestamp(supabase, sheet.id);
          }
        });
    } else if (['email', 'phone', 'name'].includes(k)) {
      /* @ts-ignore */
      if (!currentMember?.project_position?.project_member?.id) {
        supabase
          .from('project_member')
          .insert({
            [k]: value,
            /* @ts-ignore */
            project: currentMember?.project_position?.project,
            crew: currentMember?.crew_member,
          })
          .select('*, name')
          .then(({ data }) => {
            supabase
              .from('project_position')
              .update({
                project_member: data?.[0]?.id,
              })
              /* @ts-ignore */
              .eq('id', currentMember?.project_position?.id)
              .then(() => {});

            onUpdate();
            toast.success(`${data?.[0]?.name} details updated`);

            // update call sheet's updated_at timestamp.
            if (sheet?.id) {
              updateCallSheetTimestamp(supabase, sheet.id);
            }
          });

        return;
      }

      supabase
        .from('project_member')
        .update({
          [k]: value,
        })
        /* @ts-ignore */
        .eq('id', currentMember?.project_position?.project_member?.id)
        .then(() => {
          onUpdate();
          toast.success(`${currentMember?.name} details updated`);

          // update call sheet's updated_at timestamp.
          if (sheet?.id) {
            updateCallSheetTimestamp(supabase, sheet.id);
          }
        });
    } else {
      supabase
        .from('call_sheet_member')
        .update({ [k]: value })
        .eq('id', currentMember.id)
        .then(() => {
          onUpdate();
          toast.success(`${currentMember?.name} details updated`);

          // update call sheet's updated_at timestamp.
          if (sheet?.id && !['contact_info_visible', 'isKey'].includes(k)) {
            updateCallSheetTimestamp(supabase, sheet.id);
          }
        });
    }

    try {
      if (k === 'title' && currentMember?.crew_member && currentMember?.company && currentMember?.department) {
        processRole(
          { title: v } as CallSheetMemberType,
          {
            id: currentMember?.crew_member,
            company: currentMember?.company,
          } as CompanyCrewMemberType,
          [currentMember?.department]?.flat(),
          supabase,
          (query: string) => modernRuleToPosition(searchPositions(query)),
        );
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const date = useMemo(() => {
    try {
      /* @ts-ignore */
      const d = parse(sheet?.raw_json?.full_date, 'MM/dd/yy', new Date());

      /* @ts-ignore */
      if (isNaN(d.getTime())) return sheet?.raw_json?.full_date;

      return format(d, 'EEE, MMM d');
    } catch {
      /* @ts-ignore */
      return sheet?.raw_json?.full_date;
    }
    /* @ts-ignore */
  }, [sheet?.raw_json?.full_date]);

  const time = useMemo(() => {
    /* @ts-ignore */
    if (!currentMember?.call_time && !sheet?.raw_json?.general_crew_call) return;

    try {
      const parsedTime = parse(
        /* @ts-ignore */
        !!currentMember?.call_time ? currentMember?.call_time : sheet?.raw_json?.general_crew_call,
        'h:mm a',
        new Date(),
      );

      const formattedTime = format(parsedTime, 'h:mm a');

      return formattedTime;
    } catch {
      return currentMember?.call_time;
    }
    /* @ts-ignore */
  }, [currentMember?.call_time, sheet?.raw_json?.general_crew_call]);

  const callTime = useMemo(() => {
    if (!time || !callPush) return time;

    try {
      const originalTime = parse(time, 'h:mmaaaaa', new Date());

      let newTime = addHours(originalTime, callPush.hours ?? 0);
      newTime = addMinutes(newTime, callPush.minutes ?? 0);

      return format(newTime, 'h:mmaaaaa');
    } catch (error) {
      return time;
    }
  }, [time, callPush]);

  return (
    <div ref={ref} className="">
      <div
        className={cn(
          'max-w-[560px] overflow-y-auto w-full z-50 p-8 bg-stone-950 rounded-3xl gap-3 flex flex-col top-3 right-3 bottom-3 fixed translate-x-[100%] opacity-0 duration-300 max-sm:max-w-screen max-sm:top-0 max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:p-2 max-sm:rounded-none max-sm:z-30',
          currentMember && 'translate-x-0 opacity-100',
        )}
      >
        <div className="p-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 max-sm:gap-2">
              <div
                onClick={() => {
                  setCurrentMember(null);
                  setFocusedMember(null);
                }}
                className="hidden w-[40px] max-sm:flex"
              >
                <Icon name="arrow-left" className="relative -left-2 h-10 w-10 text-white font-bold" />
              </div>

              <Avatar className="w-12 h-12 bg-lime-300 bg-opacity-10 rounded-full">
                <AvatarFallback className="w-12 h-12 bg-lime-300 flex items-center justify-center">
                  <span className="text-lime-300 text-lg font-medium leading-none">{initials}</span>
                </AvatarFallback>
              </Avatar>

              <div className="text-white text-[28px] leading-[25px] max-sm:text-[22px]">{currentMember?.name}</div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="w-11 h-12 p-3 opacity-60 rounded-xl border border-white border-opacity-20 justify-center items-center flex">
                <Icon name="dots" className="w-[18px] h-[18px] text-white" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="bottom"
                align="end"
                className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[160px]"
              >
                <div className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm flex w-full items-center [&>button]:w-full [&>button]:text-left">
                  <AlertDialog
                    withPortal
                    onConfirm={async () => {
                      if (!currentMember?.id) return;

                      try {
                        await supabase.from('call_sheet_member').delete().eq('id', currentMember?.id);

                        onUpdate();
                        toast.success(`${currentMember?.name} removed`);

                        updateCallSheetTimestamp(supabase, sheet.id);
                      } catch {
                        toast.error('Something went wrong');
                      }
                    }}
                    isDelete
                    title={`Are you sure you want to delete?`}
                    description="This cannot be undone. This will permanently remove this crew member."
                  >
                    Delete
                  </AlertDialog>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Details
            // contactInfoVisible={contactInfoVisible}
            departments={departments}
            member={
              {
                ...currentMember,
                call_time: time,
                call_time_push: callTime,
              } as CallSheetMemberType
            }
            onChange={onChange}
            isHistorical={isHistorical}
            isEntity={isEntityContact}
            entityName={currentMember?.department ?? undefined}
            entityType={currentMember?.department ?? undefined}
            showWrap={showWrap}
            setShowWrap={setShowWrap}
          />

          {!isHistorical && (
            <div className="flex gap-2 max-sm:flex-col">
              <Button
                disabled={members.length === 1 || isFirstMember}
                size={'medium'}
                onClick={() => changeMember(true)}
                variant="outline"
                className="px-0 w-[50px] justify-center hover:bg-white hover:bg-opacity-5 duration-150 disabled:pointer-events-none disabled:opacity-50 max-sm:hidden"
              >
                <Icon name="arrow-left" className="w-6 h-6 fill-none" />
              </Button>

              {currentMember?.status !== 'confirmed' && (
                <>
                  {sent ? (
                    <Button
                      variant={'outlineAccent'}
                      size={'medium'}
                      className="flex-1 gap-[2px] bg-opacity-10 bg-lime-300 max-sm:min-h-[50px] px-3 cursor-default"
                    >
                      <div className="flex items-center gap-[2px] flex-1">
                        <Icon name="checkmark" className="w-6 h-6 fill-none" />
                        Call card sent
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-7 h-7 rounded-lg bg-white bg-opacity-5 justify-center items-center flex">
                          <Icon name="chevron-small" className="w-6 h-6 relative fill-none rotate-90" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="bottom"
                          align="end"
                          className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[200px]"
                        >
                          <DropdownMenuItem
                            onClick={async () => {
                              if (!currentMember?.id) return;
                              await supabase
                                .from('call_sheet_member')
                                .update({ status: 'pending' })
                                .eq('id', currentMember?.id);

                              toast.success('Send status reset');
                              onUpdate();
                            }}
                            className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-sm flex gap-1 w-full items-center"
                          >
                            <Icon name="refresh" className="w-5 h-5 min-w-5 fill-none" />
                            Reset send status
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Button>
                  ) : (
                    <Button
                      variant={'accent'}
                      size={'medium'}
                      className="flex-1 gap-[2px] max-sm:min-h-[50px]"
                      onClick={onSend}
                    >
                      {loading ? (
                        <LoadingIndicator size="small" dark />
                      ) : (
                        <>
                          <Icon name="send" className="w-6 h-6 fill-none" />
                          {currentMember?.status === 'call-card-sms-failed' ? 'Send call card again' : 'Send call card'}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              <Button
                onClick={() => {
                  setMessageOpen(true);
                }}
                size={'medium'}
                variant="outline"
                className={cn(
                  'px-4 hover:bg-white hover:bg-opacity-5 duration-150 font-semibold text-base gap-[2px] max-sm:min-h-[50px]',
                  currentMember?.status === 'confirmed' && 'flex-1',
                )}
              >
                <Icon name="send" className="w-6 h-6 fill-none" />
                {currentMember?.status === 'confirmed' ? 'Send SMS message' : 'SMS'}
              </Button>

              <div className="flex max-sm:justify-between">
                <Button
                  disabled={members.length === 1 || isFirstMember}
                  size={'medium'}
                  onClick={() => changeMember(true)}
                  variant="outline"
                  className="hidden max-sm:w-[48%] px-4 hover:bg-white hover:bg-opacity-5 justify-center duration-150 font-semibold text-sm gap-[2px] disabled:pointer-events-none disabled:opacity-50 max-sm:flex"
                >
                  <Icon name="arrow-left" className="w-6 h-6 fill-none" />
                  <div className="">Previous</div>
                </Button>

                <Button
                  disabled={members.length === 1 || isLastMember}
                  onClick={() => changeMember(false)}
                  size={'medium'}
                  variant="outline"
                  className="max-sm:w-[48%] px-4 hover:bg-white hover:bg-opacity-5 justify-center duration-150 font-semibold text-sm gap-[2px] disabled:pointer-events-none disabled:opacity-50"
                >
                  Next
                  <Icon name="arrow-left" className="w-6 h-6 fill-none rotate-180" />
                </Button>
              </div>
            </div>
          )}

          {!isHistorical && (
            <>
              <Collapsible className="px-5 py-2 bg-white bg-opacity-[0.02] rounded-3xl border border-white border-opacity-10 backdrop-blur-2xl">
                <CollapsibleTrigger className="w-full [&>svg]:data-[state=open]:rotate-90 flex items-center justify-between text-white text-opacity-95 text-base font-semibold h-12">
                  Text message preview
                  <Icon name="chevron-small" className="w-8 h-8 relative fill-none" />
                </CollapsibleTrigger>

                <CollapsibleContent className="py-3">
                  <div className="w-3/4 justify-start items-end inline-flex">
                    <div className="px-3 py-[6px] bg-neutral-800 rounded-[18px] justify-start flex-col">
                      <span className="text-white text-base font-normal leading-snug">
                        Hey {currentMember?.name}, your call time for {/* @ts-ignore */}
                        {sheet?.raw_json?.job_name} is {callTime} {/* @ts-ignore */}
                        {sheet?.raw_json?.full_date}.
                        <br />
                        <br />
                        Click here to confirm: <br />
                        <span className="text-blue-500 text-base font-normal leading-snug">
                          {location.hostname}/call/{currentMember?.short_id}
                        </span>
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible className="px-5 py-2 bg-white bg-opacity-[0.02] rounded-3xl border border-white border-opacity-10">
                <CollapsibleTrigger className="w-full [&>svg]:data-[state=open]:rotate-90 flex items-center justify-between text-white text-opacity-95 text-base font-semibold h-12">
                  Call card preview
                  <Icon name="chevron-small" className="w-8 h-8 relative fill-none" />
                </CollapsibleTrigger>

                <CollapsibleContent className="py-4">
                  <div className="w-full flex-col flex gap-3">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      <h3 className="text-[28px] max-sm:text-[18px] truncate font-medium text-white flex items-center justify-between">
                        <span className="truncate">
                          {getGreeting()}, <strong>{currentMember?.name?.split(' ')[0]}</strong>!
                        </span>
                      </h3>
                    </div>

                    {!!currentMember && (
                      <CallCardContent
                        sheet={sheet}
                        member={currentMember as CallSheetMemberType}
                        date={date}
                        time={time}
                        callTime={callTime ?? undefined}
                        callPush={callPush ?? undefined}
                        isPreview={true}
                        /* @ts-ignore */
                        company={sheet.company}
                      />
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {!!currentMember && <Activity member={currentMember} />}
            </>
          )}
        </div>
      </div>

      {currentMember && (
        <CustomSmsDialog
          checked={[currentMember?.id]}
          members={members}
          open={messageOpen}
          close={() => setMessageOpen(false)}
          onSend={() => {
            setMessageOpen(false);
          }}
        />
      )}
    </div>
  );
};

const Details = ({
  // contactInfoVisible,
  member,
  departments,
  onChange,
  isHistorical,
  isEntity,
  entityName,
  entityType,
  showWrap,
  setShowWrap,
}: {
  // contactInfoVisible?: boolean;
  departments?: string[];
  member?: CallSheetMemberType & {
    call_time_push?: string;
  };
  onChange: (k: keyof CallSheetMemberType, v: any) => void;
  isHistorical: boolean;
  isEntity?: boolean;
  entityName?: string;
  entityType?: string;
  showWrap: boolean;
  setShowWrap: (v: boolean) => void;
}) => {
  const labels = {
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    // city: "City",
    // state: "State",
    title: 'Position',
    call_time: 'Call',
    ...(showWrap ? { wrap_time: 'Wrap' } : {}),
    department: isEntity ? 'Company' : 'Department',
  };

  const status = useMemo(() => {
    if (member?.status === 'pending')
      return (
        <div className="flex gap-2 items-center">
          <div
            className={cn(
              'w-[22px] h-[22px] flex items-center justify-center rounded-full border border-zinc-600 border-opacity-60',
            )}
          >
            <Icon name="send" className={cn('w-[18px] h-[18px] text-neutral-400 fill-none')} />
          </div>

          <div className="text-white text-opacity-40 text-base">Not yet sent</div>
        </div>
      );

    if (member?.status === 'sent-call-card')
      return (
        <div className="flex gap-2 items-center">
          <div
            className={cn(
              'w-[22px] h-[22px] flex items-center justify-center rounded-full border border-zinc-600 border-opacity-60',
              'bg-lime-300 bg-opacity-30',
            )}
          >
            <Icon name="send" className={cn('w-[18px] h-[18px] fill-none', 'text-lime-300')} />
          </div>

          <div
            className={cn(
              'w-[22px] h-[22px] flex items-center justify-center rounded-full border border-zinc-600 border-opacity-60',
            )}
          >
            <Icon name="checkmark-alternative" className={cn('w-[18px] h-[18px] text-neutral-400 fill-none')} />
          </div>

          <div className="text-white text-opacity-40 text-base">
            Sent {member?.sent_at && <ReactTimeAgo date={new Date(member?.sent_at)} locale="en-US" />} · Not confirmed
            yet
          </div>
        </div>
      );

    if (member?.status === 'confirmed')
      return (
        <div className="flex gap-2 items-center">
          <div
            className={cn(
              'h-[22px] flex items-center justify-center rounded-full border border-opacity-60',
              'bg-lime-300 border-lime-300 w-[48px]',
            )}
          >
            <Icon name="checkmark-alternative" className={cn('w-[18px] h-[18px] fill-none', 'text-zinc-950')} />
          </div>

          <div className="text-base text-lime-300">
            Confirmed {member?.confirmed_at && <ReactTimeAgo date={new Date(member?.confirmed_at)} locale="en-US" />}
          </div>
        </div>
      );

    if (member?.status === 'call-card-sms-failed')
      return (
        <div className="flex gap-2 items-center">
          <div
            className={cn(
              'h-[22px] flex items-center justify-center rounded-full border border-opacity-60',
              'bg-red-400 border-red-400 w-[48px]',
            )}
          >
            <Icon name="plus-circle" className={cn('w-[18px] h-[18px] fill-none rotate-45 text-zinc-900')} />
          </div>

          <div className="text-base text-red-400">Failed to deliver SMS</div>
        </div>
      );

    return 'Pending';
  }, [member?.sent_at, member?.status]);

  if (!member) return <></>;

  return (
    <div className="grid gap-3">
      {[...Object.entries(labels)].map(([key, label], i) => {
        let type = 'text';

        if (key === 'phone') type = 'tel';
        if (key === 'email') type = 'email';
        if (key === 'department') type = 'select';
        if (key === 'call_time' || key === 'wrap_time') type = 'time';

        //-- skip over wrap_time because we're rendering it side-by-side with call_time.
        if (key === 'wrap_time') return;

        if (key === 'call_time') {
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex gap items-center">
                <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">{label}</div>

                <Editable
                  className="w-[100px]"
                  compact
                  onChange={(v) => {
                    onChange(key as keyof CallSheetMemberType, v);
                  }}
                  /* @ts-ignore */
                  type={type}
                  value={member[key as keyof CallSheetMemberType]}
                  options={undefined}
                  {...(key === 'call_time'
                    ? {
                        updatedTime: member?.call_time_push,
                      }
                    : {})}
                />
              </div>

              {showWrap ? (
                <div className="flex gap items-center">
                  <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">Wrap</div>

                  <Editable
                    className="w-[100px]"
                    compact
                    onChange={(v) => {
                      onChange('wrap_time', v);
                    }}
                    /* @ts-ignore */
                    type={type}
                    value={member['wrap_time']}
                    options={undefined}
                  />
                </div>
              ) : (
                <div
                  key="wrap_time"
                  onClick={() => {
                    setShowWrap(true);
                  }}
                  className={cn(
                    'flex items-center justify-center w-[200px] h-[32px] px-1 text-sm text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95',
                  )}
                >
                  + Wrap Time
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={key} className="flex gap items-center">
            <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">{label}</div>

            <Editable
              onChange={(v) => {
                onChange(key as keyof CallSheetMemberType, v);
              }}
              /* @ts-ignore */
              type={type}
              value={member[key as keyof CallSheetMemberType]}
              options={key === 'department' ? departments : undefined}
              {...(key === 'call_time'
                ? {
                    updatedTime: member?.call_time_push,
                  }
                : {})}
            />
          </div>
        );
      })}

      {!isHistorical && (
        <>
          <div className="flex gap items-center pt-[5px]">
            <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">Status</div>
            {status}
          </div>

          <div className="flex gap items-center py-[14px]">
            <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">Privacy</div>
            <div
              onClick={() => {
                onChange('contact_info_visible', member.contact_info_visible ? false : true);
              }}
              className={cn(
                'relative flex items-center w-[37px] h-[20px] bg-zinc-600 rounded-full cursor-pointer',
                member.contact_info_visible === false && 'bg-lime-300',
              )}
            >
              <div
                className={cn(
                  'relative left-[2px] w-[17px] h-[17px] rounded-full bg-zinc-900 transition-all duration-150',
                  member.contact_info_visible === false && 'left-[18px]',
                )}
              />
            </div>
            <div className="text-white/40 pl-[8px]">Hide phone & email</div>
          </div>

          {isEntity && (
            <div className="flex gap items-center pt-[0px] pb-[14px]">
              <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">Main</div>
              <div
                onClick={() => {
                  onChange('isKey', member.isKey ? false : true);
                }}
                className={cn(
                  'relative flex items-center w-[37px] h-[20px] bg-zinc-600 rounded-full cursor-pointer',
                  member.isKey === true && 'bg-lime-300',
                )}
              >
                <div
                  className={cn(
                    'relative left-[2px] w-[17px] h-[17px] rounded-full bg-zinc-900 transition-all duration-150',
                    member.isKey === true && 'left-[18px]',
                  )}
                />
              </div>
              <div className="text-white/40 pl-[8px]">Main contact at {entityType}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
