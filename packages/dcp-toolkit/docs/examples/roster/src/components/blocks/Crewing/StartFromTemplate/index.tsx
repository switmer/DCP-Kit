import { TemplateCard } from "@/components/blocks/Crewing/StartFromTemplate/TemplateCard";
import React, { FC, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

type Props = {
  onStart: () => void;
  setForcedStage: (stage: "positions" | "crew" | "options" | null) => void;
  type: string;
};

export const StartFromTemplate: FC<Props> = (props) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProjectType, setSelectedProjectType] = useState<string>(
    props.type
  );
  const projectTypes = [
    "Commercial",
    "Documentary",
    "Film",
    "Live Event",
    "Music Video",
    "TV Movie",
    "TV Series",
  ];

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="text-white text-2xl font-normal leading-tight py-2">
          Or start from a template
        </div>

        <div className="flex items-center justify-center gap-1 w-[135px] h-[30px] rounded-2xl bg-lime-300/10 font-bold text-lime-300/70">
          <DropdownMenu
            open={showDropdown}
            onOpenChange={() => setShowDropdown(!showDropdown)}
          >
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="flex justify-center items-center"
            >
              <div className="text-[12px]">{selectedProjectType}</div>
              <Icon
                name="chevron-small"
                className="relative top-[1px] w-6 h-6 rotate-90"
              />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                side="bottom"
                align="start"
                hideWhenDetached
                className="w-[290px] max-h-[600px] p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10"
              >
                {projectTypes.map((type, i) => {
                  return (
                    <DropdownMenuItem
                      key={type + i}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSelectedProjectType(type);
                      }}
                      className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm focus:text-lime-300/90"
                    >
                      <div>{type}</div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex [@media(max-width:1050px)]:flex-wrap gap-3 max-sm:gap-3">
        <TemplateCard
          onStart={props.onStart}
          setForcedStage={props.setForcedStage}
          // type=""
          size="rungun"
        />
        <TemplateCard
          onStart={props.onStart}
          setForcedStage={props.setForcedStage}
          // type=""
          size="medium"
        />
        <TemplateCard
          onStart={props.onStart}
          setForcedStage={props.setForcedStage}
          // type=""
          size="large"
        />
        <TemplateCard
          onStart={props.onStart}
          setForcedStage={props.setForcedStage}
          // type=""
          size="full"
        />
      </div>
    </>
  );
};
