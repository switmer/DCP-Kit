import { Icon } from '@/components/ui/Icon';
import { FC } from 'react';
import { cn } from '@/lib/utils';
import { ProjectDashViewT } from '@/components/blocks/ProjectDashboard';

type Props = {
  setView: (view: ProjectDashViewT) => void;
  numCrew?: number;
  numPositions?: number;
  numDaysRemaining?: number;
  numFiles?: number;
  numLocations?: number;
};

const renderIcon = (type: string) => {
  switch (type) {
    case 'crew':
      return (
        <div className="flex items-center justify-center bg-emerald-500/15 rounded-xl w-[32px] h-[32px]">
          <Icon name="users" className="w-7 h-7 text-emerald-500" />
        </div>
      );

    case 'days':
      return (
        <div className="flex items-center justify-center bg-emerald-500/15 rounded-xl w-[32px] h-[32px]">
          <Icon name="clock" className="w-6 h-6 text-blue-500" />
        </div>
      );

    case 'files':
      return (
        <div className="flex items-center justify-center bg-emerald-500/15 rounded-xl w-[32px] h-[32px]">
          <Icon name="attachment" className="w-[18px] h-[18px] text-blue-500" />
        </div>
      );

    case 'locations':
      return (
        <div className="flex items-center justify-center bg-emerald-500/15 rounded-xl w-[32px] h-[32px]">
          <Icon name="pin" className="w-4 h-4 text-emerald-500" />
        </div>
      );

    default:
      return;
  }
};

export const InfoCard: FC<Props> = (props) => {
  const type =
    props.numCrew || props.numPositions
      ? 'crew'
      : props.numDaysRemaining
        ? 'days'
        : props.numFiles
          ? 'files'
          : 'locations';
  const count = props.numCrew || props.numDaysRemaining || props.numFiles || props.numLocations;
  const count2 = type === 'crew' ? props.numPositions : undefined;
  const text =
    props.numCrew || props.numPositions
      ? 'Crew Members'
      : props.numDaysRemaining
        ? 'Days Remaining'
        : props.numFiles
          ? 'Documents'
          : 'Locations';

  return (
    <div
      onClick={() => type !== 'days' && props.setView(type.toLowerCase() as ProjectDashViewT)}
      className={cn(
        'flex items-center gap-4 w-[195px] h-[85px] px-4 py-6 border border-neutral-600/50 rounded-xl cursor-pointer',
        (type === 'crew' || type === 'locations') && 'bg-emerald-500/5 hover:bg-emerald-500/10',
        (type === 'days' || type === 'files') && 'bg-blue-500/5 hover:bg-blue-500/10',
        type === 'days' && 'cursor-default',
      )}
    >
      <div className="flex items-center">
        {renderIcon(type)}
        <div className="text-xs"></div>
      </div>

      <div className="flex flex-col">
        <div className="text-2xl text-white font-bold">
          {count ?? 0}
          {count2 && `/${count2}`}
        </div>
        <div className="text-[12px] text-white/70 font-medium">{text}</div>
      </div>
    </div>
  );
};
