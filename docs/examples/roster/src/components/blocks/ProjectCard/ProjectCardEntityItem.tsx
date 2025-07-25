import React, { FC } from "react";
import { formatPhoneNumber } from "react-phone-number-input/min";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { CompanyEntityType } from "@/types/type";

type Props = {
  ent: CompanyEntityType;
};

export const ProjectCardEntityItem: FC<Props> = ({ ent }) => {
  const words = ent.name?.split(" ");

  let initials = "";

  if (words) {
    for (const word of words) {
      if (word.length > 0) {
        initials += word[0]?.toUpperCase();
      }
    }
  }

  let phone = "";

  if (ent?.phone) {
    phone = formatPhoneNumber(ent.phone);

    if (!phone) {
      const cleanPhone = ent.phone.replace(/[^0-9]/g, "");
      phone = formatPhoneNumber("+1" + cleanPhone);
    }
  }

  return (
    <Card
      key={ent.id}
      className="px-8 py-6 group rounded-[10px] bg-card-gradient"
    >
      <CardContent className="p-0 flex flex-col">
        <div
          className={cn(
            "flex items-center justify-between gap-2 h-[15px] font-label font-medium uppercase text-sm text-white/80 mb-2 leading-none max-sm:mb-1"
          )}
          // onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-2">
            {ent?.name && (
              <div className="flex items-center gap-2 h-[15px] font-label font-medium uppercase text-[16px] text-white/80 leading-none">
                {ent.name}
              </div>
            )}

            {ent?.type && (
              <div className="flex items-center justify-center w-auto h-[18px] px-2 bg-zinc-800 text-lime-300 text-xs rounded-full uppercase">
                {ent?.subtype
                  ? ent.subtype.replaceAll("_", " ")
                  : ent.type.replaceAll("_", " ")}
              </div>
            )}
          </div>
        </div>

        <div className={cn("flex items-center gap-2 h-full")}>
          <Avatar className="w-[60px] h-[60px] shrink-0">
            {ent.logo !== "" && (
              <AvatarImage
                src={ent.logo ?? ""}
                alt="Avatar"
                onError={(e) => {
                  //-- if image fails to load.
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

            <AvatarFallback>
              <span className="text-base text-[34px]">{initials}</span>
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-start gap-2 w-full h-full pt-2">
            <div className="text-white/90 text-[16px] font-medium leading-none">
              {phone ? phone : "--"}
            </div>

            <div className="text-white/70 text-sm font-normal leading-none pb-[6px]">
              {ent?.email ? ent.email : "--"}
            </div>

            <div className="flex items-center justify-between w-full h-[17px]">
              <div className="max-w-[200px] text-white/70 text-sm font-normal leading-none">
                {ent?.address ? ent.address : "--"}
              </div>
            </div>
          </div>
        </div>

        {/*<Icon*/}
        {/*  name="chevron"*/}
        {/*  className="w-[10px] h-5 text-white/25 group-hover:text-white/80 duration-100"*/}
        {/*/>*/}
      </CardContent>
    </Card>
  );
};
