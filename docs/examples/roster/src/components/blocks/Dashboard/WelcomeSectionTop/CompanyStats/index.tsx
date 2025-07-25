import { FC } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import uuid from "tus-js-client/lib.esm/uuid";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRouter } from "next-nprogress-bar";

type Props = {
  mobile?: boolean;
  crewCount?: number;
  newCrewCount?: number;
  castCount?: number;
  vendorCount?: number;
  clientCount?: number;
  jobsThisYearCount?: number;
  projectCount?: number;
  loading: boolean;
};

export const CompanyStats: FC<Props> = (props) => {
  const router = useRouter();

  if (props.loading && !props.mobile) {
    return (
      <div className={cn("flex items-center w-full h-[70px] gap-3")}>
        <div className="flex flex-col gap-2 w-[125px] h-[80px] px-5 py-3 bg-white bg-opacity-[0.02] border border-white border-opacity-10 backdrop-blur-2xl rounded-xl">
          <Skeleton className="relative top-[2px] w-full h-3" />
          <Skeleton className="relative top-[2px] w-[35px] h-[26px]" />
        </div>
      </div>
    );
  }

  const additionalTag = (count: number) => {
    return (
      <Tooltip content={`${count} crew added in last 30 days`} key={uuid()}>
        <div className="flex items-center justify-center w-[26px] h-[18px] ml-[3px] rounded-3xl bg-lime-300/15">
          <div className="text-xs text-lime-300">{`+${count}`}</div>
        </div>
      </Tooltip>
    );
  };

  if (props.mobile) {
    const renderMobileStatCard = (
      title: string,
      count?: number,
      additionalCount?: number
    ) => {
      return (
        <div
          onClick={() => {
            if (title === "crew") {
              router.push("/crew");
            }
          }}
          className="flex flex-col justify-center items-center w-[23%] h-[90px] rounded-xl bg-black/40"
        >
          <div className="flex items-center">
            <div className={count ? "text-3xl" : "text-xl py-1"}>
              {count !== 0 ? count : "--"}
            </div>

            {additionalCount && additionalTag(additionalCount)}
          </div>

          <div className="text-[11px] text-stone-400">
            {title.toUpperCase()}
          </div>
        </div>
      );
    };

    return (
      <div className="flex justify-center items-center w-full h-[70px] mb-7 gap-3">
        {renderMobileStatCard(
          "crew",
          props.crewCount,
          props.newCrewCount !== 0 ? (props.newCrewCount as number) : undefined
        )}
        {/*{renderMobileStatCard("vendors", props.vendorCount)}*/}
        {/*{renderMobileStatCard("clients", props.clientCount)}*/}
        {renderMobileStatCard("jobs", props.jobsThisYearCount)}
      </div>
    );
  }

  if (!props.mobile) {
    const renderStatCard = (
      title: string,
      count?: number,
      additionalCount?: number
    ) => {
      return (
        <div
          onClick={() => {
            if (title === "crew") {
              router.push("/crew");
            }
          }}
          className={cn(
            "flex flex-col min-w-[110px] h-[80px] px-5 py-3 bg-white bg-opacity-[0.02] border border-white border-opacity-10 backdrop-blur-2xl rounded-xl",
            title === "crew" && "cursor-pointer hover:border-opacity-20"
          )}
        >
          <div className="text-[11px] text-white">{title.toUpperCase()}</div>

          <div className="flex items-center">
            <div className={count ? "text-3xl" : "text-xl py-1 text-zinc-600"}>
              {count !== 0 ? count : "--"}
            </div>

            {additionalCount && additionalTag(additionalCount)}
          </div>
        </div>
      );
    };

    return (
      <div
        className={cn(
          "flex items-center w-full h-[70px] gap-3"
          // props.mobile && "hidden"
        )}
      >
        {renderStatCard(
          "crew",
          props.crewCount,
          props.newCrewCount !== 0 ? (props.newCrewCount as number) : undefined
        )}
        {/*{renderStatCard("cast", props.castCount)}*/}
        {/*{renderStatCard("vendors", props.clientCount)}*/}
        {/*{renderStatCard("clients/agencies", props.projectCount)}*/}
        {renderStatCard("jobs this year", props.jobsThisYearCount)}
      </div>
    );
  }
};
