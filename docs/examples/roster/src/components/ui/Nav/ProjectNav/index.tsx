'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../../Icon';
import { createClient } from '@/lib/supabase/client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '../../Tooltip';
import { toast } from 'sonner';
import { compareAsc, compareDesc, format, parse } from 'date-fns';
import { Skeleton } from '../../Skeleton';
import { Profile } from '../Profile';
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { getProject } from '@/queries/get-project';
import { UploadButtonCallSheet } from '../../Upload/UploadCallSheet';
import { PulsingCircle } from '@/components/ui/PulsingCircle/PulsingCircle';

export const ProjectNav: React.FC<{ project: string }> = ({ project }) => {
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<{ short_id: string | null; date: string | null }[]>([]);
  const currentUrl = usePathname();

  const supabase = createClient();

  const { data: p } = useQuery(getProject(supabase, project));

  const fetchSheets = useCallback(() => {
    if (!project) return;

    supabase
      .from('call_sheet')
      .select('short_id, date')
      .eq('project', project)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Something went wrong');
          setLoading(false);
          return;
        }

        if (data) {
          setSheets(data);
        }

        setLoading(false);
      });
  }, [project, supabase]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets, project]);

  const groupedByMonth = useMemo(() => {
    const res: Record<
      string,
      {
        short_id: string | null;
        date: string | null;
        weekday?: string;
        dayOfMonth?: string;
      }[]
    > = {};

    sheets?.forEach((item) => {
      let monthYear = 'Undated';
      let weekday = '--';
      let dayOfMonth = 'N/A';

      if (item.date) {
        try {
          const date = parse(item.date, 'MM/dd/yy', new Date());
          const invalidTime = isNaN(date.getTime());

          if (!invalidTime) {
            monthYear = format(date, 'MMM');
            weekday = format(date, 'EEE');
            dayOfMonth = format(date, 'd');
          }
        } catch (_err) {
          /* no_op */
        }
      }

      if (!res[monthYear]) {
        res[monthYear] = [];
      }

      res[monthYear].push({ ...item, weekday, dayOfMonth });
    });

    const keys = Object.keys(res ?? {});

    keys.forEach((key) => {
      res[key].sort((a, b) => {
        if (!a.date || !b.date) {
          return 0; //-- no change in sort order if either date is missing.
        }

        /* @ts-ignore */
        const parsedA = parse(a.date, 'MM/dd/yy', new Date());
        /* @ts-ignore */
        const parsedB = parse(b.date, 'MM/dd/yy', new Date());

        if (isNaN(parsedA.getTime()) || isNaN(parsedB.getTime())) {
          return 0;
        }

        return (
          /* @ts-ignore */
          new Date(parse(b.date, 'MM/dd/yy', new Date())) -
          /* @ts-ignore */
          new Date(parse(a.date, 'MM/dd/yy', new Date()))
        );
      });
    });

    return res;
  }, [sheets]);

  const currentId = useMemo(() => {
    const regex = /\/sheet\/(.*)/;

    const match = currentUrl.match(regex);

    if (match && match[1]) {
      return match[1];
    } else {
      return null;
    }
  }, [currentUrl]);

  return (
    <nav className="fixed top-0 left-0 bottom-0 w-[85px] bg-stone-850 bg-opacity-30 z-20 flex flex-col items-center max-sm:hidden">
      <Link href={'/'} className="w-full flex items-center justify-center p-6">
        <Icon name="arrow-left" className="h-10 w-10 text-lime-300" />
      </Link>

      <Link
        href={`/project/${p?.slug ?? p?.id}`}
        className={cn(
          'w-full flex items-center justify-center py-4',
          currentUrl === `/project/${p?.slug ?? p?.id}` &&
            'bg-lime-300 bg-opacity-10 hover:bg-lime-300 hover:bg-opacity-10',
        )}
      >
        <Icon
          name="home"
          className={cn(
            'h-8 w-8 text-zinc-600 hover:text-lime-300 duration-75 fill-none',
            currentUrl === `/project/${p?.slug ?? p?.id}` && 'text-lime-300 text-opacity-100',
          )}
        />
      </Link>

      {/* 
      <Link
        href={`/project/${p?.slug ?? p?.id}`}
        className={cn(
          "w-full flex items-center justify-center py-4",
          currentUrl === `/project/${p?.slug ?? p?.id}` &&
            "bg-lime-300 bg-opacity-10 hover:bg-lime-300 hover:bg-opacity-10"
        )}
      >
        <Icon
          name="users"
          className={cn(
            "h-8 w-8 text-zinc-600 hover:text-lime-300 duration-75 fill-none",
            currentUrl === `/project/${p?.slug ?? p?.id}` &&
              "text-lime-300 text-opacity-100"
          )}
        />
      </Link> */}

      <div className={cn('w-full flex items-center justify-center py-4')}>
        <UploadButtonCallSheet project={project} />
      </div>

      <div className="flex flex-col w-full overflow-y-auto hide-scrollbars flex-1">
        {Object.keys(groupedByMonth)
          .sort((a: string, b: string): number => {
            const dateA = parse(a, 'MMM', new Date());
            const dateB = parse(b, 'MMM', new Date());

            return compareDesc(dateB, dateA);
          })
          .map((monthYear, index) => {
            const reversedGroup = [...groupedByMonth[monthYear]].reverse();

            return (
              <div key={index}>
                <div
                  className={cn(
                    'text-white uppercase text-[13px] font-label w-full flex items-start justify-center text-center py-4',
                    index !== 0 && 'border-t border-zinc-600 border-opacity-25',
                  )}
                >
                  {monthYear}
                </div>

                {reversedGroup.map((sheet) => {
                  return (
                    <Link
                      key={sheet.short_id}
                      href={`/sheet/${sheet.short_id}`}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 py-4 text-center hover:bg-white hover:bg-opacity-[0.05] duration-100 relative',
                        currentId === sheet.short_id &&
                          'bg-lime-300 bg-opacity-10 hover:bg-lime-300 hover:bg-opacity-10',
                      )}
                    >
                      <div
                        className={cn(
                          'font-light font-label text-[11px] uppercase text-white text-opacity-30',
                          currentId === sheet.short_id && 'text-lime-300 text-opacity-100',
                        )}
                      >
                        {sheet.weekday}
                      </div>
                      <div
                        className={cn(
                          'text-white text-xl font-medium font-label',
                          currentId === sheet.short_id && 'text-lime-300',
                        )}
                      >
                        {sheet.dayOfMonth}
                      </div>

                      {new Date(sheet.date ?? '').toLocaleDateString('en-US') ===
                        new Date().toLocaleDateString('en-US') && (
                        <div className="w-[13px] h-[13px] absolute top-half -translate-x-half right-[10px]">
                          <PulsingCircle />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}

        {loading && (
          <>
            <div
              className={cn(
                'text-white uppercase text-[13px] font-label w-full flex items-start justify-center text-center py-4 h-12',
              )}
            >
              <Skeleton className="w-8 h-3 " />
            </div>

            {Array.from({ length: 3 }).map((_, index) => {
              return (
                <div key={index} className="flex flex-col items-center justify-center gap-1 h-20 text-center">
                  <Skeleton className="w-6 h-2" />
                  <Skeleton className="w-6 h-4" />
                </div>
              );
            })}
          </>
        )}
      </div>

      <Profile />
    </nav>
  );
};
