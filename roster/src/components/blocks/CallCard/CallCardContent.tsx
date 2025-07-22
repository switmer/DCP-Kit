import React from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/Card";
import {
  CallSheetMemberType,
  CallSheetType,
  CompanyType,
  PushCall,
} from "@/types/type";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Icon } from "@/components/ui/Icon";

interface CallCardContentProps {
  sheet: CallSheetType;
  member: CallSheetMemberType;
  date: string;
  time?: string | null;
  callTime?: string;
  callPush?: PushCall | null;
  isPreview?: boolean;
  onConfirm?: () => void;
  loading?: boolean;
  submitted?: boolean;
  company: CompanyType;
}

export const CallCardContent: React.FC<CallCardContentProps> = ({
  sheet,
  member,
  date,
  time,
  callTime,
  callPush,
  isPreview = false,
  company,
  onConfirm,
  loading,
  submitted,
}) => {
  return (
    <Card className="!bg-zinc-900/30">
      <CardHeader className="pb-4">
        <p className="text-white/50 uppercase text-sm tracking-[1px]">
          {company.name}
        </p>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="justify-between items-center mb-2 hidden sm:flex">
          <p className="text-pink-50 text-[22px] font-medium">{date}</p>
          <div className="text-xs flex items-center justify-center h-[26px] px-[10px] bg-foreground bg-opacity-5 rounded">
            {/* @ts-ignore */}
            {sheet.raw_json?.day_of_days}
          </div>
        </div>

        <h1 className="text-[38px] leading-10 mb-6">
          {/* @ts-ignore */}
          {sheet.raw_json?.job_name}
        </h1>

        <div className="flex flex-col gap-3">
          {!!callPush && (
            <div className="flex items-center gap-2">
              <div className="h-5 uppercase px-1 flex justify-center items-center bg-[rgba(249,44,44,0.14)] leading-none text-[#FF3F3F] text-sm font-medium rounded-[5px]">
                Call pushed{" "}
                {[
                  callPush.hours && `+${callPush.hours}HR`,
                  callPush.minutes && `${callPush.minutes}M`,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </div>
              {callTime !== time && (
                <div className="text-[rgba(255,255,255,0.6)] text-sm line-through font-medium leading-none">
                  {time}
                </div>
              )}
            </div>
          )}
          <p className="text-pink-50 text-[95px] sm:text-[99px] leading-[75px] font-medium mb-4 max-sm:text-[60px]">
            {callTime || time}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[22px] font-medium leading-1">
          <div className="flex items-center font-medium justify-center rounded-lg px-1.5 text-xs h-[22px] bg-white bg-opacity-20">
            {member.title
              ?.split(" ")
              .map((t: string) => t[0])
              .join("")}
          </div>
          {member.title}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant={
            isPreview ? "accent" : submitted || loading ? "secondary" : "accent"
          }
          className="w-full flex items-center jutify-center gap-2 font-500"
          size={"compact"}
          onClick={onConfirm}
          disabled={isPreview}
        >
          {isPreview ? (
            "Confirm call"
          ) : loading ? (
            <LoadingIndicator size="small" />
          ) : submitted ? (
            <>
              <Icon name="checkmark" className="w-5 h-5" />
              Confirmed
            </>
          ) : (
            "Confirm Call"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
