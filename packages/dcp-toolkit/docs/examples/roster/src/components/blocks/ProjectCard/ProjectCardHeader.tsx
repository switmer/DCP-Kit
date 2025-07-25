import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import React from "react";
import { View } from "@/components/blocks/CallCard";
import { cn } from "@/lib/utils";
import { ProjectCardView } from "@/components/blocks/ProjectCard/index";

type Props = {
  action?: React.ReactNode;
  view?: ProjectCardView;
  callback: (view: ProjectCardView) => void;
};

export const ProjectCardHeader: React.FC<Props> = (props) => {
  return (
    <div className="mb-8 flex items-center justify-between sm:sticky top-6 sm:top-12 z-10">
      {props.view !== "project" ? (
        <div
          onClick={() =>
            props.callback(props.view === "profile" ? "crew" : "project")
          }
          className={cn(
            "flex items-center group cursor-pointer",
            props.view === "crew" && "max-sm:hidden"
          )}
        >
          <Icon
            name="chevron"
            className="w-5 h-5 ml-2 text-zinc-600 rotate-180 group-hover:text-white duration-100"
          />
          <div className="text-lg ml-3">Back</div>
        </div>
      ) : (
        <Link
          href="/"
          className="max-sm:hidden flex gap-1 sm:gap-[10px] items-center"
        >
          <Icon
            name="logo-motif"
            className="w-[22px] h-[22px] sm:w-8 sm:h-8 text-accent"
          />
          <Icon
            name="logo-text"
            className="w-[66px] h-[25px] sm:w-[94px] sm:h-[35px]"
          />
        </Link>
      )}

      {/*{props.action}*/}
    </div>
  );
};
