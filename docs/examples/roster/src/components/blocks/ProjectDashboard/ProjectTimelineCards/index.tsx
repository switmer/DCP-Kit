'use client';

import React, { FC, useRef, useEffect, useState, useMemo } from 'react';
import { ProjectType } from '@/types/type';
import { DateCards } from '@/components/blocks/ProjectDashboard/ProjectTimelineCards/DateCards';
import { Icon } from '@/components/ui/Icon';
import { ProjectTimelineGraph } from '@/components/blocks/ProjectDashboard/ProjectTimelineGraph';
import { format } from 'date-fns';

type Props = {
  data: ProjectType;
};

export const ProjectTimelineCards: FC<Props> = (props) => {
  //-- track when the DateCards component is mounted, so we can trigger the auto-scroll useeffect
  //-- _after_ the cards are loaded.
  const [dateCardsMounted, setDateCardsMounted] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allDates = useMemo(
    () => [...(props.data.prep_dates || []), ...(props.data.dates || []), ...(props.data.post_dates || [])],
    [props.data.prep_dates, props.data.dates, props.data.post_dates],
  );

  useEffect(() => {
    //-- don't run scroll logic until cards are mounted.
    if (!scrollContainerRef.current || !dateCardsMounted) return;

    //-- format today's date to match MM/dd/yy format.
    const formattedToday = format(new Date(), 'MM/dd/yy');

    //-- find the first date that is today.
    const todayDate = allDates.find((date) => date === formattedToday);

    if (todayDate) {
      //-- wait for next tick to ensure dom is updated.
      requestAnimationFrame(() => {
        const todayCards = scrollContainerRef.current?.querySelectorAll(`[data-date="${todayDate}"]`);

        if (todayCards && todayCards?.length > 0) {
          const todayCard = todayCards[0] as HTMLElement;
          const scrollableContainer = scrollContainerRef.current;

          if (!scrollableContainer) return;

          //-- calculate scroll position to center the card.
          const cardLeftOffset = todayCard.offsetLeft;
          const containerWidth = scrollableContainer.clientWidth;
          const cardWidth = todayCard.offsetWidth;

          //-- center the card in the container.
          const scrollPosition = cardLeftOffset - containerWidth / 2 + cardWidth / 2;

          scrollableContainer.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth',
          });
        }
      });
    }
  }, [dateCardsMounted, allDates]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    //-- card width plus 8px to account for gap.
    const scrollAmount = 259;

    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!props.data || !props.data.dates || props.data.dates.length === 0) {
    return null;
  }

  if (!props.data.prep_dates || !props.data.prep_dates[0] || !props.data.post_dates || !props.data.post_dates[0])
    return null;

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col justify-center">
          <div className="text-xl text-white font-medium">Project Timeline</div>
        </div>

        {/*<div className="flex items-center justify-center gap-2">*/}
        {/*  <Icon name="plusAlt" className="w-6 h-6 text-white/80" />*/}
        {/*  <Icon name="calendar" className="w-6 h-6 text-white/80" />*/}
        {/*</div>*/}
      </div>

      <ProjectTimelineGraph data={props.data} />

      <div className="flex flex-col justify-center gap-1 min-w-[650px] p-4 rounded-xl">
        {/*<div className="flex items-center justify-between w-full">*/}
        {/*  <div className="flex flex-col justify-center">*/}
        {/*    <div className="font-bold">Project Timeline</div>*/}
        {/*  </div>*/}

        {/*  /!*<div className="flex items-center justify-center gap-2">*!/*/}
        {/*  /!*  <Icon name="plusAlt" className="w-6 h-6 text-white/80" />*!/*/}
        {/*  /!*  <Icon name="calendar" className="w-6 h-6 text-white/80" />*!/*/}
        {/*  /!*</div>*!/*/}
        {/*</div>*/}

        {/*<ProjectTimelineGraph data={props.data} />*/}

        <div className="relative flex items-center px-3">
          {/* left scroll button */}
          <div
            className="z-10 group absolute left-[-10px] flex items-center justify-center w-[16px] h-full rounded-full bg-none hover:bg-stone-900 text-white cursor-pointer"
            onClick={() => scrollByAmount('left')}
          >
            <Icon name="chevron" className="w-3 h-3 text-white/40 rotate-180 group-hover:text-white/60" />
          </div>

          <div
            ref={scrollContainerRef}
            className="flex items-center w-auto h-[100px] px-1 gap-5 overflow-x-scroll overflow-y-hidden hide-scrollbars"
          >
            {allDates && allDates.length > 0 && (
              <DateCards
                projectId={props.data.id}
                prepDates={props.data.prep_dates && props.data.prep_dates.length > 0 ? props.data.prep_dates : []}
                postDates={props.data.post_dates && props.data.post_dates.length > 0 ? props.data.post_dates : []}
                dates={allDates}
                scrollContainer={scrollContainerRef.current}
                setDateCardsMounted={setDateCardsMounted}
              />
            )}
          </div>

          {/* right scroll button */}
          <div
            className="z-10 group absolute right-[-10px] flex items-center justify-center w-[16px] h-full rounded-full bg-none hover:bg-stone-900 text-white cursor-pointer"
            onClick={() => scrollByAmount('right')}
          >
            <Icon name="chevron" className="w-3 h-3 text-white/40 group-hover:text-white/60" />
          </div>
        </div>
      </div>
    </>
  );
};
