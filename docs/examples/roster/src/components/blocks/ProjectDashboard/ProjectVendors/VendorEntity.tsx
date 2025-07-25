import React, { CSSProperties, FC, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CompanyEntityType, EntityPointOfContactType, ProjectEntityType } from '@/types/type';
import { toast } from 'sonner';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Tooltip } from '@/components/ui/Tooltip';

type Props = {
  entity: ProjectEntityType;
  pointOfContact?: EntityPointOfContactType;
  setSelectedEntity: (id: string) => void;
};

export const VendorEntity: FC<Props> = (props) => {
  const words = props?.entity?.name?.split(' ');

  let initials = '';

  if (words) {
    for (const word of words) {
      if (word.length > 0) {
        initials += word[0]?.toUpperCase();
      }
    }
  }

  let phone = '';

  if (props?.entity?.phone) {
    phone = formatPhoneNumber(props?.entity?.phone);

    if (!phone) {
      const cleanPhone = props?.entity?.phone.replace(/[^0-9]/g, '');
      phone = formatPhoneNumber('+1' + cleanPhone);
    }
  }

  if (!props.entity.phone || !props.entity.email || !props.entity.address) {
    return (
      <div
        onClick={() => props.setSelectedEntity(props.entity.id)}
        className={cn(
          'group flex items-center justify-between px-5 py-3 pt-4 gap-3 rounded-xl min-w-[310px] w-[310px] h-full border border-zinc-900 hover:bg-stone-500/20 cursor-pointer',
        )}
        key={props.entity.id}
      >
        <div className={cn('flex flex-col items-start justify-center gap-2')}>
          <div className={cn('flex items-center gap-2')}>
            {props?.entity?.name && (
              <div className="font-bold flex items-center gap-2 h-[15px] font-label uppercase text-[16px] text-white/80 leading-none max-sm:mb-3">
                {props.entity.name}
              </div>
            )}

            {props?.entity?.type && (
              <div className="flex items-center justify-center w-auto h-[18px] px-2 bg-zinc-800 text-lime-300 text-xs rounded-full">
                {props.entity.type.replaceAll('_', ' ').toUpperCase()}
              </div>
            )}
          </div>

          {props.entity.phone && <div className="text-white/70 text-sm font-normal leading-none">{phone}</div>}

          {props.entity.email && (
            <div className="text-white/70 text-sm font-normal leading-none">{props.entity?.email}</div>
          )}

          <div className="">
            {props?.entity?.address && (
              <Tooltip content={props.entity?.address && props.entity.address.length > 28 ? props.entity.address : ''}>
                <div className="truncate max-w-[200px] text-white/70 text-sm font-normal leading-none">
                  {props.entity?.address ? props.entity.address : '--'}
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        <Avatar className="w-[60px] h-[60px] shrink-0">
          {props.entity.logo !== '' && (
            <AvatarImage
              src={props.entity.logo ?? ''}
              alt="Avatar"
              className="object-contain"
              onError={(e) => {
                //-- if image fails to load.
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          <AvatarFallback>
            <span className="text-base text-[34px]">{initials}</span>
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div
      onClick={() => props.setSelectedEntity(props.entity.id)}
      className={cn(
        'group flex items-center px-5 py-3 pt-4 rounded-xl min-w-[310px] max-w-[310px] h-[125px] border border-zinc-900 hover:bg-stone-500/20 cursor-pointer',
      )}
      key={props.entity.id}
    >
      <div className={cn('flex flex-col items-center gap-2 h-full')}>
        <div className="flex justify-start gap-2 w-full h-[50px]">
          {props?.entity?.name && (
            <div className="flex items-center gap-2 h-[15px] font-label font-medium uppercase text-[16px] text-white/80 leading-none max-sm:mb-3">
              {props.entity.name}
            </div>
          )}

          {props?.entity?.type && (
            <div className="flex items-center justify-center w-auto h-[18px] px-2 bg-zinc-800 text-lime-300 text-xs rounded-full uppercase">
              {props?.entity?.subtype
                ? props.entity.subtype.replaceAll('_', ' ')
                : props.entity.type.replaceAll('_', ' ')}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Avatar className="w-[60px] h-[60px] shrink-0">
            {props.entity.logo !== '' && (
              <AvatarImage
                src={props.entity.logo ?? ''}
                alt="Avatar"
                className="object-contain"
                onError={(e) => {
                  //-- if image fails to load.
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            <AvatarFallback>
              <span className="text-base text-[34px]">{initials}</span>
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-start gap-2 w-full h-full pt-2">
            <div className="text-white/90 text-[16px] font-medium leading-none">{phone ? phone : '--'}</div>

            <div className="text-white/70 text-sm font-normal leading-none">
              {props.entity?.email ? props.entity.email : '--'}
            </div>

            <div className="flex items-center justify-between w-full h-[17px]">
              <Tooltip content={props.entity?.address && props.entity.address.length > 28 ? props.entity.address : ''}>
                <div className="truncate max-w-[200px] text-white/70 text-sm font-normal leading-none">
                  {props.entity?.address ? props.entity.address : '--'}
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
