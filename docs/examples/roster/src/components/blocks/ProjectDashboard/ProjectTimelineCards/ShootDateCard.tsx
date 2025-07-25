import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { PulsingCircle } from '@/components/ui/PulsingCircle/PulsingCircle';
import { cn, formatSheetDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { CallSheetLocationType, CallSheetType } from '@/types/type';
import { FC, useState } from 'react';
import { AlertDialog } from '@/components/ui/AlertDialog';

type Props = {
  sheet: CallSheetType & {
    call_sheet_location: Pick<CallSheetLocationType, 'name'>[];
  };
  index: number;
  formattedNow: string;
  formatDate: (date: string, format: string) => string;
  deleteDay: (sheet: CallSheetType) => Promise<void>;
  setRefreshKey(prev: (prev: number) => any): void;
};

export const ShootDateCard: FC<Props> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  //@ts-ignore
  const jobName = props.sheet?.raw_json?.job_name;

  return (
    <div
      className={cn(
        'group/card relative flex gap-2 w-[250px] h-[65px] p-3 bg-stone-800/60 border border-white border-opacity-10 hover:border-opacity-30 hover:bg-opacity-[0.04] rounded-xl hover:bg-stone-800/100 cursor-pointer',
        props.sheet.date === props.formattedNow && 'ring-1 ring-lime-300/60',
      )}
      onClick={(e) => {
        //-- only navigate if not clicking the dropdown or its content.
        if (!(e.target as HTMLElement).closest('.dropdown-zone')) {
          window.location.href = `/sheet/${props.sheet.short_id}`;
        }
      }}
    >
      <div className="z-20 absolute top-1 right-1 dropdown-zone">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger
            className={cn(
              'dots-icon text-white/60 hover:text-white/80 outline-none',
              //-- show on either hover or when menu is open.
              'opacity-0 group-hover/card:opacity-100',
              isOpen && 'opacity-100',
            )}
          >
            <Icon name="dots" className="w-4 h-4" />
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              side="bottom"
              align="center"
              sideOffset={5}
              className="w-[190px] p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 cursor-pointer dropdown-zone"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm"
              >
                <AlertDialog
                  withPortal
                  onConfirm={async () => {
                    await props.deleteDay(props.sheet);
                    props.setRefreshKey((prev) => prev + 1);
                  }}
                  isDelete
                  title={`Are you sure you want to delete day: ${formatSheetDate(
                    /* @ts-ignore */
                    props.sheet?.raw_json?.full_date,
                    'str',
                  )}?`}
                  description={'This cannot be undone. This will permanently remove this day.'}
                >
                  {'Delete day: '}
                  {
                    formatSheetDate(
                      //@ts-ignore
                      props.sheet?.raw_json?.full_date ?? props.sheet?.date,
                      'str',
                    ) as string
                  }
                </AlertDialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>

      {props.sheet.date === props.formattedNow ? (
        <PulsingCircle />
      ) : (
        <div className={cn('relative top-[5px] w-[8px] h-[8px] bg-lime-300/50 rounded-full')} />
      )}

      <div className="flex flex-col items-start justify-center">
        <div className="flex items-center gap-3 pb-1">
          <div className="max-w-[110px] text-sm text-white/90 font-bold truncate">
            {!!jobName && jobName.length > 12 ? (
              <Tooltip content={jobName}>
                <div className="max-w-[110px] text-sm text-white/90 font-bold truncate">
                  {!!jobName ? jobName : `Shoot Day ${props.index + 1}`}
                </div>
              </Tooltip>
            ) : !!jobName ? (
              jobName
            ) : (
              `Shoot Day ${props.index + 1}`
            )}
          </div>

          <div className="flex items-center justify-center h-auto px-2 py-[1px] text-[11px] text-white/55 font-bold bg-zinc-900 border border-white/30 rounded-xl">
            Shoot Day
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[12px] text-white/60 font-bold">
            {props.formatDate(props.sheet.date as string, 'eee, MMM dd')}
          </div>

          {props.sheet.call_sheet_location.length > 0 && (
            <div className="flex items-center gap-1">
              <Icon name="pin" className="w-3 h-3 text-white/80" />

              <div className="max-w-[110px] text-[12px] text-white/60 font-bold truncate">
                {props.sheet.call_sheet_location[0].name && props.sheet.call_sheet_location[0].name.length > 12 ? (
                  <Tooltip content={props.sheet.call_sheet_location[0].name}>
                    <div className="max-w-[110px] text-[13px] text-white/60 font-bold truncate">
                      {props.sheet.call_sheet_location[0].name}
                    </div>
                  </Tooltip>
                ) : (
                  props.sheet.call_sheet_location[0].name
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
