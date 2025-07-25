"use client";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Search } from "../../CrewTable/Search";
import { useCrewStore, useSearchPositions } from "@/store/crew";
import { useCrewingStore } from "@/store/crewing";
import { cn, filterPositions, groupByDepartments } from "@/lib/utils";
import { Position } from "@/rules/positions";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";
import { createClient } from "@/lib/supabase/client";
import {
  CompanyCrewMemberType,
  CrewingPositionCrew,
  PositionType,
  RankType,
} from "@/types/type";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useCompanyStore } from "@/store/company";

export const SetOptions: React.FC<{
  open?: boolean;
  onClose: () => void;
  setStage: Dispatch<SetStateAction<"crew" | "positions" | "options">>;
}> = ({ open, onClose, setStage }) => {
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = React.useState("");
  const {
    requiredPositions,
    settingCrewFor,
    crewingPositions,
    project,
    setRequiredPositions,
    setSettingCrewFor,
    setCrewingPositions,
  } = useCrewingStore();
  const { search: searchPositions } = useSearchPositions();
  const [loading, setLoading] = useState<boolean>();
  const [ranks, setRanks] = useState<RankType | null>(null);
  const [crew, setCrew] = useState<
    (CompanyCrewMemberType & { position: PositionType[] })[]
  >([]);

  const supabase = createClient();

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const groupedAndFiltered = useMemo(() => {
    const targetRules = requiredPositions
      .map((p) => searchPositions(p.position ?? ""))
      .filter((p) => !!p);

    return groupByDepartments(
      filterPositions(targetRules as Position[], search?.trim())
    );
  }, [requiredPositions, search, searchPositions]);

  useEffect(() => {
    setCrewingPositions(requiredPositions);
  }, [groupedAndFiltered]);

  const foundPosition = useMemo(() => {
    if (!settingCrewFor?.position) return null;

    return searchPositions(settingCrewFor?.position);
  }, [searchPositions, settingCrewFor?.position]);

  const { activeCompany } = useCompanyStore();

  const fetchCrew = async () => {
    if (!user || !settingCrewFor?.position) return;

    setLoading(true);

    const crewToSearch = [
      foundPosition?.position ?? settingCrewFor?.position,
      ...(foundPosition?.aliases ?? []),
    ];

    let query = supabase
      .from("company_crew_member")
      .select("*, position(*)")
      .eq("company", activeCompany as string)
      .or(
        crewToSearch.map((r) => `name.eq.${r.toLocaleLowerCase()}`).join(", "),
        { foreignTable: "position" }
      );

    if (!!search) {
      query = query.like("tfs", `%${search?.toLocaleLowerCase()}%`);
    }

    const { data, error } = await query;

    await supabase
      .from("rank")
      .select()
      .eq("company", activeCompany as string)
      .eq(
        "role",
        (foundPosition?.position ?? settingCrewFor?.position)?.toLowerCase()
      )
      .then(({ data }) => {
        setRanks(data?.[0] ?? null);
      });

    if (error) {
      setLoading(false);
      toast.error(error.message);
    }

    setCrew(data || []);
  };

  const getRankings = async () => {
    //-- REMARK: move from front-end to an endpoint?

    if (!crewingPositions) return;

    const { data, error } = await supabase
      .from("rank")
      .select("*")
      .eq("company", activeCompany as string);

    if (error) {
      setLoading(false);
      toast.error(error.message);
    }

    if (!data) return;

    return data;
  };

  const fillPositionsFromRankings = async (rankings: any[]) => {
    if (!rankings || !crewingPositions) {
      setStage("crew");
      setRefresh(true);

      return;
    }

    const positionNameToIdMap = crewingPositions.reduce(
      (acc: { [key: string]: number }, pos) => {
        acc[pos.position?.toLowerCase() as string] = pos.id;

        return acc;
      },
      {}
    );

    const allCrewSelections: {
      crewing_position: number;
      crew: number;
      priority: number;
    }[] = [];

    for (const member of rankings) {
      const positionId = positionNameToIdMap[member.role.toLowerCase()];

      if (positionId !== undefined) {
        await member.crew.map((id: number, i: number) => {
          if (i >= 4) return;

          const memberId = id;

          if (memberId !== undefined) {
            allCrewSelections.push({
              crewing_position: positionId,
              crew: memberId,
              priority: i,
            });
          }
        });
      }
    }

    const filteredCrewSelections = allCrewSelections.filter(
      (selection) => selection !== undefined
    ) as CrewingPositionCrew[];

    if (!filteredCrewSelections.length) {
      setLoading(false);

      setStage("crew");

      return;
    }

    try {
      const insertPromises = filteredCrewSelections.map((c) =>
        supabase.from("crewing_position_crew").insert(c)
      );

      const results = await Promise.all(insertPromises);

      const failedInserts = results.filter(({ error }) => error);

      if (failedInserts.length > 0) {
        failedInserts.forEach(({ error }) => {
          console.error("Failed to insert crew:", error);
          toast.error("Failed to insert some crew. Please try again.");
        });

        setLoading(false);

        return;
      }

      setLoading(false);

      setStage("crew");
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      toast.error("An unexpected error occurred. Please try again.");

      if (!!error) {
        toast.error("Something went wrong. Please try again.");
        setLoading(false);
      }
    }
  };

  const handleClickAutoFill = async () => {
    setLoading(true);

    //-- get all crew members and then setCrew();
    await fetchCrew();

    //-- get all roles that have ranked crew members.
    const rankings = await getRankings();

    if (!rankings) return;

    //-- fill positions with each of the highest ranked members returned.
    await fillPositionsFromRankings(rankings);

    const { data, error } = await supabase
      .from("crewing_position")
      .select(
        `
            *,
            crewing_position_crew!crewing_position_crew_crewing_position_fkey(*)
          `
      )
      .eq("project", project!);

    if (!data || !!error) {
      console.error("Error: ", error);
      toast.error("Something went wrong. Please try again.");

      setLoading(false);

      return;
    }

    setRequiredPositions(data);

    setLoading(false);
  };

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
      <DialogContent className="max-w-[800px] w-[800px] gap-0">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items center gap-2 items-center">
                <button
                  className="w-10 h-10 flex items-center justify-center"
                  onClick={() => setStage("positions")}
                >
                  <Icon
                    name="arrow-left"
                    className="text-accent w-full h-full"
                  />
                </button>
                Set crew options
              </div>
            </DialogTitle>

            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex justify-between items-center w-full h-[60px] px-7 bg-[#151515]">
          <div className="font-bold">
            Already set your hiring order / ranks?
          </div>

          <button
            disabled={loading}
            onClick={() => handleClickAutoFill()}
            className={cn(
              "flex items-center w-[220px] h-[40px] bg-[#202020] gap-2 px-3 rounded-xl cursor-pointer hover:bg-[#303030]"
            )}
          >
            {loading ? (
              <LoadingIndicator size="small" />
            ) : (
              <>
                <Icon name="wizard-sparkle" className="w-5 h-5 text-lime-300" />
                <div>Auto-fill crew options</div>
              </>
            )}
          </button>
        </div>

        <div className="px-6 max-h-[550px] flex flex-col overflow-hidden gap-2">
          <div className="pt-4">
            <Search
              search={search}
              setSearch={setSearch}
              placeholder={"Search positions, departments..."}
            />
          </div>

          <div className="flex gap-2 flex-1 flex-col overflow-auto w-full pb-6">
            <div className="flex justify-between items-center text-stone-300 text-opacity-60 text-base font-normal px-2">
              <span>Positions Needed</span>
              <span>Add Crew Options</span>
            </div>

            {Object.entries(groupedAndFiltered).map(
              ([department, positions]) => (
                <div key={department} className="flex gap-2 flex-col">
                  <div className="text-white p-2 pb-0 text-opacity-50 text-sm font-bold font-label uppercase tracking-wide">
                    {department}
                  </div>

                  {positions.map((position) => {
                    const found = requiredPositions.find(
                      (p) => p.position === position.position
                    );
                    const options = found?.crewing_position_crew;
                    const completed =
                      (options?.length ?? 0) > (found?.quantity ?? 0);

                    return (
                      <div
                        className="flex justify-between items-center gap-2 px-2 py-1"
                        key={position.position}
                      >
                        <div className="flex gap-2 items-center">
                          <div
                            className={cn(
                              "flex gap-1 items-center",
                              completed && "opacity-50"
                            )}
                          >
                            <span className="text-white text-opacity-70 text-lg">
                              {found?.quantity}
                            </span>
                            <Icon
                              name="cross"
                              className="w-3 h-3 text-white opacity-30"
                            />

                            <span className="text-white text-lg font-bold">
                              {position.position}
                            </span>
                          </div>

                          {completed && (
                            <Icon
                              name="checkmark"
                              className="w-5 h-5 text-lime-300"
                            />
                          )}
                        </div>

                        <div className="items-center flex">
                          {options?.length ? (
                            <div
                              onClick={() => {
                                setSettingCrewFor(found);
                                setStage("options");
                              }}
                              className="cursor-pointer h-[28px] px-2 bg-lime-300 bg-opacity-10 rounded-md justify-center items-center flex text-lime-300 text-lg font-semibold"
                            >
                              {options.length} option
                              {options.length > 1 ? "s" : ""}
                            </div>
                          ) : (
                            <Button
                              variant={"secondary"}
                              size={"small"}
                              className="gap-1 px-2 font-normal bg-white bg-opacity-5 hover:bg-opacity-[.1]"
                              onClick={() => {
                                setSettingCrewFor(found);
                                setStage("options");
                              }}
                            >
                              <Icon
                                name="plus-circle"
                                className="w-4 h-4 text-white text-opacity-60"
                              />
                              Select Crew
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
            variant="outline"
            size="compact"
            onClick={onClose}
          >
            Continue to project dashboard
          </Button>

          <Button
            className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
            variant="accent"
            size="compact"
            onClick={onClose}
          >
            Start crew selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
