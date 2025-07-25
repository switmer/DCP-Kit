import React, { useEffect, useState } from "react";
import { AddPositions } from "../AddPositions";
import { SetOptions } from "../SetOptions";
import { SetOptionsFor } from "../SetOptionsFor";

export const CrewingSetup: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  setForcedStage?: (stage: "positions" | "crew" | "options" | null) => void;
  forcedStage?: "positions" | "crew" | "options" | null;
}> = ({ open, setOpen, setForcedStage, forcedStage }) => {
  const [stage, setStage] = useState<"positions" | "crew" | "options">(
    forcedStage ?? "positions"
  );

  useEffect(() => {
    if (forcedStage) setStage(forcedStage);
  }, [open]);

  const close = () => {
    setOpen(false);
    setStage("positions");
    setForcedStage && setForcedStage(null);
  };

  return (
    <>
      <AddPositions
        open={open && stage === "positions"}
        setStage={setStage}
        onClose={close}
      />
      <SetOptions
        setStage={setStage}
        open={open && stage === "crew"}
        onClose={close}
      />
      <SetOptionsFor
        setStage={setStage}
        open={open && stage === "options"}
        onClose={close}
      />
    </>
  );
};
