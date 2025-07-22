"use client";

import { FC, useEffect, useState } from "react";
import { Empty } from "./Empty";
import { CrewingSetup } from "./Setup";
import { useCrewingStore } from "@/store/crewing";
import { createClient } from "@/lib/supabase/client";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Positions } from "./Positions";
import { CrewingPositionType } from "@/types/type";
import { Sidebar } from "./Sidebar";

export const CrewingContent: FC<{
  project?: string;
  type?: string | null;
}> = ({ project, type }) => {
  const [openSetup, setOpenSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const {
    setProject,
    setRequiredPositions,
    requiredPositions,
    setCrewingPositions,
    setSettingCrewFor,
    fetchPositions,
  } = useCrewingStore();

  const [forcedStage, setForcedStage] = useState<
    "positions" | "crew" | "options" | null
  >(null);
  const [subscribedToChanges, setSubscribedToChanges] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setCrewingPositions(requiredPositions);
  }, [requiredPositions]);

  useEffect(() => {
    if (!project) return;

    setProject(project);
    setLoading(true);

    fetchPositions().then(() => {
      setLoading(false);
    });

    return () => {
      setProject(null);
      setRequiredPositions([]);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  useEffect(() => {
    if (!requiredPositions.length || subscribedToChanges) return;

    supabase
      .channel("crewing_contact_attempt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crewing_contact_attempt",
          filter: `position=in.(${requiredPositions
            .map((p) => p.id)
            .join(",")})`,
        },
        () => {
          fetchPositions();
        }
      )
      .subscribe();
    setSubscribedToChanges(true);
  }, [fetchPositions, requiredPositions, subscribedToChanges, supabase]);

  if (loading) {
    return (
      <div className="inline-flex max-w-fit py-10">
        <LoadingIndicator size="medium" />
      </div>
    );
  }

  return (
    <>
      {!requiredPositions.some((p) => !!p.id) ? (
        <Empty
          onStart={() => setOpenSetup(true)}
          setForcedStage={setForcedStage}
          type={type}
        />
      ) : (
        <Positions
          openSetup={(c?: CrewingPositionType) => {
            if (!c) return;

            setSettingCrewFor(c);
            setForcedStage("options");
            setOpenSetup(true);
          }}
        />
      )}

      <CrewingSetup
        open={openSetup}
        setOpen={setOpenSetup}
        setForcedStage={setForcedStage}
        forcedStage={forcedStage}
      />

      <Sidebar
        openSetup={(c?: CrewingPositionType) => {
          if (!c) return;
          setSettingCrewFor(c);
          setForcedStage("options");
          setOpenSetup(true);
        }}
      />
    </>
  );
};
