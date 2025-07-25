import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import { parse, format, addHours, addMinutes } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { parsePhoneNumber } from 'react-phone-number-input';
import ReactTimeAgo from 'react-time-ago';
import { Icon } from '../Icon';
import { Person } from '../PersonCard';
import { TableRow, TableCell } from '../Table';
import { Skeleton } from '../Skeleton';
import { Checkbox } from '../Checkbox';
import { Tooltip } from '../Tooltip';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en.json';
import { useCallSheetStore } from '@/store/callsheet';
import { Editable } from '../Editable';
import { CallSheetMemberType } from '@/types/type';
import { formatPhoneNumber } from '@/lib/phone';
import { SortableItem } from '../Sortable';

TimeAgo.setDefaultLocale(en.locale);
TimeAgo.addLocale(en);

export const DepartmentRow: React.FC<{
  // contactInfoVisible: boolean;
  person: CallSheetMemberType;
  isHistorical: boolean;
  checked?: boolean;
  setChecked?: (check: boolean) => void;
  onClick?: () => void;
  generalCall?: string;
  isEntity?: boolean;
  customPrefix?: React.ReactNode;
}> = ({
  // contactInfoVisible,
  person,
  isHistorical,
  checked,
  setChecked,
  onClick,
  generalCall,
  isEntity = false,
  customPrefix,
}) => {
  const { callPush, updateMember } = useCallSheetStore();

  const initials = useMemo(() => {
    const words = person?.name?.split(' ') ?? ['-'];

    let initials = '';

    for (const word of words) {
      if (word.length > 0 && initials.length < 2) {
        initials += word[0]?.toUpperCase();
      }
    }

    return initials;
  }, [person.name]);

  const titleInitials = useMemo(() => {
    const target = person?.title ?? person?.department?.replaceAll('_', ' ');
    const words = target?.split(' ') ?? [];

    let initials = '';

    for (const word of words) {
      if (word.length > 0 && initials.length < 2) {
        initials += word[0]?.toUpperCase();
      }
    }

    return initials;
  }, [person.department, person.title]);

  const time = useMemo(() => {
    try {
      const parsedTime = parse(!!person.call_time ? person.call_time : (generalCall ?? ''), 'h:mm a', new Date());

      const formattedTime = format(parsedTime, 'h:mmaaaaa');

      return formattedTime;
    } catch {
      return person?.call_time;
    }
  }, [generalCall, person.call_time]);

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

  const sentTooltip = useMemo(() => {
    if (person.status === 'pending') {
      return 'Call card not sent yet';
    }

    if (person?.sent_at) {
      return (
        <>
          Sent <ReactTimeAgo date={new Date(person?.sent_at)} locale="en-US" />
        </>
      );
    }

    return 'Sent';
  }, [person?.sent_at, person.status]);

  const confirmedTooltip = useMemo(() => {
    if (person.status !== 'confirmed') {
      return 'Not confirmed yet';
    }

    if (person?.confirmed_at) {
      return (
        <>
          Confirmed <ReactTimeAgo date={new Date(person?.confirmed_at)} locale="en-US" />
        </>
      );
    }

    return 'Confirmed';
  }, [person?.confirmed_at, person.status]);

  const onChange = useCallback(
    (k: keyof CallSheetMemberType, v: any) => {
      let value = v;

      if (k === 'phone') {
        const { formattedPhone } = formatPhoneNumber(v);
        value = formattedPhone || v;
      }

      updateMember(person.id, k, value);
    },
    [person, updateMember],
  );

  return (
    <SortableItem asChild value={person.id}>
      <TableRow
        className={cn(
          'border-b border-zinc-600 border-opacity-20 cursor-pointer hover:bg-white hover:bg-opacity-5',
          person.status === 'confirmed' && 'bg-lime-300 bg-opacity-5 hover:bg-lime-300',
          isEntity && person.isKey && 'bg-lime-300 bg-opacity-5 hover:bg-lime-300',
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
      >
        <TableCell className="min-w-[275px] h-14 font-medium p-0 px-2 text-white text-opacity-95 text-base leading-none">
          <div className="flex gap-2 items-center">
            {!isHistorical && (
              <div className="w-6 h-6 flex items-center justify-center">
                <Checkbox checked={checked} onCheckedChange={setChecked} onClick={(e) => e.stopPropagation()} />
              </div>
            )}

            {customPrefix}

            <div className="flex gap-2 items-center max-sm:min-w-[200px]">
              {person.contact_info_visible === false ? (
                <Tooltip
                  className="bg-zinc-900 border-none rounded-lg p-0"
                  side="bottom"
                  content={
                    <div className="flex flex-col gap-2 items-start justify-center w-[250px] p-4 py-3 m-0 text-white/80">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-bold">Privacy</div>
                        <Icon name="eye-off" className="w-[14px] h-[14px]" />
                        <div className="flex items-center justify-center w-[35px] h-[20px] rounded-md bg-orange-900/30 text-orange-400">
                          ON
                        </div>
                      </div>

                      <div className="text-sm text-white/65">
                        This person&apos;s phone and email will not display on the call card&apos;s cast & crew list
                        view. This setting does not impact the contents of the call sheet .pdf that was uploaded.
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-none border border-white/30">
                    <Icon name="eye-off" className="w-[14px] h-[14px]" />
                    {/*<Icon name="cross" className="w-4 h-4 text-white fill-none" />*/}
                  </div>
                </Tooltip>
              ) : (
                <Avatar className="w-[22px] h-[22px] bg-white bg-opacity-10 rounded-full">
                  <AvatarFallback className="w-[22px] h-[22px] flex items-center justify-center">
                    <span className="text-white text-[11px] font-medium leading-none">{titleInitials}</span>
                  </AvatarFallback>
                </Avatar>
              )}

              <Editable type="text" onChange={(v) => onChange('title', v)} value={person.title} />
            </div>
          </div>
        </TableCell>

        {!isHistorical && (
          <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
            <div className="flex items-center gap-1">
              {person.status !== 'confirmed' && (
                <>
                  {person.status === 'call-card-sms-failed' ? (
                    <Tooltip content={'Failed to deliver SMS'}>
                      <div className="w-[22px] h-[22px] flex items-center justify-center rounded-full border border-red-400 border-opacity-60">
                        <Icon name="plus" className="w-[18px] h-[18px] text-red-400 fill-none rotate-45 relative" />
                      </div>
                    </Tooltip>
                  ) : (
                    <Tooltip content={sentTooltip}>
                      <div
                        className={cn(
                          'w-[22px] h-[22px] flex items-center justify-center rounded-full border border-zinc-600 border-opacity-60',
                          ['sent-call-card', 'confirmed'].includes(person.status as string) &&
                            'bg-lime-300 bg-opacity-30',
                        )}
                      >
                        <Icon
                          name="send"
                          className={cn(
                            'w-[18px] h-[18px] text-neutral-400 fill-none',
                            ['sent-call-card', 'confirmed'].includes(person.status as string) && 'text-lime-300',
                          )}
                        />
                      </div>
                    </Tooltip>
                  )}
                </>
              )}

              <Tooltip content={confirmedTooltip}>
                <div
                  className={cn(
                    'w-[22px] h-[22px] flex items-center justify-center rounded-full border border-zinc-600 border-opacity-60',
                    person.status === 'confirmed' && 'bg-lime-300 border-lime-300 w-[48px]',
                  )}
                >
                  <Icon
                    name="checkmark-alternative"
                    className={cn(
                      'w-[18px] h-[18px] text-neutral-400 fill-none',
                      ['confirmed'].includes(person.status as string) && 'text-zinc-950',
                    )}
                  />
                </div>
              </Tooltip>
            </div>
          </TableCell>
        )}

        <TableCell className="min-w-[175px] h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
          <div className="flex gap-2 items-center">
            <Avatar className="w-[22px] h-[22px] bg-white bg-opacity-10 rounded-full">
              <AvatarFallback className="w-[22px] h-[22px] flex items-center justify-center">
                <span className="text-white text-[11px] font-medium leading-none">{initials}</span>
              </AvatarFallback>
            </Avatar>

            <Editable type="text" onChange={(v) => onChange('name', v)} value={person.name} />
          </div>
        </TableCell>

        <TableCell className="w-auto h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
          <Editable type="email" onChange={(v) => onChange('email', v)} value={person.email} />
        </TableCell>

        <TableCell
          className={cn(
            'w-[125px] h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none',
            isEntity && person.isKey && 'text-lime-300',
          )}
        >
          <Editable
            className={isEntity && person.isKey ? 'text-lime-300 font-bold' : undefined}
            type="tel"
            compact
            onChange={(v) => onChange('phone', v)}
            value={person.phone}
          />
        </TableCell>

        <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
          <div className="flex flex-col gap-1">
            <Editable
              type="time"
              compact
              updatedTime={callTime as string}
              onChange={(v) => {
                onChange('call_time', v);
              }}
              value={time}
            />
          </div>
        </TableCell>

        <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
          <div className="flex flex-col gap-1">
            <Editable
              type="time"
              compact
              onChange={(v) => {
                onChange('wrap_time', v);
              }}
              value={person.wrap_time}
            />
          </div>
        </TableCell>
      </TableRow>
    </SortableItem>
  );
};

export const DepartmentRowLoading: React.FC = () => {
  return (
    <TableRow className={cn('border-b border-zinc-600 border-opacity-20')}>
      <TableCell className="h-14 font-medium p-0 px-2 text-white text-opacity-95 text-base leading-none">
        <div className="flex gap-2 items-center">
          <div className="w-6 h-6 flex items-center justify-center">
            <Skeleton className="w-4 h-4 rounded" />
          </div>
          <div className="flex gap-2 items-center capitalize">
            <Skeleton className="w-[22px] h-[22px] rounded-full" />
            <Skeleton className="w-[125px] h-4" />
          </div>
        </div>
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
        <div className="flex items-center gap-1">
          <Skeleton className="w-[18px] h-[18px] rounded-full" />
          <Skeleton className="w-[18px] h-[18px] rounded-full" />
        </div>
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
        <div className="flex gap-2 items-center">
          <Skeleton className="w-[22px] h-[22px] rounded-full" />
          <Skeleton className="w-[100px] h-4" />
        </div>
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
        <Skeleton className="w-[115px] h-4" />
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
        <Skeleton className="w-[120px] h-4" />
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
        <Skeleton className="w-14 h-4" />
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
        <Skeleton className="w-14 h-4" />
      </TableCell>

      <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
        <Skeleton className="w-14 h-4" />
      </TableCell>
    </TableRow>
  );
};
