import { Icon } from "@/components/ui/Icon";
import React, { FC } from "react";
import { UserInfo } from "@/components/blocks/Dashboard/WelcomeSectionTop/UserInfo";
import { CompanyStats } from "@/components/blocks/Dashboard/WelcomeSectionTop/CompanyStats";
import { Today } from "@/components/blocks/Dashboard/WelcomeSectionTop/Today";
import { CompanyCrewMemberType } from "@/types/type";

type Props = {
  crewCount?: number;
  newCrewCount?: number;
  vendorCount?: number;
  clientCount?: number;
  projectCount?: number;
  jobsThisYearCount?: number;
  loading: boolean;
};

export const WelcomeSectionTop: FC<Props> = (props) => {
  return (
    <div className="flex flex-col justify-center items-center pt-10">
      <Icon
        name="logo-motif"
        className="z-0 hidden h-[60px] w-[60px] text-lime-300 mb-[70px] max-sm:block"
      />

      <div className="z-30">
        <UserInfo mobile />
      </div>

      <CompanyStats
        mobile
        crewCount={props.crewCount}
        newCrewCount={props.newCrewCount}
        projectCount={props.projectCount}
        jobsThisYearCount={props.jobsThisYearCount}
        loading={props.loading}
      />

      <Today mobile />
    </div>
  );
};
