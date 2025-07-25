"use client";

import { ProjectType } from "@/types/type";
import { parse, format, differenceInDays, isBefore } from "date-fns";
import React, { useMemo, useState } from "react";
import { EditProjectDetails } from "@/components/blocks/Crewing/EditProjectDetails";
import { useRouter } from "next-nprogress-bar";
import { formatDate } from "date-fns/format";
import { cn } from "@/lib/utils";

function formatDateRange(dates: string[]) {
  if (dates.length === 0) {
    return "";
  }

  const parsedDates = dates
    .map((date) => parse(date, "MM/dd/yy", new Date()))
    .sort((a, b) => a.getTime() - b.getTime());

  const startDate = parsedDates[0];
  const endDate = parsedDates[parsedDates.length - 1];

  if (parsedDates.length === 1) {
    return format(startDate, "MMM d");
  }

  const formattedStartDate = format(startDate, "MMM d");
  const formattedEndDate = format(endDate, "MMM d");

  if (startDate.getTime() === endDate.getTime()) {
    return formattedStartDate;
  }

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${formattedStartDate} - ${format(endDate, "d")}`;
  }

  return `${formattedStartDate} - ${formattedEndDate}`;
}

export const CrewingProjectInfo: React.FC<{
  data: ProjectType;
}> = ({ data }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const formattedNow = formatDate(new Date(), "MM/dd/yy");

  const weeksUntilShoot =
    data.dates &&
    data.dates.length > 0 &&
    isBefore(formattedNow, data.dates[0]) &&
    Math.floor(differenceInDays(data.dates[0], formattedNow) / 7);
  const daysUntilShoot =
    data.dates &&
    data.dates.length > 0 &&
    isBefore(formattedNow, data.dates[0]) &&
    differenceInDays(data.dates[0], formattedNow) % 7;

  const router = useRouter();

  //-- time until shoot for mobile.
  const timeUntilShoot = {
    label: "Time Until Shoot",
    value:
      (weeksUntilShoot || daysUntilShoot) &&
      `${weeksUntilShoot ? weeksUntilShoot + "w" : ""} ${
        daysUntilShoot ? daysUntilShoot + "d" : ""
      }`,
  };

  //-- group the information items.
  const dateItems = useMemo(
    () => [
      {
        label: "Pre-Pro Days",
        value: !data?.prep_dates?.length ? (
          <button className="opacity-50 text-white text-sm font-normal">
            + Add dates
          </button>
        ) : (
          formatDateRange(data?.prep_dates)
        ),
      },
      {
        label: "Shoot Days",
        value: !data?.dates?.length ? (
          <button className="opacity-50 text-white text-sm font-normal">
            + Add dates
          </button>
        ) : (
          formatDateRange(data.dates)
        ),
      },
      {
        label: "Post Days",
        value: !data?.post_dates?.length ? (
          <button className="opacity-50 text-white text-sm font-normal">
            + Add dates
          </button>
        ) : (
          formatDateRange(data?.post_dates)
        ),
      },
    ],
    [data]
  );

  const otherItems = [
    {
      label: "Budget",
      value: !data?.budget ? (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add budget
        </button>
      ) : (
        <div className="text-white/80 text-[15px] font-medium">
          {"$" + data?.budget}
        </div>
      ),
    },
    {
      label: "Type",
      value: data.type ? (
        <div className="h-[18px] px-1.5 bg-zinc-800 rounded-md justify-center items-center gap-2 inline-flex text-lime-300 text-[10px] font-medium">
          {data?.type}
        </div>
      ) : (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add type
        </button>
      ),
    },
    {
      label: "Status",
      value: data.status ? (
        <div className="h-[18px] px-1.5 bg-zinc-800 rounded-md justify-center items-center gap-2 inline-flex text-lime-300 text-[10px] font-medium">
          {data?.status}
        </div>
      ) : (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add status
        </button>
      ),
    },
  ];

  //-- all items for desktop view.
  const allItems = [
    {
      label: "Time Until Shoot",
      value:
        (weeksUntilShoot || daysUntilShoot) &&
        `${weeksUntilShoot ? weeksUntilShoot + "w" : ""} ${
          daysUntilShoot ? daysUntilShoot + "d" : ""
        }`,
    },
    {
      label: "Budget",
      value: !data?.budget ? (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add budget
        </button>
      ) : (
        <div className="text-white/80 text-[15px] font-medium">
          {"$" + data?.budget}
        </div>
      ),
    },
    {
      label: "Shoot Days",
      value: !data?.dates?.length ? (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add dates
        </button>
      ) : (
        formatDateRange(data.dates)
      ),
    },
    {
      label: "Pre-Pro Days",
      value: !data?.prep_dates?.length ? (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add dates
        </button>
      ) : (
        formatDateRange(data?.prep_dates)
      ),
    },
    {
      label: "Post Days",
      value: !data?.post_dates?.length ? (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add dates
        </button>
      ) : (
        formatDateRange(data?.post_dates)
      ),
    },
    {
      label: "Type",
      value: data.type ? (
        <div className="h-[18px] px-1.5 bg-zinc-800 rounded-md justify-center items-center gap-2 inline-flex text-lime-300 text-[10px] font-medium">
          {data?.type}
        </div>
      ) : (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add type
        </button>
      ),
    },
    {
      label: "Status",
      value: data.status ? (
        <div className="h-[18px] px-1.5 bg-zinc-800 rounded-md justify-center items-center gap-2 inline-flex text-lime-300 text-[10px] font-medium">
          {data?.status}
        </div>
      ) : (
        <button className="opacity-50 text-white text-sm font-normal">
          + Add status
        </button>
      ),
    },
  ];

  return (
    <>
      <h1
        onClick={() => setModalOpen(true)}
        className="text-white text-[38px] font-normal font-sans mt-4 mb-3 cursor-pointer max-sm:text-[28px] max-sm:px-6"
      >
        {data?.name}
      </h1>

      {/* desktop view */}
      <div className="flex gap-5 items-center sm:flex sm:flex-row max-sm:hidden">
        {allItems.map((item, index) => {
          if (!item.value) return null;

          return (
            <div
              key={index}
              onClick={() => setModalOpen(true)}
              className="flex flex-col gap-1 cursor-pointer"
            >
              <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                {item.label}
              </div>

              <div
                className={cn(
                  item.label.toLowerCase() === "time until shoot" &&
                    "text-lime-300"
                )}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* mobile view */}
      <div className="flex-col gap-4 w-full px-6 hidden max-sm:flex">
        {/* time until shoot */}
        {timeUntilShoot.value && (
          <div className="flex justify-center items-center w-full mb-2">
            <div
              onClick={() => setModalOpen(true)}
              className="flex flex-col gap-1 cursor-pointer text-center"
            >
              <div className="opacity-60 text-white/opacity-70 text-[12px] uppercase tracking-tight font-medium">
                {timeUntilShoot.label}
              </div>

              <div className="text-lime-300 text-[20px] font-bold">
                {timeUntilShoot.value}
              </div>
            </div>
          </div>
        )}

        {/* date items */}
        <div className="flex justify-evenly items-center w-full">
          {dateItems.map((item, index) => {
            if (!item.value) return null;

            return (
              <div
                key={index}
                onClick={() => setModalOpen(true)}
                className="flex flex-col gap-1 cursor-pointer text-center"
              >
                <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                  {item.label}
                </div>

                <div>{item.value}</div>
              </div>
            );
          })}
        </div>

        {/* other items */}
        <div className="flex justify-evenly items-center w-full">
          {otherItems.map((item, index) => {
            if (!item.value) return null;

            return (
              <div
                key={index}
                onClick={() => setModalOpen(true)}
                className="flex flex-col gap-1 cursor-pointer text-center"
              >
                <div className="opacity-60 text-white/opacity-70 text-[11px] uppercase tracking-tight">
                  {item.label}
                </div>

                <div>{item.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      <EditProjectDetails
        open={modalOpen}
        close={() => setModalOpen(false)}
        project={data}
        refreshCallback={() => {
          router.replace(`/project/${data.slug}`);
        }}
        onUpdate={() => {
          /* TEMP fix */
          router.refresh();
        }}
      />
    </>
  );
};
