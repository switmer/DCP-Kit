"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { createClient } from "@/lib/supabase/client";
import { formatDateRange } from "@/lib/utils";
import { Database } from "@/types/supabase";
import {
  CompanyCrewMemberType,
  CompanyType,
  CrewingContactAttempt,
  CrewingPositionCrew,
  CrewingPositionType,
  ProjectType,
} from "@/types/type";
import axios from "axios";
import {
  format,
  parse,
  formatDistanceToNowStrict,
  parseISO,
  differenceInMinutes,
  isToday,
  formatDistanceToNow,
} from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";

export type CrewingContactAttemptWithRelations =
  Database["public"]["Tables"]["crewing_contact_attempt"]["Row"] & {
    crewing_position_crew:
      | (CrewingPositionCrew & {
          crew: CompanyCrewMemberType & {
            company: CompanyType;
          };
        })
      | null;
    crewing_position:
      | (CrewingPositionType & {
          project: ProjectType;
        })
      | null;
  };

interface Props {
  data: CrewingContactAttemptWithRelations;
}

export const Availability: React.FC<Props> = ({ data: d }) => {
  const supabase = createClient();
  const [data, setData] = useState(d);

  const dates = useMemo(() => {
    const arrDates = data.crewing_position?.project?.dates ?? [];
    if (arrDates.length === 0) {
      return "";
    }

    const parsedDates = arrDates
      .map((date) => parse(date, "MM/dd/yy", new Date()))
      .sort((a, b) => a.getTime() - b.getTime());

    const startDate = parsedDates[0];
    const endDate = parsedDates[parsedDates.length - 1];

    if (parsedDates.length === 1) {
      return format(startDate, "EEE, MMM d");
    }

    const formattedStartDate = format(startDate, "EEE, MMM d");
    const formattedEndDate = format(endDate, "EEE, MMM d");

    if (startDate.getTime() === endDate.getTime()) {
      return formattedStartDate;
    }

    return `${formattedStartDate} -> ${formattedEndDate}`;
  }, [data.crewing_position?.project?.dates]);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDeadline = useMemo(() => {
    if (!data.response_deadline) return "No deadline set";
    const deadline = parseISO(`${data.response_deadline}Z`);
    if (deadline < now) return "Deadline passed";

    const diffInSeconds = Math.floor(
      (deadline.getTime() - now.getTime()) / 1000
    );
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);

    return `${hours}h${minutes.toString().padStart(2, "0")}m`;
  }, [data.response_deadline, now]);

  const formattedCreatedAt = useMemo(() => {
    if (!data.created_at) return "";
    const createdAt = parseISO(`${data.created_at}Z`);

    if (isToday(createdAt)) {
      return `${formatDistanceToNow(createdAt, {
        addSuffix: true,
      })} at ${format(createdAt, "h:mma")}`;
    }
    return format(createdAt, "MMM d 'at' h:mma");
  }, [data.created_at]);

  const respond = useCallback(async (confirm = false) => {
    const status = confirm ? "confirmed" : "declined";

    await axios
      .post(`/avail/respond`, {
        status,
        id: data.id,
      })
      .then(() => {
        setData((prev) => ({
          ...prev,
          status,
        }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 flex justify-center">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <div className="flex gap-2 flex-col pb-3">
          <div className="text-sm font-bold uppercase text-white text-opacity-50 tracking-wide">
            {data.crewing_position_crew?.crew?.company?.name}
          </div>
          <div className="text-white text-[38px] font-normal leading-none">
            {data.crewing_position?.project.name}
          </div>
        </div>
        <Card className="rounded-3xl bg-card-gradient px-6 py-4 gap-4 flex flex-col">
          <div className="flex flex-col gap-[6px]">
            <div className="text-white text-base opacity-50 font-semibold font-primary">
              Position
            </div>
            <div className="text-white text-[42px] font-semibold leading-10">
              {data.crewing_position?.position}
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="text-white text-base opacity-50 font-semibold font-primary">
              Dates
            </div>
            <div className="text-[22px] font-medium leading-snug font-primary">
              {dates}
            </div>
          </div>
          <div className="flex gap-2 justify-between">
            {["contacted", "pending"].includes(data.status) ? (
              <>
                <Button
                  variant="accent"
                  size={"compact"}
                  className="rounded-[48px] flex-1 gap-3"
                  onClick={() => respond(true)}
                >
                  <Icon name="lightning" className="w-[18px] h-[18px]" />
                  I’m Available
                </Button>
                <Button
                  variant="outline"
                  size={"compact"}
                  className="rounded-[48px] flex-1"
                  onClick={() => respond(false)}
                >
                  Not Available
                </Button>
              </>
            ) : (
              <>
                {data.status === "confirmed" && (
                  <div className="text-white text-[28px] font-normal leading-10 flex gap-2 items-center">
                    <Icon name="check" className="text-accent w-8 h-8" />
                    Confirmed
                  </div>
                )}
                {data.status === "declined" && (
                  <div className="text-white text-[28px] font-normal leading-10 flex gap-2 items-center">
                    <Icon name="cross" className="text-red-400 w-8 h-8" />
                    Declined
                  </div>
                )}
                {data.status === "no_response" && (
                  <div className="text-white text-[28px] font-normal leading-10 flex gap-2 items-center">
                    <Icon
                      name="cross"
                      className="text-white text-opacity-50 w-8 h-8"
                    />
                    Request expired
                  </div>
                )}
              </>
            )}
          </div>
          {["contacted", "pending", "no_response"].includes(data.status) && (
            <div className="flex flex-col gap-[6px]">
              <div className="text-white uppercase text-sm opacity-50 font-bold">
                Time to reply
              </div>
              <div className="text-white text-[38px] font-normal leading-10 flex items-center gap-3 w-fit">
                {formattedDeadline}
                <div className="flex-1 flex text-sm text-white text-opacity-40 items-center gap-3 leading-none">
                  {formattedDeadline !== "Deadline passed" && (
                    <div className="max-w-8">
                      <LoadingIndicator size="small" className="!w-8 !h-8" />
                    </div>
                  )}
                  Sent to you
                  <br />
                  {formattedCreatedAt}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
