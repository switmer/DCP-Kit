import { Button } from "@/components/ui/Button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { toast } from "sonner";
import { useProjectStore } from "@/store/project";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, compareAsc, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import React from "react";
import { CrewMember } from ".";

export const DaysWorking = ({
  open,
  onClose,
  checkedIds,
  data,
  onUpdate,
}: {
  open: boolean;
  checkedIds: number[];
  onClose: () => void;
  data: CrewMember[];
  onUpdate: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<
    { short_id: string | null; date: string | null; id: string }[]
  >([]);
  const { project } = useProjectStore();
  const supabase = createClient();

  const selectedCrew = useMemo(() => {
    return data.filter((c) => checkedIds.includes(c.id));
  }, [data, checkedIds]);

  /* ATM we can only select one crew member here */
  const [daysToAdd, setDaysToAdd] = useState<string[]>([]);
  const [daysToRemove, setDaysToRemove] = useState<string[]>([]);

  const fetchSheets = useCallback(() => {
    if (!project) return;

    supabase
      .from("call_sheet")
      .select("short_id, date, id")
      .eq("project", project)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Something went wrong");
          setLoading(false);
          return;
        }

        if (data) {
          setSheets(data);
        }

        setLoading(false);
      });
  }, [project, supabase]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets, project]);

  const sortedSheets = useMemo(() => {
    return [...sheets].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return compareAsc(parseISO(a.date), parseISO(b.date));
    });
  }, [sheets]);

  const handleSave = useCallback(async () => {
    setLoading(true);

    const membersToCreate: {
      call_sheet: string;
      project: string | null;
      project_position: number;
      crew_member?: number | null;
    }[] = [];
    const membersToDelete: string[] = [];

    try {
      selectedCrew.forEach((c) => {
        const days =
          c.call_sheet_member?.map((csm) => {
            return {
              call_sheet_member: csm?.id,
              ...csm?.call_sheet,
            };
          }) ?? [];

        daysToAdd.forEach((d) => {
          const day = days.find((s) => s?.id === d);

          if (!day) {
            membersToCreate.push({
              call_sheet: d,
              project: project,
              project_position: c.id,
              crew_member: c.project_member?.crew?.id,
            });
          }
        });

        daysToRemove.forEach((d) => {
          const day = days.find((s) => s?.id === d);

          if (day) {
            membersToDelete.push(day.call_sheet_member);
          }
        });
      });

      if (membersToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("call_sheet_member")
          .delete()
          .in("id", membersToDelete);

        if (deleteError) {
          toast.error("Failed to remove days");
          return;
        }
      }

      if (daysToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("call_sheet_member")
          .insert(membersToCreate);

        if (insertError) {
          toast.error("Failed to add days");
          return;
        }
      }

      toast.success("Work days updated successfully");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error("Something went wrong updating work days");
    } finally {
      setLoading(false);
    }
  }, [
    selectedCrew,
    daysToAdd,
    onUpdate,
    onClose,
    daysToRemove,
    project,
    supabase,
  ]);

  useEffect(() => {
    if (!open) {
      setDaysToAdd([]);
      setDaysToRemove([]);
    }
  }, [open]);

  const calculateDays = useCallback(
    (c: CrewMember) => {
      const days =
        c.call_sheet_member?.map((csm) => ({
          ...csm?.call_sheet,
          status: "existing",
        })) ?? [];

      daysToAdd.forEach((d) => {
        if (days?.find((s) => s.id === d)) return;

        const day = sheets.find((s) => s.id === d);

        if (day) {
          days.push({
            ...day,
            status: "new",
          });
        }
      });

      daysToRemove.forEach((d) => {
        const day = days.find((s) => s.id === d);

        if (day) {
          day.status = "removed";
        }
      });

      return days;
    },
    [daysToAdd, daysToRemove, sheets]
  );

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-full w-[1024px] gap-0">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Assing Work Days</DialogTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>
        <div className="flex min-h-[300px]">
          <div className="flex-1 flex flex-col border-r gap-2 border-zinc-900 py-4 px-6">
            <div className="text-white text-opacity-50 text-sm font-medium font-label uppercase tracking-wide">
              Select dates
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-3">
              <div className="text-sm font-medium text-white/200">
                Updating 2 crew members
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  className="px-2"
                  onClick={() => {
                    const allSheetIds = sheets.map((sheet) => sheet.id);
                    setDaysToAdd(allSheetIds);
                    setDaysToRemove([]);
                  }}
                >
                  Select All Days
                </Button>
                <Button
                  className="px-2"
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setDaysToAdd([]);
                    setDaysToRemove([]);
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {sortedSheets.map((sheet) => (
                <div
                  className={cn(
                    "cursor-pointer p-3 flex gap-2 font-medium text-white text-base bg-opacity-5 rounded-[12px] bg-white"
                  )}
                  key={sheet.short_id}
                >
                  <div className="flex gap-2 items-center justify-between flex-1">
                    <div className="flex gap-2 items-center">
                      {sheet.date
                        ? format(new Date(sheet.date), "EEE, MMM do")
                        : ""}{" "}
                      <span className="text-white/50 text-xs">Shoot Day</span>
                    </div>

                    <div className="h-7 border-white/20 border rounded-xl w-[84px] flex items-center overflow-hidden">
                      <div
                        className="flex-1 h-7 flex items-center justify-center hover:bg-white/10"
                        onClick={() => {
                          setDaysToAdd((prev) =>
                            prev.filter((id) => id !== sheet.id)
                          );
                          setDaysToRemove((prev) =>
                            prev.filter((id) => id !== sheet.id)
                          );
                        }}
                      >
                        <Icon
                          name="circle"
                          className="w-4 h-4 text-white fill-none"
                        />
                      </div>
                      <div
                        className={cn(
                          "flex-1 border-white/20 border-l h-7 flex items-center justify-center hover:bg-emerald-500/10 hover:text-emerald-500 text-white/50",
                          daysToAdd.includes(sheet.id) &&
                            "bg-emerald-500/20 text-emerald-500"
                        )}
                        onClick={() => {
                          setDaysToAdd((prev) => [...prev, sheet.id]);
                          setDaysToRemove((prev) =>
                            prev.filter((id) => id !== sheet.id)
                          );
                        }}
                      >
                        <Icon name="plus" className="w-4 h-4 text-current" />
                      </div>
                      <div
                        className={cn(
                          "flex-1 h-7 flex items-center justify-center border-white/20 border-l hover:bg-red-500/10 hover:text-red-500 text-white/50",
                          daysToRemove.includes(sheet.id) &&
                            "bg-red-500/20 text-red-500"
                        )}
                        onClick={() => {
                          setDaysToAdd((prev) =>
                            prev.filter((id) => id !== sheet.id)
                          );
                          setDaysToRemove((prev) => [...prev, sheet.id]);
                        }}
                      >
                        <Icon name="minus" className="w-4 h-4 text-current" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex gap-2 flex-col py-4 px-6">
            <div className="text-white text-opacity-50 text-sm font-medium font-label uppercase tracking-wide">
              Preview changes
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {selectedCrew.map((c) => {
                const days = calculateDays(c);

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "cursor-pointer p-3 flex gap-2 font-medium text-white text-base bg-opacity-5 rounded-[12px] bg-white justify-center flex-col"
                    )}
                  >
                    <div className="flex items-center justify-between flex-1 gap-2">
                      <div className="flex items-center gap-2">
                        {!!c.project_member && (
                          <span className={cn("text-sm font-medium")}>
                            {c.project_member?.name}
                          </span>
                        )}
                        <span className="text-base text-white/50">
                          {c.title}
                        </span>
                      </div>
                      {days?.some(
                        (d) => d.status === "new" || d.status === "removed"
                      ) && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                          Will change
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-xs font-medium bg-zinc-800 px-1.5 py-0.5 rounded">
                        {days?.length}d
                      </div>
                      {!!days?.length && (
                        <span className="text-zinc-400">·</span>
                      )}
                      {days?.map((d, index) => {
                        if (!d?.date)
                          return <React.Fragment key={d?.id}></React.Fragment>;

                        return (
                          <div
                            key={d?.id}
                            className={cn(
                              "text-zinc-400 text-xs",
                              d.status === "new" && "text-emerald-500",
                              d.status === "removed" &&
                                "text-white/40 line-through"
                            )}
                          >
                            {format(new Date(d?.date), "MMM do")}
                            {index !== days?.length - 1 && ","}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center">
          <div className="flex gap-2 flex-1 w-full justify-end">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={() => {
                onClose();
              }}
            >
              Cancel
            </Button>

            <Button
              className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              variant="accent"
              size="compact"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
