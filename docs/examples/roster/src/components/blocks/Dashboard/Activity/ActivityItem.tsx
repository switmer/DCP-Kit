"use client";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { createClient } from "@/lib/supabase/client";
import { Database, Json } from "@/types/supabase";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import ReactTimeAgo from "react-time-ago";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { create } from "lodash";

TimeAgo.setDefaultLocale(en.locale);
TimeAgo.addLocale(en);

export const ActivityItem: React.FC<{
  id: number;
  created_date?: string | null;
  is_read?: boolean | null;
  type?: Database["public"]["Enums"]["notification_type"];
  call_sheet: {
    raw_json?: Json | null;
  } | null;
  call_sheet_member: {
    name?: string | null;
  } | null;
}> = ({ id, created_date, is_read, type, call_sheet, call_sheet_member }) => {
  const [localIsRead, setisLocalRead] = useState(is_read);

  const supabase = createClient();

  const text = useMemo(() => {
    switch (type) {
      case "message":
        return `You sent a broadcast to ${call_sheet_member?.name}`;
      case "call_card_sent":
        return `You sent a call card to ${call_sheet_member?.name}`;
      case "call_card_confirmed":
        return `${call_sheet_member?.name} confirmed call`;
    }
  }, [type, call_sheet_member]);

  const initials = useMemo(() => {
    const words = call_sheet_member?.name?.split(" ") ?? [];

    let initials = "";

    if (!words) return "-";

    for (const word of words) {
      if (word.length > 0 && initials.length < 2) {
        initials += word[0]?.toUpperCase();
      }
    }

    return initials;
  }, [call_sheet_member?.name]);

  if (localIsRead) {
    return <></>;
  }

  return (
    <div className="px-3 py-2.5 bg-white bg-opacity-5 rounded-lg flex items-center justify-between">
      <div className="flex gap-3 items-center">
        <Avatar className="w-[22px] h-[22px] bg-white bg-opacity-10 rounded-full">
          <AvatarFallback className="w-[22px] h-[22px] bg-white bg-opacity-5 flex items-center justify-center">
            <span className="text-white text-[11px] font-medium leading-none">
              {initials}
            </span>
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="text-white text-sm font-bold">{text}</div>
          <div className=" opacity-60 text-white text-[10px] font-medium font-label uppercase leading-[11px]">
            {/* @ts-ignore  */}
            {[call_sheet?.raw_json?.job_name, call_sheet?.raw_json?.day_of_days]
              .filter((v) => !!v)
              .join(" · ")}
            {!!created_date && (
              <>
                ·{" "}
                <ReactTimeAgo
                  date={new Date(`${created_date}Z`)}
                  locale="en-US"
                />
              </>
            )}
          </div>
        </div>
      </div>
      <Tooltip content={"Mark as read"}>
        <button
          onClick={() => {
            setisLocalRead(true);
            supabase
              .from("notification_log")
              .update({ is_read: true })
              .eq("id", id)
              .then(({ error }) => {
                if (error) {
                  setisLocalRead(false);
                  toast.error("Failed to mark activity as read");
                }
              });
          }}
        >
          <Icon className="rotate-[45deg] w-6 h-6" name="plus" />
        </button>
      </Tooltip>
    </div>
  );
};
