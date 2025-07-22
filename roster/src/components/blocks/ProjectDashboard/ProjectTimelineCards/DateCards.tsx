'use client';

import React, { FC, useEffect, useState } from 'react';
import { CallSheetLocationType, CallSheetType } from '@/types/type';
import { formatDate } from 'date-fns/format';
import { cn } from '@/lib/utils';
import { isAfter, isBefore } from 'date-fns';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { PulsingCircle } from '@/components/ui/PulsingCircle/PulsingCircle';
import { ShootDateCard } from '@/components/blocks/ProjectDashboard/ProjectTimelineCards/ShootDateCard';

type Props = {
  projectId: string;
  prepDates: string[];
  postDates: string[];
  dates: string[];
  scrollContainer: HTMLDivElement | null;
  setDateCardsMounted: (bool: boolean) => void;
};

export const DateCards: FC<Props> = (props) => {
  const [shootDaySheets, setShootDaySheets] = useState<
    (CallSheetType & {
      call_sheet_location: Pick<CallSheetLocationType, 'name'>[];
    })[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const formattedNow = formatDate(new Date(), 'MM/dd/yy');
  // const formattedNow = "03/08/25";

  const supabase = createClient();

  useEffect(() => {
    const fetchSheetRecords = async () => {
      setIsLoading(true);

      const { data: sheetRecords, error: sheetRecordsError } = await supabase
        .from('call_sheet')
        .select(`*, call_sheet_location(name)`)
        .eq('project', props.projectId)
        .in('date', props.dates);

      if (!sheetRecords || sheetRecordsError) {
        console.error('Error: ', sheetRecordsError);
        toast.error('Something went wrong fetching sheet records. Please try again.');

        setIsLoading(false);

        return;
      }

      const sortedSheets = sortSheetsByDate(sheetRecords);

      setIsLoading(false);
      setShootDaySheets(sortedSheets);
    };

    fetchSheetRecords();
  }, [props.dates, refreshKey]);

  useEffect(() => {
    if (!shootDaySheets || shootDaySheets.length === 0) return;

    props.setDateCardsMounted(true);
  }, [shootDaySheets]);

  const sortSheetsByDate = (
    sheets: (CallSheetType & {
      call_sheet_location: Pick<CallSheetLocationType, 'name'>[];
    })[],
  ) => {
    return sheets.sort((a, b) => {
      const dateA = new Date(a.date as string).getTime();
      const dateB = new Date(b.date as string).getTime();

      return dateA - dateB;
    });
  };

  const deleteDay = async (sheet: CallSheetType) => {
    const { error } = await supabase.from('call_sheet').delete().eq('id', sheet?.id).select();

    if (error) {
      toast.error('Something went wrong.');

      return;
    }

    toast.success('Day deleted.');
  };

  if (props.prepDates.length === 0 || props.postDates.length === 0) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col justify-center gap-2">
          <Skeleton className="w-[100px] h-[20px] pb-2" />

          <div className="flex items-center gap-2 ">
            <Skeleton className="w-[250px] h-[65px]" />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2">
          <Skeleton className="w-[100px] h-[20px] pb-2" />

          <div className="flex items-center gap-2 ">
            <Skeleton className="w-[250px] h-[65px]" />
            <Skeleton className="w-[250px] h-[65px]" />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2">
          <Skeleton className="w-[100px] h-[20px] pb-2" />

          <div className="flex items-center gap-2 ">
            <Skeleton className="w-[250px] h-[65px]" />
            <Skeleton className="w-[250px] h-[65px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex gap-2">
      {/* pre-production dates */}
      <div className="flex items-center gap-2">
        <div className="relative group flex flex-col min-w-[250px] w-auto">
          <div className="flex items-center justify-between w-full pb-2">
            <div className="sticky left-0 flex items-center justify-between w-[250px]">
              <div className="flex items-center gap-2">
                <div className="text-[14px] text-white/50 font-bold">Pre-Production</div>

                <Icon
                  name="plusAlt"
                  className="w-4 h-4 text-white text-opacity-60 hover:text-opacity-90 cursor-pointer"
                />
              </div>

              {props.prepDates && props.prepDates.length > 0 && (
                <div className="flex items-center justify-center h-auto px-2 py-[1px] text-[11px] text-lime-300 font-bold uppercase bg-zinc-900 border border-lime-300/40 rounded-xl">{`${props.prepDates.length} days`}</div>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex gap-2 w-[250px] h-[65px] p-3 bg-stone-900/80 border border-white border-opacity-10 rounded-xl cursor-not-allowed',
              props.prepDates.includes(formattedNow) && 'ring-1 ring-[#eccc3cbb]',
            )}
          >
            {props.prepDates.includes(formattedNow) ? (
              <PulsingCircle variant="yellow" />
            ) : (
              <div className={cn('relative top-[5px] w-[8px] h-[8px] bg-[rgb(100,89,38)] rounded-full')} />
            )}

            <div className="flex flex-col items-start justify-center">
              <div className="text-sm text-white/90 font-bold pb-1">Pre-Production Start</div>

              <div className="text-[12px] text-white/60 font-bold">{formatDate(props.prepDates[0], 'eee, MMM dd')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* production dates */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col min-w-[250px] w-auto">
          <div className="flex items-center justify-between w-full pb-2">
            <div className="sticky left-0 flex items-center justify-between w-[250px]">
              <div className="flex items-center gap-2">
                <div className="text-[14px] text-white/50 font-bold">Production</div>

                <Icon
                  name="plusAlt"
                  className="w-4 h-4 text-white text-opacity-60 hover:text-opacity-90 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-center h-auto px-2 py-[1px] text-[11px] text-lime-300 font-bold uppercase bg-zinc-900 border border-lime-300/40 rounded-xl">{`${shootDaySheets.length} days`}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shootDaySheets.map((sheet, i) => {
              return (
                <ShootDateCard
                  key={sheet.id}
                  sheet={sheet}
                  index={i}
                  formattedNow={formattedNow}
                  formatDate={formatDate}
                  deleteDay={deleteDay}
                  setRefreshKey={setRefreshKey}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* post-production dates */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col min-w-[250px]">
          <div className="flex items-center justify-between w-full pb-2">
            <div className="sticky left-0 flex items-center justify-between w-[250px]">
              <div className="flex items-center gap-2">
                <div className="text-[14px] text-white/50 font-bold">Post-Production</div>

                <Icon
                  name="plusAlt"
                  className="w-4 h-4 text-white text-opacity-60 hover:text-opacity-90 cursor-pointer"
                />
              </div>

              {props.postDates && props.postDates.length > 0 && (
                <div className="flex items-center justify-center h-auto px-2 py-[1px] text-[11px] text-lime-300 font-bold uppercase bg-zinc-900 border border-lime-300/40 rounded-xl">{`${props.postDates.length} days`}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              data-date={props.postDates[0]}
              className={cn(
                'flex gap-2 w-[250px] h-[65px] p-3 bg-stone-900/80 border border-white border-opacity-10 rounded-xl cursor-not-allowed',
                isAfter(formattedNow, props.postDates[0]) &&
                  isBefore(formattedNow, props.postDates[props.postDates.length - 1]) &&
                  'ring-1 ring-white/85',
              )}
            >
              {props.postDates.includes(formattedNow) &&
              props.postDates[props.postDates.length - 1] !== formattedNow ? (
                <PulsingCircle variant="white" />
              ) : (
                <div className={cn('relative top-[5px] w-[8px] h-[8px] bg-white/30 rounded-full')} />
              )}

              <div className="flex flex-col items-start justify-center">
                <div className="text-sm text-white/90 font-bold pb-1">Post-Production Start</div>

                <div className="text-[13px] text-white/60 font-bold">
                  {props.postDates?.length > 0 ? formatDate(props.postDates[0], 'eee, MMM dd') : '-'}
                </div>
              </div>
            </div>

            <div
              data-date={
                props.postDates.includes(formattedNow) &&
                props.postDates[props.postDates.length - 1] !== formattedNow &&
                formattedNow
              }
              className={cn(
                'flex gap-2 w-[250px] h-[65px] p-3 bg-stone-900/80 rounded-xl cursor-not-allowed',
                props.postDates[props.postDates.length - 1] === formattedNow && 'ring-1 ring-white/85',
              )}
            >
              {props.postDates[props.postDates.length - 1] === formattedNow ? (
                <PulsingCircle variant="white" />
              ) : (
                <div className={cn('relative top-[5px] w-[8px] h-[8px] bg-white/30 rounded-full')} />
              )}

              <div className="flex flex-col items-start justify-center">
                <div className="text-sm text-white/90 font-bold pb-1">Final Delivery</div>

                <div className="text-[13px] text-white/60 font-bold">
                  {formatDate(props.postDates[props.postDates.length - 1], 'eee, MMM dd')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
