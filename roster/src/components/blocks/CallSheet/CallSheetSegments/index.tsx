"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { CallSheetMemberType } from "@/types/type";
import React, { useMemo } from "react";

interface Props {
  members: CallSheetMemberType[];
  active: "all" | "pending" | "sent" | "confirmed" | "failed";
  setActive: (
    active: "all" | "pending" | "sent" | "confirmed" | "failed"
  ) => void;
}

const tabs = [
  {
    title: "Everyone",
    icon: null,
    key: "all",
  },
  {
    title: "Not sent",
    icon: "send",
    color: "orange-500",
    key: "pending",
  },
  {
    title: "Not confirmed",
    icon: "clock",
    color: "orange-500",
    key: "sent",
  },
  {
    title: "Confirmed",
    icon: "checkmark-alternative",
    color: "lime-300",
    key: "confirmed",
  },
  {
    title: "SMS failed",
    icon: "plus-circle",
    color: "red-400",
    key: "failed",
  },
];

export const CallSheetSegments: React.FC<Props> = ({
  members,
  active,
  setActive,
}) => {
  const counts = useMemo(() => {
    return {
      all: members.length,
      sent: members.filter((m) => m.status === "sent-call-card").length,
      pending: members.filter((m) => m.status === "pending").length,
      confirmed: members.filter((m) => m.status === "confirmed").length,
      failed: members.filter((m) => m.status === "call-card-sms-failed").length,
    };
  }, [members]);

  return (
    <>
      <div className="flex items-center ml-1 relative flex-1 max-sm:overflow-x-scroll">
        {tabs.map((t, index) => {
          if (t.key === "failed" && counts.failed === 0) return null;
          return (
            <div
              key={index}
              onClick={() => {
                if (!counts[t.key as keyof typeof counts]) return;
                setActive(t.key as keyof typeof counts);
              }}
              className={cn(
                "flex items-center gap-2 h-[54px] px-5 uppercase text-white text-opacity-60 text-xs font-medium border-black z-10 cursor-pointer",
                t.key === active &&
                  "text-opacity-100 bg-zinc-950 rounded-tl-[10px] rounded-tr-[10px] border-l border-r border-t border-neutral-700 backdrop-blur-2xl",
                !counts[t.key as keyof typeof counts] && "cursor-not-allowed"
              )}
            >
              {t.icon && (
                <Icon
                  name={t.icon}
                  className={cn(
                    `w-5 h-5 min-w-5 text-${t.color}`,
                    t.key === "failed" && "rotate-45 relative"
                  )}
                />
              )}
              {t.title}
              <span className="text-white text-opacity-100">
                {counts[t.key as keyof typeof counts]}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
};
