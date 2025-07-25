import React, { FC } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { formatPhoneNumber } from "react-phone-number-input/min";
import { cn, makeInitials } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { NewPointOfContactInfo } from "@/components/blocks/ProjectDashboard/ProjectEntities/CreateNewProjectEntity";

type Props = {
  showAddPointOfContact?: boolean;
  newPointOfContactInfo: NewPointOfContactInfo;
};

export const NewPointOfContactItem: FC<Props> = (props) => {
  const initials = props.newPointOfContactInfo.name
    ? makeInitials(props.newPointOfContactInfo.name)
    : "";

  return (
    <div className={cn("group flex flex-col px-3 py-3 rounded-xl w-[315px]")}>
      <div
        className={cn(
          "flex items-center gap-2 h-[15px] font-label font-medium uppercase text-lg text-white/80 mb-2 leading-none max-sm:mb-3"
        )}
      >
        Point of Contact
      </div>

      <div className="flex items-center gap-2 w-full">
        {initials ? (
          <Avatar className="w-[60px] h-[60px]">
            <AvatarFallback>
              <span className="text-base text-[34px]">{initials}</span>
            </AvatarFallback>
          </Avatar>
        ) : (
          <Skeleton className="w-[60px] h-[60px] rounded-full" />
        )}

        <div className="flex flex-col gap-2">
          <div className="">
            {props.newPointOfContactInfo.name ? (
              <div className="text-white text-md font-bold leading-none max-sm:text-[16px]">
                {props.newPointOfContactInfo.name}
              </div>
            ) : (
              <Skeleton className="w-[180px] h-[18px] rounded-xl" />
            )}
          </div>

          <div className="">
            {props.newPointOfContactInfo.phone &&
            props.newPointOfContactInfo.phone.length > 1 ? (
              <div className="text-white/70 text-sm font-normal leading-none">
                {formatPhoneNumber(props.newPointOfContactInfo.phone)}
              </div>
            ) : (
              <Skeleton className="w-[120px] h-[14px] rounded-xl" />
            )}
          </div>

          <div className="">
            {props.newPointOfContactInfo.email ? (
              <div className="relative top-[-3px] text-white/70 text-sm font-normal leading-none">
                {props.newPointOfContactInfo.email}
              </div>
            ) : (
              <Skeleton className="w-[130px] h-[14px] rounded-xl" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
