import { useCrewingStore } from "@/store/crewing";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export const Navigation = () => {
  const [loading, setLoading] = useState(false);
  const {
    focusCrewingPosition: fcp,
    setFocusCrewingPosition,
    requiredPositions,
    fetchPositions,
  } = useCrewingStore();

  const focusCrewingPosition = useMemo(() => {
    return requiredPositions.find((p) => p.id === fcp?.id) ?? fcp;
  }, [fcp, requiredPositions]);

  const currentIndex = useMemo(() => {
    return requiredPositions.findIndex(
      (position) => position.id === focusCrewingPosition?.id
    );
  }, [requiredPositions, focusCrewingPosition]);

  const move = useCallback(
    (back = false) => {
      const nextIndex = back ? currentIndex - 1 : currentIndex + 1;
      setFocusCrewingPosition(requiredPositions[nextIndex]);
    },
    [requiredPositions, currentIndex, setFocusCrewingPosition]
  );

  const startAutomatedDispatch = useCallback(() => {
    if (!focusCrewingPosition) return;
    setLoading(true);

    const { crewing_position_crew, id } = focusCrewingPosition;

    fetch(`/project/automate-dispatch`, {
      method: "POST",
      body: JSON.stringify({
        crew: crewing_position_crew?.[0]?.id,
        crew_member_id: crewing_position_crew?.[0]?.crew,
        position: id,
        priority: 0,
      }),
    })
      .then((res) => {
        return res.json();
      })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        }
        fetchPositions();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchPositions, focusCrewingPosition]);

  const stopAutomatedDispatch = useCallback(() => {
    if (!focusCrewingPosition) return;
    setLoading(true);

    const { id } = focusCrewingPosition;

    fetch(`/project/automate-dispatch/stop`, {
      method: "POST",
      body: JSON.stringify({
        position: id,
      }),
    })
      .then((res) => {
        return res.json();
      })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        }
        fetchPositions();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchPositions, focusCrewingPosition]);

  return (
    <div className="flex gap-2 max-sm:flex-col">
      <Button
        disabled={currentIndex === 0}
        size={"medium"}
        onClick={() => move(true)}
        variant="outline"
        className="px-0 w-[50px] justify-center hover:bg-white hover:bg-opacity-5 duration-150 disabled:pointer-events-none disabled:opacity-50 max-sm:hidden"
      >
        <Icon name="arrow-left" className="w-6 h-6 fill-none" />
      </Button>
      {focusCrewingPosition?.hiring_status && (
        <>
          <Button
            disabled={
              loading || focusCrewingPosition.hiring_status === "completed"
            }
            onClick={() =>
              focusCrewingPosition.hiring_status === "in_progress"
                ? stopAutomatedDispatch()
                : startAutomatedDispatch()
            }
            size="medium"
            variant={
              focusCrewingPosition.hiring_status === "in_progress"
                ? "outline"
                : "accent"
            }
            className={cn(
              "px-4 duration-150 text-base font-semibold gap-[2px] max-sm:min-h-[50px] flex-1",
              loading && "pointer-events-none opacity-90",
              focusCrewingPosition.hiring_status === "in_progress" &&
                "bg-lime-300 bg-opacity-10 hover:bg-opacity-15 border-white border-opacity-10",
              focusCrewingPosition.hiring_status === "completed" && "opacity-50"
            )}
          >
            {loading ? (
              <div className="w-6">
                <LoadingIndicator
                  className="w-6 h-6"
                  size="small"
                  dark={focusCrewingPosition.hiring_status !== "in_progress"}
                  accent={focusCrewingPosition.hiring_status === "in_progress"}
                />
              </div>
            ) : (
              <Icon
                name={
                  focusCrewingPosition.hiring_status === "in_progress"
                    ? "stop"
                    : "send"
                }
                className={cn(
                  "w-6 h-6 fill-none",
                  focusCrewingPosition.hiring_status === "in_progress" &&
                    "text-accent"
                )}
              />
            )}
            {focusCrewingPosition.hiring_status === "in_progress"
              ? "Stop"
              : "Start"}{" "}
            Automated Dispatch
          </Button>
        </>
      )}
      <Button
        disabled={currentIndex === requiredPositions.length - 1}
        onClick={() => move()}
        size={"medium"}
        variant="outline"
        className="px-4 hover:bg-white hover:bg-opacity-5 justify-center duration-150 font-semibold text-sm gap-[2px] disabled:pointer-events-none disabled:opacity-50"
      >
        Next
        <Icon name="arrow-left" className="w-6 h-6 fill-none rotate-180" />
      </Button>
    </div>
  );
};
