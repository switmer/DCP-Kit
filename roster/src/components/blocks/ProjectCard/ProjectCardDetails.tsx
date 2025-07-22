import React, { FC } from "react";
import { ProjectType } from "@/types/type";
import { formatDateRange } from "@/lib/utils";

type Props = {
  project: ProjectType;
};

export const ProjectCardDetails: FC<Props> = (props) => {
  return (
    <div className="flex items-center">
      <div
        // onClick={() => setModalOpen(true)}
        className="flex flex-col w-full gap-1 mt-3 cursor-pointer"
      >
        <div className="text-white text-base font-medium leading-tight">
          Project
        </div>

        <div className="flex items-center justify-center w-full text-white text-[38px] font-normal font-sans leading-10 cursor-pointer">
          {props.project.name}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {props.project.budget && (
            <div className="flex flex-col gap-1 items-center rounded-xl bg-zinc-900 p-3">
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {"Budget"}
              </div>

              <div className="text-sm">{props.project.budget}</div>
            </div>
          )}

          {props.project.dates?.[0] && (
            <div className="flex flex-col gap-1 items-center rounded-xl bg-zinc-900 p-3">
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {"Shoot days"}
              </div>

              <div className="text-sm">
                {formatDateRange(props.project.dates)}
              </div>
            </div>
          )}

          {props.project.prep_dates?.[0] && (
            <div className="flex flex-col gap-1 items-center rounded-xl bg-zinc-900 p-3">
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {"Prep days"}
              </div>

              <div className="text-sm">
                {formatDateRange(props.project.prep_dates)}
              </div>
            </div>
          )}

          {props.project.post_dates?.[0] && (
            <div className="flex flex-col gap-1 items-center rounded-xl bg-zinc-900 p-3">
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {"Edit/Post days"}
              </div>

              <div className="text-sm">
                {formatDateRange(props.project.post_dates)}
              </div>
            </div>
          )}

          {props.project.type && (
            <div className="flex flex-col gap-1 items-center rounded-xl bg-zinc-900 p-3">
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {"Type"}
              </div>

              <div className="text-sm">{props.project.type}</div>
            </div>
          )}

          {props.project.status && (
            <div className="flex flex-col gap-1 items-center rounded-xl bg-zinc-900 p-3">
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {"Status"}
              </div>

              <div className="text-sm">{props.project.status}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
