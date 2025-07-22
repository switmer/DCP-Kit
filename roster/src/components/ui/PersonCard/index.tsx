"use client";
import React, { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "../Avatar";
import { Button } from "../Button";
import { Card, CardContent, CardFooter, CardHeader } from "../Card";
import { LoadingIndicator } from "../LoadingIndicator";
import { Icon } from "../Icon";
import { parse, format, addHours, addMinutes } from "date-fns";
import axios from "axios";
import { parsePhoneNumber } from "react-phone-number-input";
import { cn } from "@/lib/utils";
import { useCallSheetStore } from "@/store/callsheet";
import { Database } from "@/types/supabase";
import { CallSheetMemberType } from "@/types/type";

export interface Person {
  call_time: string;
  department: string;
  email: string;
  location: string;
  name: string;
  phone: string;
  title: string;
  id: string;
  status: Database["public"]["Enums"]["CallSheetMemberStatus"];
  sent_at?: string;
  confirmed_at?: string;
}

type Props = {
  // contactInfoVisible: boolean;
  person: CallSheetMemberType;
  onClick: () => void;
  isHistorical: boolean;
  generalCall?: string;
};

export const PersonCard: React.FC<Props> = ({
  // contactInfoVisible,
  person,
  onClick,
  isHistorical,
  generalCall,
}) => {
  const [sent, setSent] = useState(person.status === "sent-call-card");
  const [loading, setLoading] = useState(false);

  const onSendClick = () => {
    setLoading(true);

    axios.get(`/sms/call-card/${person.id}`).then(() => {
      setSent(true);
      setLoading(false);
    });
  };

  const initials = useMemo(() => {
    const words = person?.name?.split(" ") ?? [];

    let initials = "";

    for (const word of words) {
      if (word.length > 0) {
        initials += word[0]?.toUpperCase();
      }
    }

    return initials;
  }, [person.name]);

  const { callPush } = useCallSheetStore();

  const time = useMemo(() => {
    try {
      const parsedTime = parse(
        !!person.call_time ? person.call_time : generalCall ?? "",
        "h:mm a",
        new Date()
      );

      const formattedTime = format(parsedTime, "h:mmaaaaa");

      return formattedTime;
    } catch {
      return person?.call_time;
    }
  }, [generalCall, person.call_time]);

  const callTime = useMemo(() => {
    if (!time || !callPush) return time;

    try {
      const originalTime = parse(time, "h:mmaaaaa", new Date());

      let newTime = addHours(originalTime, callPush.hours ?? 0);
      newTime = addMinutes(newTime, callPush.minutes ?? 0);

      return format(newTime, "h:mmaaaaa");
    } catch (error) {
      return time;
    }
  }, [time, callPush]);

  const phone = useMemo(() => {
    if (!person.phone) return;
    const parsedPhone = parsePhoneNumber(person.phone, "US");

    return parsedPhone?.formatNational();
  }, [person.phone]);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-6 min-h-[286px] flex flex-col justify-between cursor-pointer",
        person.status === "confirmed" && "!bg-lime-300 !bg-opacity-5"
      )}
      variant={person.status === "confirmed" ? "default" : "outline"}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-0">
        <p className="font-label font-medium uppercase text-sm">
          {person.title ?? person.department?.replaceAll("_", " ")}
        </p>
        <div className="flex items-center gap-1">
          {!!callPush && time !== callTime ? (
            <>
              <p className="font-mono text-sm line-through">{time}</p>
              <p className="font-mono text-lg">{callTime}</p>
            </>
          ) : (
            <p className="font-mono text-lg">{callTime}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 mt-10 flex flex-col justify-end gap-1">
        <Avatar>
          <AvatarFallback>
            <span>{initials}</span>
          </AvatarFallback>
        </Avatar>

        <h3 className="text-2xl font-bold">{person.name}</h3>

        {phone && (
          <a className="text-sm font-label" href={`tel:${person.phone}`}>
            {phone}
          </a>
        )}

        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="text-xs text-opacity-90 text-white font-label"
          >
            {person.email}
          </a>
        )}

        <CardFooter className="p-0">
          {person.status === "confirmed" ? (
            <Button
              variant={"outline"}
              className="w-full font-500 flex items-center jutify-center gap-2 text-sm mt-6 pointer-events-none"
              size={"compact"}
            >
              <Icon name="checkmark" className="w-5 h-5" />
              Confirmed
            </Button>
          ) : (
            <>
              {!isHistorical && (
                <>
                  {sent ? (
                    <Button
                      variant={"secondary"}
                      className="w-full font-medium text-sm mt-6 gap-1 pointer-events-none"
                      size={"compact"}
                    >
                      <Icon name="checkmark" className="w-5 h-5 text-white" />
                      Sent
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full font-medium text-sm mt-6"
                      size={"compact"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendClick();
                      }}
                    >
                      {loading ? (
                        <LoadingIndicator size="small" />
                      ) : (
                        "Send call card"
                      )}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </CardFooter>
      </CardContent>
    </Card>
  );
};
