import React, { FC, useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { capitalizeString, cn, makeInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { NewEntityInfo } from '@/components/blocks/ProjectDashboard/ProjectEntities/CreateNewProjectEntity';
import { CompanyEntityType } from '@/types/type';

type Props = {
  newEntityInfo: NewEntityInfo;
  selectedEntity?: CompanyEntityType;
};

export const NewEntityItem: FC<Props> = (props) => {
  const [displayData, setDisplayData] = useState({
    name: props.newEntityInfo.name !== undefined ? props.newEntityInfo.name : props.selectedEntity?.name || '',
    type: props.newEntityInfo.type !== undefined ? props.newEntityInfo.type : props.selectedEntity?.type || '',
    subtype:
      props.newEntityInfo.subtype !== undefined ? props.newEntityInfo.subtype : props.selectedEntity?.subtype || '',
    logo: props.newEntityInfo.logo !== undefined ? props.newEntityInfo.logo : props.selectedEntity?.logo || '',
    phone: props.newEntityInfo.phone !== undefined ? props.newEntityInfo.phone : props.selectedEntity?.phone || '',
    email: props.newEntityInfo.email !== undefined ? props.newEntityInfo.email : props.selectedEntity?.email || '',
    address:
      props.newEntityInfo.address !== undefined ? props.newEntityInfo.address : props.selectedEntity?.address || '',
  });

  //-- update displayData whenever newEntityInfo changes, but don't fall back to selectedEntity when empty.
  useEffect(() => {
    setDisplayData({
      name: props.newEntityInfo.name !== undefined ? props.newEntityInfo.name : '',
      type: props.newEntityInfo.type !== undefined ? props.newEntityInfo.type : '',
      subtype: props.newEntityInfo.subtype !== undefined ? props.newEntityInfo.subtype : '',
      logo: props.newEntityInfo.logo !== undefined ? props.newEntityInfo.logo : '',
      phone: props.newEntityInfo.phone !== undefined ? props.newEntityInfo.phone : '',
      email: props.newEntityInfo.email !== undefined ? props.newEntityInfo.email : '',
      address: props.newEntityInfo.address !== undefined ? props.newEntityInfo.address : '',
    });
  }, [props.newEntityInfo]);

  const initials = displayData.name ? makeInitials(displayData.name) : '';

  return (
    <div className={cn('group flex flex-col px-3 py-3 rounded-xl w-[315px] max-w-[315px] overflow-x-clip')}>
      <div
        className={cn(
          'flex items-center gap-2 h-[25px] font-label font-medium uppercase text-lg text-white/80 mb-2 leading-none max-sm:mb-3',
          displayData.name.length + displayData.type.length > 27 && 'flex-col h-[40px] items-start gap-1',
        )}
      >
        {displayData.name ? (
          <div className="">{displayData.name}</div>
        ) : props.newEntityInfo?.type.toLowerCase() === 'vendor' ? (
          <>{'Vendor'}</>
        ) : (
          <>{'Entity'}</>
        )}

        <div className="flex items-center justify-center w-auto h-[18px] px-2 bg-zinc-800 text-lime-300 text-xs rounded-full">
          {props.newEntityInfo?.subtype
            ? capitalizeString(props.newEntityInfo.subtype)
            : capitalizeString(displayData.type)}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full">
        {initials || displayData.logo ? (
          <Avatar className="w-[60px] h-[60px] shrink-0">
            {displayData.logo && (
              <AvatarImage
                src={displayData.logo}
                alt="Avatar"
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <AvatarFallback>
              <span className="text-base text-[34px]">{initials}</span>
            </AvatarFallback>
          </Avatar>
        ) : (
          <Skeleton className="w-[60px] h-[60px] rounded-full shrink-0" />
        )}

        <div className="flex flex-col gap-2 w-full">
          <div className="text-white/70 text-sm font-normal leading-none">
            {displayData.phone && displayData.phone.length > 1 ? (
              <div className="text-white/70 text-sm font-normal leading-none">
                {formatPhoneNumber(displayData.phone)}
              </div>
            ) : (
              <Skeleton className="w-[100px] h-[14px] rounded-xl" />
            )}
          </div>

          <div className="">
            {displayData.email ? (
              <div className="relative top-[-3px] text-white/70 text-sm font-normal leading-none">
                {displayData.email}
              </div>
            ) : (
              <Skeleton className="w-[90%] h-[14px] rounded-xl" />
            )}
          </div>

          <div className="">
            {displayData.address ? (
              <div className="relative top-[-3px] text-white/70 text-sm font-normal leading-none">
                {capitalizeString(displayData.address)}
              </div>
            ) : (
              <Skeleton className="w-[80%] h-[14px] rounded-xl" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
