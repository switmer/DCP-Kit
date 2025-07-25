import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CallSheetMemberType,
  CallSheetType,
  CompanyCrewMemberType,
} from "@/types/type";
import { format, parse } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useOutsideClick from "@/lib/hooks/useClickOutside";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { AlertDialog } from "@/components/ui/AlertDialog";

import { RelatedJobs } from "@/components/blocks/CrewTable/Preview/RelatedJobs";
// import _ from "lodash";
import { formatPhoneNumber } from "@/lib/phone";

TimeAgo.setDefaultLocale(en.locale);
TimeAgo.addLocale(en);

export const CallSheetPreview: React.FC<{
  members: CallSheetMemberType[];
  crew: CompanyCrewMemberType[];
  focusedMember?: string | null;
  setFocusedMember: (id: string | null) => void;
  onUpdate: () => void;
  sheet: CallSheetType;
  departments?: string[];
}> = ({ members, crew, focusedMember, setFocusedMember, onUpdate }) => {
  const [currentMember, setCurrentMember] =
    useState<CallSheetMemberType | null>(null);

  useEffect(() => {
    setCurrentMember(
      members.find((m) => m.id === focusedMember) as CallSheetMemberType
    );
  }, [focusedMember, members]);

  const supabase = createClient();

  const ref = useOutsideClick(() => {
    setFocusedMember(null);
  });

  const initials = useMemo(() => {
    const words = currentMember?.name?.split(" ") ?? [];

    let initials = "";

    if (!words) return "-";

    for (const word of words) {
      if (word.length > 0 && initials.length < 2) {
        initials += word[0].toUpperCase();
      }
    }

    return initials;
  }, [currentMember?.name]);

  const onChange = (k: keyof CallSheetMemberType, v: any) => {
    if (!currentMember) return;

    let value = v;

    if (k === "phone") {
      const { formattedPhone } = formatPhoneNumber(v);
      value = formattedPhone ?? v;
    }

    setCurrentMember(
      (prev) =>
        ({
          ...prev,
          [k]: value,
        } as CallSheetMemberType)
    );

    if (["title", "department"].includes(k)) {
      /* @ts-ignore */
      if (!currentMember.project_position?.id) return;

      supabase
        .from("project_position")
        .update({
          [k]: value,
        })
        /* @ts-ignore */
        .eq("id", currentMember.project_position?.id)
        .then(() => {
          onUpdate();
          toast.success(`${currentMember?.name} details updated`);
        });
    } else if (["email", "phone", "name"].includes(k)) {
      /* @ts-ignore */
      if (!currentMember?.project_position?.project_member?.id) return;

      supabase
        .from("project_member")
        .update({
          [k]: value,
        })
        /* @ts-ignore */
        .eq("id", currentMember?.project_position?.project_member?.id)
        .then(() => {
          onUpdate();
          toast.success(`${currentMember?.name} details updated`);
        });
    } else {
      supabase
        .from("call_sheet_member")
        .update({ [k]: value })
        .eq("id", currentMember.id)
        .then(() => {
          onUpdate();
          toast.success(`${currentMember?.name} details updated`);
        });
    }
  };

  return (
    <div ref={ref}>
      <div
        className={cn(
          "max-w-[430px] backdrop-blur-2xl overflow-y-auto w-full z-50 p-8 bg-crew-preview rounded-3xl gap-6 flex flex-col top-3 right-3 bottom-3 fixed translate-x-[100%] opacity-0 duration-300",
          focusedMember && "translate-x-0 opacity-100"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger className="w-11 h-12 p-3 opacity-60 rounded-xl border border-white border-opacity-20 justify-center items-center flex absolute top-4 right-4">
            <Icon name="dots" className="w-[18px] h-[18px] text-white" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="bottom"
            align="end"
            className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[212px]"
          >
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation();
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(
                    currentMember?.name as string
                  )}`,
                  "_blank"
                );
              }}
              className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
            >
              Search on Google
              <Icon name="google" className="w-5 h-5 opacity-15" />
            </DropdownMenuItem>

            <div className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm flex w-full items-center [&>button]:w-full [&>button]:text-left">
              <AlertDialog
                withPortal
                onConfirm={async () => {
                  if (!currentMember?.id) return;

                  try {
                    await supabase
                      .from("company_crew_member")
                      .delete()
                      .eq("id", currentMember?.id);

                    toast.success(`${currentMember?.name} removed`);
                    onUpdate();
                  } catch {
                    toast.error("Something went wrong");
                  }
                }}
                isDelete
                title={`Are you sure you want to delete?`}
                description="This cannot be undone. This will permanently remove this crew member."
              >
                Remove person
              </AlertDialog>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-col pt-4 justify-center">
          <div className="flex flex-col gap-6 justify-center items-center">
            <Avatar className="w-32 h-32 rounded-full">
              <AvatarFallback className="w-32 h-32 flex items-center justify-center">
                <span className="text-[98px] font-medium leading-none">
                  {initials[0]}
                </span>
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-center items-center gap-3">
              <div className="text-white/80 text-[15px] font-bold tracking-[1px]">
                {currentMember?.department?.toUpperCase()}
              </div>

              <div className="text-white text-[34px] font-bold leading-[1]">
                {currentMember?.name}
              </div>

              <div className="text-white/90 text-[20px] font-medium leading-[1]">
                {currentMember?.title}
              </div>
            </div>
          </div>
        </div>

        <Details member={currentMember!} onChange={onChange} />

        <RelatedJobs id={currentMember?.crew_member as unknown as number} />

        {currentMember?.created_at && (
          <div className="opacity-40 text-white text-xs text-center font-medium">
            <div className="tracking-[1px] font-medium text-[12px] mb-2">
              ON ROSTER SINCE
            </div>

            <div className="font-bold text-[20px]">
              {format(currentMember?.created_at, "MMM yyyy")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Details = ({
  member,
}: {
  departments?: string[];
  member?: CallSheetMemberType;
  onChange: (k: keyof CallSheetMemberType, v: any) => void;
}) => {
  const labels = {
    name: "Name",
    phone: "Phone",
    email: "Email",
    call_time: "Call",
  };

  if (!member) return <></>;

  return (
    <div className="grid gap-3 mt-5">
      {[...Object.entries(labels)].map(([key, label]) => {
        return (
          <div
            key={key}
            className="flex gap-10 mb-4 justify-start items-center"
          >
            <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">
              {label}
            </div>

            <div className="text-white/90 font-medium leading-none">
              {member[key as keyof CallSheetMemberType]}
            </div>
          </div>
        );
      })}
    </div>
  );
};
