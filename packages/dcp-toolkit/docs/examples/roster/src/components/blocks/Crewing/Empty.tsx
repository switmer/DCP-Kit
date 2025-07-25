"use client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import React from "react";
import { MoreOptions } from "@/components/blocks/Crewing/MoreOptions";
import { StartFromTemplate } from "@/components/blocks/Crewing/StartFromTemplate";

export const Empty: React.FC<{
  onStart: () => void;
  setForcedStage: (stage: "positions" | "crew" | "options" | null) => void;
  type?: string | null;
}> = ({ onStart, setForcedStage, type }) => {
  if (!type) return <></>;
  return (
    <div className="bg-dashboard-empty-gradient rounded-3xl flex flex-col gap-3 p-12 backdrop-blur-md max-sm:p-4 mt-8">
      <Icon name="users" className="w-12 h-12 text-lime-300" />

      <div className="flex-col justify-start gap-2 flex">
        <div className="text-white text-4xl font-normal leading-tight">
          Crewing up, made easy.
        </div>

        <div className="text-white text-opacity-75 text-base font-normal leading-tight">
          Track all your crew needs, key department heads, and automate
          availability checks, holds & follow ups.
        </div>

        {/* top section -- wizard/buttons */}
        <div className="flex flex-wrap gap-3 mt-6 max-sm:flex-col">
          <Button
            onClick={onStart}
            variant="accent"
            className="h-[68px] text-lg font-semibold gap-2 rounded-2xl hover:bg-lime-300/100"
          >
            <Icon name="wizard-sparkle" className="w-5 h-5 text-black" />
            <div>Setup Wizard</div>
          </Button>

          <Button
            onClick={onStart}
            variant={"outlineAccentAlt"}
            className="h-[68px] text-lg font-semibold gap-2 rounded-2xl hover:bg-lime-300/15"
          >
            <Icon name="fileAdd" className="w-5 h-5 text-accent" />
            <div>Start from scratch</div>
          </Button>

          <Button
            onClick={() => null}
            variant={"outlineAccentAlt"}
            className="h-[68px] text-lg font-semibold gap-2 rounded-2xl hover:bg-lime-300/15"
          >
            <Icon name="fileAdd" className="w-5 h-5 text-accent" />
            <div>Start from previous project</div>
          </Button>

          <Button
            onClick={() => null}
            variant={"outlineAccentAlt"}
            className="h-[68px] text-lg font-semibold gap-2 rounded-2xl hover:bg-lime-300/15"
          >
            <Icon name="fileAdd" className="w-5 h-5 text-accent" />
            <div>Start from a call sheet or crew list</div>
          </Button>
        </div>

        {/* rule */}
        <div className="w-full border-b-[.5px] border-lime-300/50 pt-5 mb-3" />

        {/* middle section -- templates */}
        <StartFromTemplate
          onStart={onStart}
          setForcedStage={setForcedStage}
          type={type}
        />
        {/* bottom section -- more options */}
        <MoreOptions />
      </div>
    </div>
  );
};
