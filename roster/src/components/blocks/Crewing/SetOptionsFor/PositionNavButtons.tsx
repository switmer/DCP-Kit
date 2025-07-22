import { Icon } from "@/components/ui/Icon";
import React, { FC, useEffect, useState } from "react";
import { truncatePositionName } from "@/components/blocks/Crewing/SetOptionsFor/util/truncatePositionName";
import { useCrewingStore } from "@/store/crewing";

type Props = {
  currentIndex: number;
  setCurrentIndex: (n: number) => void;
};

export const PositionNavButtons: FC<Props> = (props) => {
  const [index, setIndex] = useState(0);

  const { crewingPositions } = useCrewingStore();

  useEffect(() => {
    setIndex(props.currentIndex);
  }, [props.currentIndex]);

  const getButtonPosition = (type: string) => {
    if (
      crewingPositions === null ||
      crewingPositions === undefined ||
      !crewingPositions[0]
    ) {
      return type;
    }

    switch (type) {
      case "prev":
        if (index - 1 >= 0) {
          return (
            truncatePositionName(
              crewingPositions[index - 1].position as string
            ) ?? type
          );
        }

        return (
          truncatePositionName(
            crewingPositions[crewingPositions.length - 1].position as string
          ) ?? type
        );

      case "next":
        if (index + 1 > crewingPositions.length - 1) {
          return (
            truncatePositionName(crewingPositions[0].position as string) ?? type
          );
        }

        return (
          truncatePositionName(
            crewingPositions[index + 1].position as string
          ) ?? type
        );
    }
  };

  const handlePrev = () => {
    if (!crewingPositions) return;

    if (index > 0) {
      props.setCurrentIndex(index - 1);
    } else {
      props.setCurrentIndex(crewingPositions.length - 1);
    }
  };

  const handleNext = () => {
    // if (!index) return;
    if (!crewingPositions) return;

    if (index < crewingPositions.length - 1) {
      props.setCurrentIndex(index + 1);
    } else {
      props.setCurrentIndex(0);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handlePrev()}
        className="w-[160px] h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-20 border border-zinc-500/80 hover:bg-opacity-100 duration-100 pl-2 pr-5"
      >
        <Icon name="arrow-left" className="w-8 h-8 text-zinc-400 rotate-90" />
        <div className="font-bold">{getButtonPosition("prev")}</div>
      </button>

      <button
        onClick={() => handleNext()}
        className="w-[160px] h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-20 border border-zinc-500/80 hover:bg-opacity-100 duration-100 pl-5 pr-2"
      >
        <div className="font-bold">{getButtonPosition("next")}</div>
        <Icon name="arrow-left" className="w-8 h-8 text-zinc-400 -rotate-90" />
      </button>
    </div>
  );
};
