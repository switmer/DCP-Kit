"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { CallSheetMemberType, NotificationLogType } from "@/types/type";
import { useEffect, useMemo, useState } from "react";
import ReactTimeAgo from "react-time-ago";
import en from "javascript-time-ago/locale/en.json";
import TimeAgo from "javascript-time-ago";
import { Tooltip } from "@/components/ui/Tooltip";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/Skeleton";

TimeAgo.setDefaultLocale(en.locale);
TimeAgo.addLocale(en);

export const Activity = ({ member }: { member: CallSheetMemberType }) => {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [activity, setActivity] = useState<NotificationLogType[]>([]);

  useEffect(() => {
    if (!member) return;
    setActivity([]);
    setLoading(true);
    supabase
      .from("notification_log")
      .select()
      .eq("call_sheet_member", member.id)
      .order("created_date", { ascending: false })
      .then(({ data }) => {
        setActivity(data ?? []);
        setLoading(false);
      });
  }, [member]);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-white text-opacity-95 text-base font-semibold z-[110]">
        Activity Log
      </div>

      <div className="py-0">
        {!activity.length && !loading && (
          <div className="text-sm py-3 text-left text-white/60 w-full">
            No activity yet
          </div>
        )}
        {loading && (
          <div className="grid content-start gap-2 overflow-auto h-fit relative">
            {[...new Array(3)].map((_, i) => {
              return <ActivityItemSkeleton key={i} />;
            })}
          </div>
        )}
        {!!activity.length && (
          <div className="grid content-start gap-2 overflow-auto h-fit relative">
            {activity?.map((a) => {
              return <ActivityItem key={a.id} {...a} member={member} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityItemSkeleton = () => {
  return (
    <div className="px-3 py-2.5 h-[55px] bg-white bg-opacity-5 rounded-lg flex items-center justify-between">
      <div className="flex gap-3 items-center">
        <div className="flex flex-col gap-1">
          <div className="text-white text-sm font-bold">
            <Skeleton className="w-[120px] h-4" />
          </div>
          <div className=" opacity-60 text-white text-[10px] font-medium font-label uppercase leading-[11px]">
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityItem: React.FC<
  { member: CallSheetMemberType } & NotificationLogType
> = (props) => {
  const text = useMemo(() => {
    switch (props.type) {
      /* Custom SMS message */
      case "message":
        return `Custom message sent to ${props.member.name}`;
      case "message_delivered":
        return `Custom message delivered to ${props.member.name}`;
      case "message_failed":
        return `Custom message failed to deliver to ${props.member.name}`;

      /* Custom email message */
      case "message_email":
        return `Custom message email sent to ${props.member.name}`;
      case "message_email_delivered":
        return `Custom message email delivered to ${props.member.name}`;
      case "message_email_failed":
        return `Custom message email failed to deliver to ${props.member.name}`;
      case "message_email_opened":
        return `Custom message email opened by ${props.member.name}`;

      /* Call card SMS */
      case "call_card_sent":
        return `Call card sent to ${props.member.name}`;
      case "call_card_failed":
        return `Call card sms failed to deliver to ${props.member.name}`;
      case "call_card_delivered":
        return `Call card sms delivered to ${props.member.name}`;

      /* Call card email */
      case "call_card_email_sent":
        return `Call card email sent to ${props.member.name}`;
      case "call_card_email_delivered":
        return `Call card email delivered to ${props.member.name}`;
      case "call_card_email_failed":
        return `Call card email failed to deliver to ${props.member.name}`;
      case "call_card_email_opened":
        return `Call card email opened by ${props.member.name}`;

      case "call_card_confirmed":
        return `${props.member.name} has confirmed their call`;
      case "call_card_login_email":
        return `${props.member.name} has signed in via email`;
      case "call_card_login_phone":
        return `${props.member.name} has signed in via phone`;
      case "call_card_opened":
        return `${props.member.name} has opened their call card`;
      case "call_card_push_sent":
        return `Call card with pushed call time sent to ${props.member.name}`;
      case "call_card_opened_pdf":
        return `${props.member.name} has opened the call sheet pdf`;
    }
  }, [props.member.name, props.type]);

  return (
    <Tooltip
      side="bottom"
      content={
        props.created_date
          ? format(
              new Date(`${props.created_date}Z`),
              "MMMM do, yyyy 'at' h:mm a"
            )
          : ""
      }
    >
      <div className="px-3 py-2.5 bg-white bg-opacity-5 rounded-lg flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="flex flex-col gap-1">
            <div className="text-white text-sm font-bold">{text}</div>
            <div className=" opacity-60 text-white text-[10px] font-medium font-label uppercase leading-[11px]">
              {!!props.created_date && (
                <>
                  <ReactTimeAgo
                    date={new Date(`${props.created_date}Z`)}
                    locale="en-US"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Tooltip>
  );
};
