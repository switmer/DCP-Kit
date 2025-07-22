'use client';

import { FC } from 'react';
import { ProjectType } from '@/types/type';
import { cn } from '@/lib/utils';
import { formatDate } from 'date-fns/format';
import { isAfter, isBefore } from 'date-fns';

type Props = {
  data: ProjectType;
};

export const ProjectTimelineGraph: FC<Props> = (props) => {
  // const [showTimelineDetails, setShowTimelineDetails] = useState(false);

  if (!props.data) return null;

  if (!props.data.dates || !props.data.dates[0]) {
    return (
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex flex-col">
          <div className="text-base text-white font-bold">Project Timeline</div>
          {/*<div className="text-sm text-white/40">*/}
          {/*  Project ID: {props.data.id ?? "n/a"}*/}
          {/*</div>*/}
        </div>

        <div className="text-[15px] text-white/80">No shoot dates</div>
      </div>
    );
  }

  const prepDates = props.data.prep_dates ?? [];
  const shootDates = props.data.dates;
  const postDates = props.data.post_dates ?? [];

  if (prepDates.length === 0 || postDates.length === 0) return null;

  const now = new Date();
  const formattedNow = formatDate(now, 'MM/dd/yy');
  // const formattedNow = "03/01/25";

  // const daysBetween = differenceInDays(
  //   postDates[postDates.length - 1],
  //   formattedNow
  // );

  if (prepDates.length === 0 || postDates.length === 0) return null;

  const totalNumDays = prepDates.length + shootDates.length + postDates.length;

  const prepDatesTimelineWidthStr = ((prepDates.length / totalNumDays) * 100).toString() ?? '0';
  const shootDatesTimelineWidthStr = ((shootDates.length / totalNumDays) * 100).toString();
  const postDatesTimelineWidthStr = ((postDates.length / totalNumDays) * 100).toString() ?? '0';

  const segmentedPrepDayWidth = (100 / prepDates.length).toString() ?? '';
  const segmentedShootDayWidth = (100 / shootDates.length).toString();
  const segmentedPostDayWidth = (100 / postDates.length).toString() ?? '';

  return (
    <div
      className={cn(
        'flex flex-col w-full h-[40px] gap-2',
        // showTimelineDetails && "h-[270px]"
      )}
    >
      {/* timeline/graph visuals*/}
      <div className="relative flex items-center justify-between mb-4">
        <div className="absolute top-3 flex items-center justify-between w-full h-[10px]">
          {prepDates && prepDates.length > 0 && (
            <div
              className={cn(
                'relative h-full rounded-tl-full rounded-bl-full',
                // isBefore(formattedNow, prepDates[0])
                //   ? "bg-white/20"
                //   : isAfter(formattedNow, prepDates[prepDates.length - 1])
                //   ? "bg-green-700"
                //   : "bg-lime-300"
              )}
              style={{ width: `${prepDatesTimelineWidthStr}%` }}
            >
              <div className="z-10 absolute flex items-center justify-between w-full h-full">
                {prepDates.map((date, i) => {
                  return (
                    <div
                      key={date + i}
                      className={cn(
                        'flex justify-center h-full border border-l-0 border-t-0 border-b-0 border-r-black/30',
                        i === prepDates.length - 1 && 'border-r-0',
                        i === 0 && 'rounded-bl-full rounded-tl-full',
                        prepDates.includes(formattedNow)
                          ? isBefore(date, formattedNow)
                            ? 'bg-[rgb(100,89,38)]'
                            : isAfter(date, formattedNow)
                              ? 'bg-[rgb(100,89,38)]'
                              : 'bg-[rgb(236,204,60)]'
                          : 'bg-[rgb(100,89,38)]',
                      )}
                      style={{ width: `${segmentedPrepDayWidth}%` }}
                    >
                      {date === formattedNow && (
                        <div className="z-10 absolute top-[8px] flex flex-col items-center justify-center">
                          <div className="text-xs text-white">|</div>
                          <div className="relative top-[-4px] text-[9px] text-white">NOW</div>
                        </div>
                      )}

                      {/*{i === shootDates.length - 1 && (*/}
                      {/*  <div className="z-10 absolute bottom-3 right-[-4px] flex flex-col items-center">*/}
                      {/*    <div className="relative top-[5px] text-xs text-white">*/}
                      {/*      _*/}
                      {/*    </div>*/}
                      {/*    <div className="relative top-[-1px] text-[9px] text-white">*/}
                      {/*      |*/}
                      {/*    </div>*/}
                      {/*  </div>*/}
                      {/*)}*/}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className={cn(
              'relative h-full border border-l-white/30 border-r-white/30 border-t-0 border-b-0',
              // isBefore(formattedNow, shootDates[0])
              //   ? "bg-white/20"
              //   : isAfter(formattedNow, shootDates[shootDates.length - 1])
              //   ? "bg-green-700"
              //   : "bg-lime-300",
              !prepDates || (prepDates.length === 0 && 'rounded-bl-full rounded-tl-full'),
              !postDates || (postDates.length === 0 && 'rounded-br-full rounded-tr-full'),
            )}
            style={{ width: `${shootDatesTimelineWidthStr}%` }}
          >
            <div className="z-10 absolute flex items-center justify-between w-full h-full">
              {shootDates.map((date, i) => {
                return (
                  <div
                    key={date + i}
                    className={cn(
                      'flex items-center justify-center h-full border border-l-0 border-t-0 border-b-0 border-r-black/30',
                      i === shootDates.length - 1 && 'border-r-0',
                      shootDates.includes(formattedNow)
                        ? isBefore(date, formattedNow)
                          ? 'bg-lime-300/50'
                          : isAfter(date, formattedNow)
                            ? 'bg-lime-300/50'
                            : 'bg-lime-300'
                        : 'bg-lime-300/50',
                      //   isAfter(
                      //     formattedNow,
                      //     shootDates[shootDates.length - 1]
                      //   )
                      // ?
                      // : "bg-white/20",
                      !prepDates || (prepDates.length === 0 && i === 0 && 'rounded-tl-full rounded-bl-full'),
                      !postDates ||
                        (postDates.length === 0 && i === shootDates.length - 1 && 'rounded-tr-full rounded-br-full'),
                    )}
                    style={{ width: `${segmentedShootDayWidth}%` }}
                  >
                    {date === formattedNow && (
                      <div className="z-10 absolute top-[8px] flex flex-col items-center justify-center">
                        <div className="text-xs text-white">|</div>
                        <div className="relative top-[-4px] text-[9px] text-white">NOW</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {postDates && postDates.length > 0 && (
            <div
              className={cn(
                'relative h-full rounded-tr-full rounded-br-full',
                // isBefore(formattedNow, postDates[0])
                //   ? "bg-white/20"
                //   : isAfter(formattedNow, postDates[postDates.length - 1])
                //   ? "bg-green-700"
                //   : "bg-lime-300"
              )}
              style={{ width: `${postDatesTimelineWidthStr}%` }}
            >
              <div
                className="z-10 flex items-center justify-between h-full"
                // style={{ width: `${postDatesTimelineWidthStr}%` }}
              >
                {postDates.map((date, i) => {
                  return (
                    <div
                      key={date + i}
                      className={cn(
                        'flex justify-center h-full border border-l-0 border-t-0 border-b-0 border-r-black/30',
                        i === postDates.length - 1 && 'border-r-0 rounded-tr-full rounded-br-full',
                        postDates.includes(formattedNow)
                          ? isBefore(date, formattedNow)
                            ? 'bg-white/20'
                            : isAfter(date, formattedNow)
                              ? 'bg-white/20'
                              : 'bg-white'
                          : 'bg-white/20',
                      )}
                      style={{ width: `${segmentedPostDayWidth}%` }}
                    >
                      {date === formattedNow && (
                        <div className="z-10 absolute top-[8px] flex flex-col items-center justify-center">
                          <div className="text-xs text-white">|</div>
                          <div className="relative top-[-4px] text-[9px] text-white">NOW</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
