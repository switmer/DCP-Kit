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
  CSSProperties,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search } from "../../CrewTable/Search";
import { useSearchPositions } from "@/store/crew";
import { useCrewingStore } from "@/store/crewing";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";
import { CompanyCrewMemberType, PositionType, RankType } from "@/types/type";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { AddCrew } from "@/components/blocks/CrewTable/AddCrew";
import { deleteAllCrewForPosition } from "@/components/blocks/Crewing/SetOptionsFor/deleteAllCrewForPositionId";
import { createPositionCrewMap } from "@/components/blocks/Crewing/SetOptionsFor/createPositionCrewMap";
import { fetchRequiredPositions } from "@/components/blocks/Crewing/SetOptionsFor/fetchRequiredPositions";
import { insertCrewSelections } from "@/components/blocks/Crewing/SetOptionsFor/insertCrewSelections";
// import { HoverCrewCard } from "@/components/ui/HoverCrewCard";
import { PositionNavButtons } from "@/components/blocks/Crewing/SetOptionsFor/PositionNavButtons";
import { useCompanyStore } from "@/store/company";

export const SetOptionsFor: React.FC<{
  open?: boolean;
  onClose: () => void;
  setStage: Dispatch<SetStateAction<"crew" | "positions" | "options">>;
}> = ({ open, onClose, setStage }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  // const [cardIsHovered, setCardIsHovered] = useState(false);
  // const hoverTimeoutRef = useRef<number | null>(null);
  // const [hoveredCrew, setHoveredCrew] =
  //   useState<CompanyCrewMemberType | null>();
  const [crewWorkedWith, setCrewWorkedWith] = useState<
    CompanyCrewMemberType[] | null
  >(null);
  // const [cursorCoords, setCursorCoords] = useState({
  //   x: 0,
  //   y: 0,
  // });
  // const latestMouseCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [crewMemberCounts, setCrewMemberCounts] = useState<{
    [key: number]: number;
  }>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [ranks, setRanks] = useState<RankType | null>(null);
  const [crew, setCrew] = useState<
    (CompanyCrewMemberType & { position: PositionType[] })[]
  >([]);
  const [selected, setSelected] = useState<CompanyCrewMemberType[]>([]);

  const supabase = createClient();

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const { search: searchPositions } = useSearchPositions();
  const {
    settingCrewFor,
    setSettingCrewFor,
    project,
    setRequiredPositions,
    requiredPositions,
    crewingPositions,
  } = useCrewingStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCrew, setSelectedCrew] = useState<{
    [key: string]: CompanyCrewMemberType[];
  }>({});
  const { activeCompany } = useCompanyStore();

  // const handleMouseEnterCrew = (
  //   crewMember: CompanyCrewMemberType,
  //   e: React.MouseEvent<HTMLDivElement>
  // ) => {
  //   if (!crewMember) return;
  //   if (hoveredCrew && crewMember.id === hoveredCrew.id) return;
  //
  //   // setCurrentPosition(positionTitle);
  //
  //   if (hoverTimeoutRef.current) {
  //     clearTimeout(hoverTimeoutRef.current);
  //   }
  //
  //   hoverTimeoutRef.current = window.setTimeout(() => {
  //     //-- use the latest mouse coordinates from the ref.
  //     setCursorCoords({
  //       x: latestMouseCoords.current.x,
  //       y: latestMouseCoords.current.y,
  //     });
  //
  //     setHoveredCrew(crewMember);
  //   }, 500);
  //
  //   // setCrewIsHovered(true);
  // };
  // const handleMouseLeaveCrew = () => {
  //   if (cardIsHovered) return;
  //
  //   if (hoverTimeoutRef.current) {
  //     clearTimeout(hoverTimeoutRef.current);
  //     hoverTimeoutRef.current = null;
  //   }
  //
  //   setHoveredCrew(null);
  // };
  // const handleMouseMove = (e: MouseEvent) => {
  //   latestMouseCoords.current = { x: e.clientX, y: e.clientY };
  // };
  //
  // useEffect(() => {
  //   window.addEventListener("mousemove", handleMouseMove);
  //
  //   return () => {
  //     window.removeEventListener("mousemove", handleMouseMove);
  //   };
  // }, []);

  useEffect(() => {
    if (!crewingPositions || !settingCrewFor) return;

    const indexOfPosition = crewingPositions.findIndex(
      (pos) => pos.position === settingCrewFor.position
    );

    //-- only update if the new index is different from the current index.
    if (indexOfPosition !== -1 && indexOfPosition !== currentIndex) {
      setCurrentIndex(indexOfPosition);
    }
  }, [crewingPositions, settingCrewFor]);

  useEffect(() => {
    const fetchCrewPositionMap = async () => {
      if (!project) return;

      const positionCrewMap = await createPositionCrewMap(supabase, project);

      if (!positionCrewMap) return;

      setSelectedCrew(
        positionCrewMap as { [key: string]: CompanyCrewMemberType[] }
      );
    };

    fetchCrewPositionMap();

    // return () => {};
  }, [requiredPositions]);

  //-- fetch related crew members from hovered crew members previous jobs.
  // useEffect(() => {
  //   const fetchCrewWorkedWith = async () => {
  //     if (!hoveredCrew || !crewingPositions) return;
  //
  //     setLoading(true);
  //
  //     //-- fetch all projects related to the current crew member.
  //     const { data: relatedProjects, error: relatedProjectsFetchError } =
  //       await supabase
  //         .from("call_sheet_member")
  //         .select("project")
  //         .eq("crew_member", hoveredCrew.id);
  //
  //     if (!relatedProjects) return;
  //
  //     if (relatedProjectsFetchError) {
  //       console.error("Error: ", relatedProjectsFetchError);
  //       toast.error("Something went wrong. Please try again.");
  //     }
  //
  //     //-- remove duplicate ids.
  //     const dedupedProjects = [
  //       ...new Set(relatedProjects.map((p) => p.project)),
  //     ];
  //
  //     if (!dedupedProjects) return;
  //
  //     //-- fetch all related crew from the deduped project ids.
  //     const { data: relatedCrew, error: relatedCrewFetchError } = await supabase
  //       .from("distinct_call_sheet_member")
  //       .select("crew_member")
  //       .in("project", dedupedProjects);
  //
  //     if (!relatedCrew) return;
  //
  //     if (relatedCrewFetchError) {
  //       console.error("Error: ", relatedCrewFetchError);
  //       toast.error("Something went wrong. Please try again.");
  //     }
  //
  //     //-- reduce related crew to individual counts of each crew_member id from relatedCrew.
  //     const crewMemberCounts: { [key: number]: number } = relatedCrew.reduce(
  //       (acc: { [key: number]: number }, item) => {
  //         const member = item.crew_member;
  //         if (member !== null) {
  //           acc[member] = (acc[member] || 0) + 1;
  //         }
  //         return acc;
  //       },
  //       {}
  //     );
  //
  //     setCrewMemberCounts(crewMemberCounts);
  //
  //     //-- dedupe the crew members and filter out the id of the crew we're hovering and any null values.
  //     const dedupedCrew = [
  //       ...new Set(relatedCrew.map((p) => p.crew_member)),
  //     ].filter((c) => c !== null && c !== hoveredCrew.id);
  //
  //     const { data: crewWorkedWith, error: crewWorkedWithFetchError } =
  //       await supabase
  //         .from("company_crew_member")
  //         .select()
  //         // .limit(3)
  //         .in("id", dedupedCrew);
  //
  //     if (!crewWorkedWith) return;
  //
  //     if (crewWorkedWithFetchError) {
  //       console.error("Error: ", crewWorkedWithFetchError);
  //       toast.error("Something went wrong. Please try again.");
  //
  //       return;
  //     }
  //
  //     const currentCrewIds = crewingPositions
  //       .map((p) => p.crewing_position_crew?.map((c) => c.crew))
  //       .flat();
  //
  //     const filteredCrewWorkedWith = crewWorkedWith.filter((c) =>
  //       currentCrewIds.includes(c.id)
  //     );
  //
  //     setCrewWorkedWith(filteredCrewWorkedWith);
  //
  //     setLoading(false);
  //   };
  //
  //   fetchCrewWorkedWith();
  // }, [hoveredCrew]);

  const foundPosition = useMemo(() => {
    if (!settingCrewFor?.position) return null;

    return searchPositions(settingCrewFor?.position);
  }, [searchPositions, settingCrewFor?.position]);

  const fetchCrew = async () => {
    if (!user || !settingCrewFor?.position) return;

    setLoading(true);

    const crewToSearch = [
      foundPosition?.position ?? settingCrewFor?.position,
      ...(foundPosition?.aliases ?? []),
    ];

    let query = supabase
      .from("company_crew_member")
      .select(
        `
      *,
      position!inner(
        *
      )
    `
      )
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

    if (error || !data) {
      setLoading(false);

      console.error("Error: ", error);
      toast.error("Something went wrong.");

      return;
    }

    setCrew(data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchCrew();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingCrewFor?.position, search, refreshKey]);

  const orderedCrew = useMemo(() => {
    if (!ranks || !ranks?.crew) return crew;

    const rankSet = new Set(ranks.crew);

    const rankedData = crew.filter((item) => rankSet.has(item.id));
    const unrankedData = crew.filter((item) => !rankSet.has(item.id));

    const orderedRankedData = ranks.crew
      .map((rankId) => rankedData.find((item) => item.id === rankId))
      .filter((item) => item);

    return [...orderedRankedData, ...unrankedData];
  }, [crew, ranks]);

  const dataIds = useMemo<UniqueIdentifier[]>(
    () => selected?.map(({ id }) => id),
    [selected]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setSelected((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);

        setSelected(arrayMove(data, oldIndex, newIndex));

        return arrayMove(data, oldIndex, newIndex); //this is just a splice util
      });
    }
  }

  useEffect(() => {
    return () => {
      setSelected([]);
      setCrew([]);
      setSearch("");
    };
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0.01,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const cleanup = () => {
    setRanks(null);
    setCrew([]);
    setSearch("");
    setCurrentIndex(0);
    setSettingCrewFor(null);
  };

  const updateCrew = async () => {
    if (!crewingPositions) {
      setStage("crew");
      return;
    }

    setSaving(true);

    try {
      let allCrewSelections: any[] = [];
      let crewToDelete: any[] = [];

      const positionsToUpdate = Object.keys(selectedCrew);

      for (const positionKey of positionsToUpdate) {
        const crewForPosition = selectedCrew[positionKey];

        //-- find the matching position in crewingPositions.
        const positionToUpdate = crewingPositions.find(
          (pos) => pos.position === positionKey
        );

        if (!positionToUpdate) {
          console.error(
            `Position not found in crewingPositions: ${positionKey}`
          );
          continue;
        }

        const positionNumber = positionToUpdate.id;

        //-- fetch existing records for the position.
        const { data: existingCrewRecords, error: fetchRecordsError } =
          await supabase
            .from("crewing_position_crew")
            .select("id, crew")
            .eq("crewing_position", positionNumber);

        if (fetchRecordsError) {
          console.error("Error fetching existing records: ", fetchRecordsError);

          continue;
        }

        const existingCrewIds = existingCrewRecords.map(
          (record) => record.crew
        );
        const existingCrewMap = Object.fromEntries(
          existingCrewRecords.map((record) => [record.crew, record.id])
        );

        if (crewForPosition.length === 0) {
          //-- delete all crewing_position_crew records for the position.
          const { ok, error: deleteError } = await deleteAllCrewForPosition(
            supabase,
            positionNumber
          );

          if (!ok || deleteError) {
            toast.error("Something went wrong.");

            setSaving(false);

            return;
          }

          if (!project) return;

          const { data: updatedPositions, error } =
            await fetchRequiredPositions(supabase, project);

          if (!updatedPositions || error) {
            console.error("Error: ", error);
            toast.error("Something went wrong.");

            setSaving(false);

            return;
          }

          setRequiredPositions(updatedPositions);

          setSaving(false);
        } else {
          //-- filter out existing records and prepare new ones.
          const newCrewSelections = crewForPosition
            .filter((crew) => !existingCrewIds.includes(crew.id))
            .map((crew, i) => ({
              crewing_position: positionNumber,
              crew: crew.id,
              priority: i,
            }));

          allCrewSelections = allCrewSelections.concat(newCrewSelections);

          //-- determine records to delete.
          const newCrewIds = crewForPosition.map((crew) => crew.id);
          const crewToDeleteForPosition = existingCrewIds
            .filter((crewId) => !newCrewIds.includes(crewId as number))
            .map((crewId) => existingCrewMap[crewId as number]);

          crewToDelete = crewToDelete.concat(crewToDeleteForPosition);
        }
      }

      //-- delete outdated records.
      if (crewToDelete.length > 0) {
        await supabase
          .from("crewing_position_crew")
          .delete()
          .in("id", crewToDelete);
      }

      //-- insert new records.
      if (allCrewSelections.length > 0) {
        const {
          ok,
          newRequiredPositions,
          error: insertCrewErrors,
        } = await insertCrewSelections(
          supabase,
          project as string,
          allCrewSelections
        );

        if (!ok || insertCrewErrors) {
          for (const error of insertCrewErrors) {
            console.error("Error: ", error);
          }

          setSaving(false);
          setLoading(false);

          return;
        }

        //REMARK: test removal
        // if (newRequiredPositions) {
        //   setRequiredPositions(newRequiredPositions);
        // }

        if (project) {
          const { data: updatedPositions, error: fetchUpdPosError } =
            await fetchRequiredPositions(supabase, project);

          if (!updatedPositions || fetchUpdPosError) {
            console.error("Error: ", fetchUpdPosError);
            toast.error("Something went wrong.");

            setSaving(false);

            return;
          }

          setRequiredPositions(updatedPositions);
        }
      }
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      setLoading(false);

      setStage("crew");
    }
  };

  useEffect(() => {
    if (!crewingPositions) return;

    setSettingCrewFor(crewingPositions[currentIndex]);
  }, [currentIndex]);

  //-- update selected members every time we cycle through positions in the modal.
  useEffect(() => {
    if (!settingCrewFor) return;

    const currentSelected =
      selectedCrew[settingCrewFor.position as string] ?? [];
    setSelected(currentSelected);
  }, [settingCrewFor, selectedCrew]);

  const handleClickAutoFill = async () => {
    if (!orderedCrew.length || !settingCrewFor) return;

    const positionKey = settingCrewFor.position as string;
    const currentCrew = selectedCrew[positionKey] || [];
    let updatedCrew = [...currentCrew];

    for (let i = 0; i < 5; i++) {
      const crew = orderedCrew[i];
      if (!crew) break;

      if (!currentCrew.some((s) => s.id === crew.id)) {
        updatedCrew.push(crew);
      }
    }

    setSelected(updatedCrew);

    setSelectedCrew((prev) => {
      const newSelectedCrew = { ...prev, [positionKey]: updatedCrew };

      // if (updatedCrew.length === 0) {
      //   delete newSelectedCrew[positionKey];
      // }

      return newSelectedCrew;
    });
  };

  const handleCrewClick = (c: CompanyCrewMemberType) => {
    if (!settingCrewFor) return;

    const positionKey = settingCrewFor.position as string;
    const currentCrew = selectedCrew[positionKey] || [];
    const isAlreadySelected = currentCrew.some((s) => s.id === c?.id);

    const updatedCrew = isAlreadySelected
      ? currentCrew.filter((s) => s.id !== c?.id)
      : [...currentCrew, c as CompanyCrewMemberType];

    setSelectedCrew((prev) => {
      const newSelectedCrew = {
        ...prev,
        [positionKey]: updatedCrew,
      };

      return newSelectedCrew;
    });

    setSelected(updatedCrew);

    if (!selectedCrew[settingCrewFor.position as string]) {
      selectedCrew[settingCrewFor.position as string] = [];
    }

    selectedCrew[settingCrewFor.position as string].push(
      c as CompanyCrewMemberType
    );
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
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-[960px] w-[960px] gap-0"
      >
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items center gap-2 items-center">
                <button
                  className="w-10 h-10 flex items-center justify-center"
                  onClick={() => setStage("crew")}
                >
                  <Icon
                    name="arrow-left"
                    className="text-accent w-full h-full"
                  />
                </button>
                Set crew options for
                <div className="h-6 px-2 bg-accent bg-opacity-10 rounded-md justify-center items-center flex text-lime-300 text-lg font-semibold ">
                  {foundPosition?.position}
                </div>
              </div>
            </DialogTitle>

            <PositionNavButtons
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
            />
          </div>
        </DialogHeader>

        <div className="h-[490px] flex overflow-hidden">
          <div className="p-5 flex flex-col gap-3 flex-1 border-r border-zinc-900">
            <div>
              <Search
                search={search}
                setSearch={setSearch}
                placeholder={"Search positions, departments..."}
              />
            </div>

            <div className="flex flex-col gap-2 flex-1 w-full overflow-scroll hide-scrollbars">
              {[...new Array(loading ? 3 : 0)].map((_, i) => (
                <div
                  className="p-2 flex items-center gap-3 w-full rounded-xl bg-white bg-opacity-5 cursor-pointer"
                  key={i}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Icon name={"checkbox-unchecked"} />
                  </div>

                  <div className="flex flex-1 items-center gap-2">
                    <Skeleton className="w-12 h-12 rounded-full"></Skeleton>
                    <Skeleton className="w-48 h-4"></Skeleton>
                  </div>

                  <Skeleton className="px-[6px] h-[28px] min-w-9 rounded-[48px]" />
                </div>
              ))}

              {!loading &&
                orderedCrew.map((c, i) => {
                  if (!c) return;

                  const initials = c.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("");

                  return (
                    <div
                      // onMouseEnter={(e) => handleMouseEnterCrew(c, e)}
                      // onMouseLeave={() => handleMouseLeaveCrew()}
                      className="p-2 flex items-center gap-3 w-full rounded-xl bg-white bg-opacity-[0.03] cursor-pointer hover:bg-opacity-[0.06]"
                      onClick={() => handleCrewClick(c)}
                      key={c?.id}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Icon
                          name={
                            selectedCrew[settingCrewFor?.position as string] &&
                            selectedCrew[
                              settingCrewFor?.position as string
                            ].some((s) => s.id === c?.id)
                              ? "checkbox"
                              : "checkbox-unchecked"
                          }
                        />
                      </div>

                      <div className="flex flex-1 items-center gap-2">
                        <Avatar className="w-12 h-12 rounded-full">
                          <AvatarFallback className="w-12 h-12 flex items-center justify-center rounded-full">
                            <span className="text-inherit text-lg font-medium leading-none">
                              {initials}
                            </span>
                          </AvatarFallback>
                        </Avatar>

                        <div className="text-white text-lg font-bold">
                          {c?.name}
                        </div>
                      </div>

                      <div className="px-[6px] h-[28px] justify-center min-w-9 bg-white bg-opacity-5 rounded-[48px] flex items-center gap-[3px] text-white text-base font-semibold">
                        <span className="text-[10px] text-white text-opacity-40">
                          #
                        </span>
                        {i + 1}
                      </div>
                    </div>
                  );
                })}

              {!loading && (
                <div className="flex items-center justify-center gap-3 w-full h-[58px] p-2 rounded-xl bg-white bg-opacity-[0.03]">
                  <div className="font-medium">
                    Don&apos;t see someone in your Roster?
                  </div>

                  <AddCrew
                    variant="secondary"
                    buttonText="Add Them"
                    iconName="plus"
                    department={undefined} //-- TODO: pass in department of current position.
                    position={settingCrewFor?.position ?? undefined}
                    companyId={activeCompany as string}
                    onUpdate={() => {
                      setRefreshKey((prev) => prev + 1);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "p-5 w-[380px] flex flex-col gap-4 !bg-[##1B1B1C]",
              selected.length === 0 && "justify-center items-center"
            )}
          >
            {selected.length === 0 ? (
              <div
                onClick={() => handleClickAutoFill()}
                className={cn(
                  "flex items-center justify-center h-[40px] w-[220px] bg-[#202020] gap-2 px-3 rounded-xl cursor-pointer hover:bg-[#303030]"
                )}
              >
                <Icon name="wizard-sparkle" className="w-5 h-5 text-lime-300" />
                <div>Auto-fill crew options</div>
              </div>
            ) : (
              <div className="text-white text-lg leading-snug font-bold">
                {selected.length} Selected
              </div>
            )}

            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={dataIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {selected.map((item) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      setSelected={setSelected}
                      selected={selected}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center">
          <div className="flex">
            <Icon
              name="wizard-sparkle"
              className="w-5 h-5 text-lime-300 pr-2"
            />
            <div className="font-bold">Coming soon:</div>

            <div className="pl-2">
              2nd Degree Connections & Referral Automation
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={() => {
                cleanup();
                onClose();
              }}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              variant="accent"
              size="compact"
              onClick={updateCrew}
              disabled={saving || loading}
            >
              Done
            </Button>
          </div>
        </DialogFooter>

        {/*
        {hoveredCrew && (
          <HoverCrewCard
            handleCrewClick={handleCrewClick}
            setOptionsForOpen={open}
            crewMember={hoveredCrew}
            crewWorkedWith={crewWorkedWith}
            crewMemberCounts={crewMemberCounts}
            setCrewWorkedWith={setCrewWorkedWith}
            setCardIsHovered={setCardIsHovered}
            setHoveredCrew={setHoveredCrew}
            cursorCoords={cursorCoords}
            isLoading={loading}
            selected={selected}
            onModal
          />
        )}
        */}
      </DialogContent>
    </Dialog>
  );
};

const DraggableItem: React.FC<{
  item: CompanyCrewMemberType;
  setSelected: React.Dispatch<React.SetStateAction<CompanyCrewMemberType[]>>;
  selected: CompanyCrewMemberType[];
}> = ({ item, setSelected, selected }) => {
  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: item.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  const index = useMemo(() => {
    return selected.findIndex((s) => s.id === item.id) + 1;
  }, [selected, item.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 flex items-center gap-1 bg-white bg-opacity-5 rounded-[18px] cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <Icon
        name="drag"
        className={cn(
          "text-white opacity-40 w-6 h-6",
          isDragging && "opacity-60"
        )}
      />
      <div className="flex-1 flex gap-4 justify-between items-center">
        <div className="flex flex-1 gap-4 items-center text-lg text-white max-w-[220px]">
          <Avatar className="w-7 h-7 rounded-full">
            <AvatarFallback className="w-7 h-7 flex items-center justify-center rounded-full">
              <span className="text-inherit text-xl font-medium leading-none">
                {item?.name?.[0]}
              </span>
            </AvatarFallback>
          </Avatar>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {item?.name}
            {/*{item?.name}*/}
          </span>
        </div>
      </div>
      <div className="px-[6px] h-[28px] justify-center min-w-9 bg-white bg-opacity-5 rounded-[48px] flex items-center gap-[3px] text-white text-base font-semibold">
        <span className="text-[10px] text-white text-opacity-40">#</span>
        {index}
      </div>
      <button
        onClick={() => {
          setSelected((s) => s.filter((s) => s.id !== item.id));
        }}
        className="cursor-pointer w-6 h-6"
      >
        <Icon name="delete" className="w-6 h-6 text-white text-opacity-40" />
      </button>
    </div>
  );
};
