import React, { FC } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { cn, makeInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = {
  position?: string;
  name?: string;
  phone?: string;
};

export const NewProductionContactItem: FC<Props> = (props) => {
  const initials = props.name ? makeInitials(props.name) : '';

  return (
    <div className={cn('group flex flex-col px-3 py-3 rounded-xl min-w-[200px]')}>
      <div
        className={cn(
          'flex justify-between items-center h-[15px] font-label font-medium uppercase text-sm text-white/80 mb-2 leading-none max-sm:mb-3',
        )}
      >
        {props.position ? (
          <>{props.position.replaceAll('_', ' ')}</>
        ) : (
          <Skeleton className="w-[140px] h-[13px] rounded-xl" />
        )}
      </div>

      <div className="flex items-center gap-2">
        {initials ? (
          <Avatar>
            <AvatarFallback>
              <span>{initials}</span>
            </AvatarFallback>
          </Avatar>
        ) : (
          <Skeleton className="w-[42px] h-[42px] rounded-full" />
        )}

        <div className="flex flex-col gap-2">
          <div className="text-white text-md font-bold leading-none max-sm:text-[16px]">
            {props.name ? <>{props.name}</> : <Skeleton className="w-[180px] h-[18px] rounded-xl" />}
          </div>

          <div className="text-white/70 text-sm font-normal leading-none">
            {props.phone && props.phone.length > 1 ? (
              <>{formatPhoneNumber(props.phone)}</>
            ) : (
              <Skeleton className="w-[120px] h-[14px] rounded-xl" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
