import React, { FC } from "react";
import { DaysAway } from "@/components/blocks/Dashboard/ThisWeek/DaysAway";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useRouter } from "next-nprogress-bar";
import {
  CallSheetLocationType,
  CallSheetMemberType,
  CallSheetType,
  CrewingContactAttempt,
  CrewingPositionCrew,
  CrewingPositionType,
  LocationType,
  ProjectType,
} from "@/types/type";

type Props = {
  project: ProjectType & {
    call_sheet?: CallSheetType[] | null;
    call_sheet_member?: CallSheetMemberType[] | null;
    members?: any[];
    membersCount?: number | null;
    callSheet?: string | null;
    callSheetId?: string | null;
    callSheetDate?: string | null;
    historical?: boolean | null;
    day_of_days?: string | null;
    callSheetMembers?: CallSheetMemberType[] | null;
  };
  sheet: CallSheetType & {
    call_sheet_member?: CallSheetMemberType[] | null;
    call_sheet_location?:
      | (Omit<CallSheetLocationType, "location">[] & {
          location: LocationType | null;
        })
      | null;
    day_of_days?: string | null;
  };
  crewingPositions?: CrewingPositionType[];
  stagedCrew?: CrewingPositionCrew[];
  contactedCrew?: CrewingContactAttempt[];
};

export const ProjectSheetCard: FC<Props> = (props) => {
  const router = useRouter();

  const callSheetMembers = props.sheet.call_sheet_member ?? [];
  const crewingPositions = props.crewingPositions ?? [];
  // const stagedCrew = props.stagedCrew ?? [];
  const contactedCrew = props.contactedCrew ?? [];

  let confirmedCount = 0;
  let pendingCount = 0;
  let unsentCount = 0;

  if (callSheetMembers.length > 0 && !crewingPositions.length) {
    confirmedCount =
      callSheetMembers.filter((m) => m.status === "confirmed").length ?? 0;
    // confirmedCount = 5;

    pendingCount =
      callSheetMembers.filter(
        (m) => m.status === "pending" || m.status === "sent-call-card"
      ).length ?? 0;
    // pendingCount = 6;

    unsentCount = callSheetMembers.filter((m) => m.status === null).length ?? 0;
    // unsentCount = 7;
  }

  if (crewingPositions.length > 0 && !callSheetMembers.length) {
    //-- counting all position quantities as "unsent" just for a total.
    // crewingPositions.map(
    //   (el, i) => el.quantity && (unsentCount += el.quantity)
    // );
    unsentCount += crewingPositions.length;

    contactedCrew.map((c) => {
      if (c.status === "no_response" || c.status === "declined") {
        unsentCount -= 1;
      }

      if (c.status === "pending" || c.status === "contacted") {
        pendingCount += 1;
        unsentCount -= 1;
      }

      if (c.status === "confirmed") {
        confirmedCount += 1;
        unsentCount -= 1;
      }
    });

    // pendingCount += stagedCrew.length;
    // unsentCount -= stagedCrew.length;
  }

  const totalCount = confirmedCount + pendingCount + unsentCount;

  const confirmedPercentage = totalCount
    ? Math.ceil((confirmedCount / totalCount) * 100)
    : 0;

  const pendingPercentage = totalCount
    ? Math.ceil((pendingCount / totalCount) * 100)
    : 0;

  const unsentPercentage = totalCount
    ? Math.ceil((unsentCount / totalCount) * 100)
    : 0;

  const sumPercentages =
    unsentPercentage + pendingPercentage + confirmedPercentage <= 100
      ? unsentPercentage + pendingPercentage + confirmedPercentage
      : 100;

  // const renderSheetLocation = () => {
  //   if (
  //     !props.sheet.call_sheet_location ||
  //     props.sheet.call_sheet_location.length === 0
  //   ) {
  //     return "No associated locations";
  //   }
  //
  //   console.log(
  //     "props.sheet.call_sheet_location: ",
  //     props.sheet.call_sheet_location
  //   );
  //
  //   const sheetLocations = props.sheet.call_sheet_location;
  //
  //   const shootLocations = sheetLocations.filter((l) => {
  //     if (l.type === "shoot" || l.type === "shoot location") return l;
  //   });
  //
  //   // return shootLocations[0].
  //
  //   console.log("shootLocations: ", shootLocations);
  //
  //   //@ts-ignore
  //   const placesJson = JSON.parse(shootLocations[0].location.places_json);
  //
  //   const city =
  //     //@ts-ignore
  //     placesJson.address_components.filter((c: any) =>
  //       c.types.includes("locality")
  //     )[0].long_name;
  //
  //   const state =
  //     //@ts-ignore
  //     placesJson.address_components.filter((c: any) =>
  //       c.types.includes("administrative_area_level_1")
  //     )[0].short_name;
  //
  //   //@ts-ignore
  //   return city + ", " + state;
  // };

  const renderSheetLocation = () => {
    const { call_sheet_location } = props.sheet;

    //-- if no associated locations, return.
    if (!call_sheet_location || call_sheet_location.length === 0) {
      return;
    }

    const shootLocations = call_sheet_location.filter(
      (location) =>
        location.type === "shoot" || location.type === "shoot location"
    );

    //-- if no shoot locations found, return.
    if (shootLocations.length === 0) {
      return;
    }

    const primaryLocation = shootLocations[0];
    //@ts-ignore
    const placesJson = primaryLocation.location?.places_json
      ? //@ts-ignore
        JSON.parse(primaryLocation.location.places_json)
      : null;

    //-- handle missing or malformed placesJson.
    if (!placesJson || !placesJson.address_components) {
      return;
    }

    const getAddressComponent = (type: string) =>
      placesJson.address_components.find((component: any) =>
        component.types.includes(type)
      );

    const city = getAddressComponent("locality");
    const state = getAddressComponent("administrative_area_level_1");

    //-- return city, state if available.
    return `${city.long_name}, ${state.short_name}`;
  };

  return (
    <>
      <div
        key={props.project.id}
        className="group/card flex flex-col gap-2 min-w-[350px] w-[350px] p-[18px] border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl cursor-pointer max-sm:rounded-2xl max-sm:min-w-[290px] max-sm:w-[290px] hover:border-opacity-20"
        onClick={async () => {
          if (!props.sheet) {
            router.push(`/project/${props.project.slug ?? props.project.id}`);
            return;
          }

          router.push(`/sheet/${props.sheet.short_id}`);
        }}
      >
        <div className="flex items-center justify-between">
          <DaysAway callSheetDate={props.sheet.date as string} />

          <div
            className="group/go-to-project hidden items-center gap-2 cursor-pointer group-hover/card:flex max-sm:flex"
            onClick={async () => {
              if (!props.sheet) {
                router.push(
                  `/project/${props.project.slug ?? props.project.id}`
                );
                return;
              }

              router.push(`/sheet/${props.sheet.short_id}`);
            }}
          >
            <div className="text-[13px] font-medium text-white/60 group-hover/go-to-project:text-white/100">
              Go to sheet
            </div>
            <Icon
              name="arrow-out"
              className="w-2 h-2 text-white/60 group-hover/go-to-project:text-white/100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-lg text-white font-medium">
            {format(props.sheet.date as string, "eee, MMM dd")}
          </div>

          {
            props.project.day_of_days && (
              <div className="h-[28px] rounded-md px-2 py-1 bg-[rgba(37,43,18,0.44)]">
                <div className="text-sm font-bold">
                  {props.sheet.day_of_days}
                </div>
              </div>
            )
            //   : (
            //   <Button
            //     variant="accent"
            //     className={cn(
            //       "flex items-center h-[28px] text-[13px] text-[#121212] font-medium rounded-md cursor-pointer",
            //       true && "opacity-40 cursor-default hover:opacity-40"
            //     )}
            //     onClick={() => console.log("upload sheet clicked")}
            //     disabled
            //   >
            //     Upload sheet
            //   </Button>
            // )
          }
        </div>

        {props.project.name && (
          <>
            {props.project.name.length < 16 ? (
              <>
                <div className="hidden items-center justify-between max-sm:flex">
                  <div className="text-3xl font-medium py-[18px]">
                    {props.project.name}
                  </div>
                </div>

                <div className="flex items-center justify-between max-sm:hidden">
                  <div className="text-3xl font-medium">
                    {props.project.name}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-3xl font-medium">{props.project.name}</div>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between">
          {/*<div className="">{project.location}</div>*/}
          <div className="text-[14px] font-medium uppercase text-white/50 min-h-[21px]">
            {renderSheetLocation()}
          </div>
        </div>

        {/* projects that are in crewing stage. */}
        {props.crewingPositions && props.crewingPositions.length > 0 && (
          <>
            {/* progress bars */}
            <div className="relative w-full py-3">
              {/* unsent progress bar */}
              <div
                className="absolute top-1 left-0 h-[10px] rounded-full bg-crewing-pattern"
                style={{
                  width: sumPercentages > 0 ? `${sumPercentages}%` : "100%",
                }}
              />

              {/* pending progress bar */}
              <div
                className="absolute top-1 left-0 h-[10px] rounded-full bg-lime-900"
                style={{
                  width:
                    pendingPercentage + confirmedPercentage <= 100
                      ? `${pendingPercentage + confirmedPercentage}%`
                      : "100%",
                }}
              />

              {/* confirmed progress bar */}
              <div
                className="absolute top-1 left-0 h-[10px] rounded-full bg-lime-300"
                style={{ width: `${confirmedPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon name="checkmark" className="w-4 h-4 text-lime-300" />
                <div className="text-xs font-medium uppercase text-lime-300">
                  Confirmed
                </div>
              </div>

              <div className="flex items-center gap-1">
                {confirmedCount > 0 && (
                  <Icon name="checkmark" className="w-4 h-4 text-lime-300" />
                )}
                <div
                  className={cn(
                    "text-[15px] text-zinc-500",
                    confirmedCount > 0 && "font-bold text-lime-300"
                  )}
                >
                  {confirmedCount ?? "--"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon name="clock" className="w-4 h-4 text-zinc-500" />
                <div className="text-xs font-medium uppercase text-zinc-500">
                  In-Progress
                </div>
              </div>

              <div className="text-[15px] text-zinc-500">
                {pendingCount ?? "--"}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon
                  name="circle-dotted"
                  className="w-3 h-3 mx-[2px] text-zinc-500"
                />
                <div className="text-xs font-medium uppercase text-zinc-500">
                  Open Positions
                </div>
              </div>

              <div className="text-[15px] text-zinc-500">
                {unsentCount ?? "--"}
              </div>
            </div>
          </>
        )}

        {props.sheet && (
          <>
            {/* progress bars */}
            <div className="relative w-full py-3">
              {/* unsent progress bar */}
              <div
                className="absolute top-1 left-0 h-[10px] rounded-full bg-crewing-pattern"
                style={{
                  width: sumPercentages > 0 ? `${sumPercentages}%` : "100%",
                }}
              />

              {/* pending progress bar */}
              <div
                className="absolute top-1 left-0 h-[10px] rounded-full bg-lime-900"
                style={{
                  width:
                    pendingPercentage + confirmedPercentage <= 100
                      ? `${pendingPercentage + confirmedPercentage}%`
                      : "100%",
                }}
              />

              {/* confirmed progress bar */}
              <div
                className="absolute top-1 left-0 h-[10px] rounded-full bg-lime-300"
                style={{ width: `${confirmedPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon name="checkmark" className="w-4 h-4 text-lime-300" />
                <div className="text-xs font-medium uppercase text-lime-300">
                  Confirmed
                </div>
              </div>

              <div className="flex items-center gap-1">
                {confirmedCount > 0 && (
                  <Icon name="checkmark" className="w-4 h-4 text-lime-300" />
                )}
                <div
                  className={cn(
                    "text-[15px] text-zinc-500",
                    confirmedCount > 0 && "font-bold text-lime-300"
                  )}
                >
                  {confirmedCount ?? "--"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon name="clock" className="w-4 h-4 text-zinc-500" />
                <div className="text-xs font-medium uppercase text-zinc-500">
                  No Response Yet
                </div>
              </div>

              <div className="text-[15px] text-zinc-500">
                {pendingCount ?? "--"}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon
                  name="circle-dotted"
                  className="w-3 h-3 mx-[2px] text-zinc-500"
                />
                <div className="text-xs font-medium uppercase text-zinc-500">
                  Unsent
                </div>
              </div>

              <div className="text-[15px] text-zinc-500">
                {unsentCount ?? "--"}
              </div>
            </div>
          </>
        )}

        {/* no project or call sheet. */}
        {!props.sheet && !props.crewingPositions && (
          <div className="flex flex-col h-full items-center justify-center rounded-2xl">
            <Icon name="user" className="w-8 h-8 text-zinc-500" />

            <div className="flex flex-col justify-center items-center px-0">
              <div className="text-center text-white font-bold leading-normal pb-[1px]">
                No crew information.
              </div>

              <div className="text-center text-white text-opacity-75 text-[13px] font-normal leading-tight pb-[12px]">
                You have not yet assigned any crew to this project.
              </div>

              <Button
                variant="accent"
                className={cn(
                  "flex items-center h-[28px] text-[13px] text-[#121212] font-medium rounded-md cursor-pointer",
                  true && "opacity-40 cursor-default hover:opacity-40"
                )}
                onClick={() => {}}
                disabled
              >
                Upload sheet
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
