import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CompanyCrewMemberType,
  CrewingContactAttempt,
  CrewingPositionCrew,
  CrewingPositionType,
} from "@/types/type";
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
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import React, {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Database } from "@/types/supabase";
import { toast } from "sonner";
import { HoverCrewCard } from "@/components/ui/HoverCrewCard";

export const PositionOptions: React.FC<{
  position: CrewingPositionType;
  positionTitle: string;
  crewingPositions: CrewingPositionType[] | null;
}> = ({ position, positionTitle, crewingPositions }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [crew, setCrew] = useState<CompanyCrewMemberType[]>([]);
  // const [cardIsHovered, setCardIsHovered] = useState(false);
  // const [hoveredCrew, setHoveredCrew] = useState<CompanyCrewMemberType | null>(
  //   null
  // );

  // const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  // const latestMouseCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [crewMemberCounts, setCrewMemberCounts] = useState<{
    [key: number]: number;
  }>({});
  const [crewWorkedWith, setCrewWorkedWith] = useState<
    CompanyCrewMemberType[] | null
  >(null);
  // const hoverTimeoutRef = useRef<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<string>(positionTitle);

  const supabase = createClient();

  const options = useMemo(
    () => position?.crewing_position_crew ?? [],
    [position]
  );

  //-- fetch related crew members from hovered crew member's previous jobs.
  // useEffect(() => {
  //   const fetchCrewWorkedWith = async () => {
  //     if (!hoveredCrew || !crewingPositions) return;
  //
  //     setIsLoading(true);
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
  //     setIsLoading(false);
  //   };
  //
  //   fetchCrewWorkedWith();
  // }, [hoveredCrew]);

  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery(
    supabase
      .from("company_crew_member")
      .select("*")
      .in(
        "id",
        options.map((o) => o.crew)
      ),
    { enabled: false }
  );

  // const handleMouseEnterCrew = (
  //   crewMember: CompanyCrewMemberType,
  //   e: React.MouseEvent<HTMLDivElement>
  // ) => {
  //   if (!crewMember) return;
  //   if (hoveredCrew && crewMember.id === hoveredCrew.id) return;
  //
  //   setCurrentPosition(positionTitle);
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

  useEffect(() => {
    if (!options.length) return;

    refetch();
  }, [options, refetch]);

  useEffect(() => {
    if (!data) return;

    const sortedData = options
      ?.sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0))
      .map((o) => data?.find((d) => d.id === o.crew))
      .filter((d) => !!d);

    setCrew((sortedData as CompanyCrewMemberType[]) ?? []);

    return () => {
      setCrew([]);
    };
  }, [data, options]);

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

  const dataIds = useMemo<UniqueIdentifier[]>(
    () => crew?.map(({ id }) => id),
    [crew]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setCrew((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);

        const res = arrayMove(data, oldIndex, newIndex);

        supabase
          .from("crewing_position_crew")
          .upsert(
            res
              .map((r, i) => {
                const found = options.find((o) => o.crew === r.id);

                if (!found) return null;

                /* @ts-ignore */
                const { crewing_contact_attempt, ...rest } = found;

                return {
                  ...rest,
                  priority: i,
                };
              })
              ?.filter((r) => !!r) as CrewingPositionCrew[]
          )
          .then();

        return res;
      });
    }
  }

  const pendingCrew = useMemo(
    () =>
      crew?.filter((c) => {
        const option = options.find((o) => o.crew === c.id);
        return (
          /* @ts-ignore */
          option?.crewing_contact_attempt?.find(
            (c: CrewingContactAttempt) => c.status === "pending"
            /* @ts-ignore */
          ) || !option?.crewing_contact_attempt?.length
        );
      }),
    [crew, options]
  );

  const inProgressCrew = useMemo(
    () =>
      crew?.filter((c) => {
        const option = options.find((o) => o.crew === c.id);
        /* @ts-ignore */
        return option?.crewing_contact_attempt?.find(
          (c: CrewingContactAttempt) => c.status === "contacted"
        );
      }),
    [crew, options]
  );

  const processedCrew = useMemo(
    () =>
      crew?.filter((c) => {
        const option = options.find((o) => o.crew === c.id);
        /* @ts-ignore */
        return option?.crewing_contact_attempt?.find(
          (c: CrewingContactAttempt) =>
            ["declined", "no_response"].includes(c.status)
        );
      }),
    [crew, options]
  );

  const confirmedCrew = useMemo(
    () =>
      crew?.filter((c) => {
        const option = options.find((o) => o.crew === c.id);
        /* @ts-ignore */
        return option?.crewing_contact_attempt?.find(
          (c: CrewingContactAttempt) => ["confirmed"].includes(c.status)
        );
      }),
    [crew, options]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...new Array(2)].map((_, i) => (
          <Skeleton
            className="h-10 px-4 rounded-[50px] flex items-center"
            key={i}
          ></Skeleton>
        ))}
      </div>
    );
  }

  if (position.hiring_status === "completed") {
    return (
      <div className="flex flex-col gap-2">
        {confirmedCrew?.map((item) => {
          return (
            <div
              key={item.id}
              // onMouseEnter={(e) => handleMouseEnterCrew(item, e)}
              // onMouseLeave={() => {
              //   if (!cardIsHovered) handleMouseLeaveCrew();
              // }}
              className=""
            >
              <Item className="w-fit" key={item.id} item={item} confirmed />
            </div>
          );
        })}
      </div>
    );
  }

  if (position.hiring_status === "in_progress") {
    return (
      <div className="flex flex-col gap-5">
        {!!confirmedCrew?.length && (
          <div className="flex flex-col gap-2">
            <div className="opacity-60 text-white font-label text-sm uppercase font-medium leading-none+">
              Confirmed
            </div>
            <div className="flex flex-col gap-2">
              {confirmedCrew?.map((item) => {
                return (
                  <div
                    key={item.id}
                    // onMouseEnter={(e) => handleMouseEnterCrew(item, e)}
                    // onMouseLeave={() => {
                    //   if (!cardIsHovered) handleMouseLeaveCrew();
                    // }}
                    className=""
                  >
                    <Item key={item.id} item={item} confirmed />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!!inProgressCrew?.length && (
          <div className="flex flex-col gap-2">
            <div className="opacity-60 text-white font-label text-sm uppercase font-medium leading-none+">
              Contacting
            </div>
            <div className="flex flex-col gap-2">
              {inProgressCrew?.map((item) => {
                return <Item key={item.id} item={item} inProgress />;
              })}
            </div>
          </div>
        )}

        {!!pendingCrew?.length && (
          <div className="flex flex-col gap-2">
            <div className="opacity-60 text-white font-label text-sm uppercase font-medium leading-none+">
              Next Up
            </div>

            <div className="flex flex-col gap-2">
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
                    {pendingCrew?.map((item) => {
                      return (
                        <div
                          key={item.id}
                          // onMouseEnter={(e) => handleMouseEnterCrew(item, e)}
                          // onMouseLeave={() => {
                          //   if (!cardIsHovered) handleMouseLeaveCrew();
                          // }}
                          className=""
                        >
                          <DraggableItem key={item.id} item={item} />
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {!!processedCrew?.length && (
          <div className="flex flex-col gap-2">
            <div className="opacity-60 text-white font-label text-sm uppercase font-medium leading-none+">
              Previously Contacted
            </div>
            <div className="flex flex-col gap-2">
              {processedCrew?.map((item) => {
                const option = options.find((o) => o.crew === item.id);

                /* @ts-ignore */
                const status = option?.crewing_contact_attempt?.find(
                  (c: CrewingContactAttempt) =>
                    ["declined", "no_response"].includes(c.status)
                )?.status;

                return <Item key={item.id} item={item} past status={status} />;
              })}
            </div>
          </div>
        )}

        {/*{hoveredCrew && (*/}
        {/*  <HoverCrewCard*/}
        {/*    crewMember={hoveredCrew}*/}
        {/*    crewWorkedWith={crewWorkedWith}*/}
        {/*    crewMemberCounts={crewMemberCounts}*/}
        {/*    setCrewWorkedWith={setCrewWorkedWith}*/}
        {/*    setCardIsHovered={setCardIsHovered}*/}
        {/*    setHoveredCrew={setHoveredCrew}*/}
        {/*    cursorCoords={cursorCoords}*/}
        {/*    isLoading={isLoading}*/}
        {/*  />*/}
        {/*)}*/}
      </div>
    );
  }

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {crew.map((item) => {
              return (
                <div
                  key={item.id}
                  // onMouseEnter={(e) => {
                  //   handleMouseEnterCrew(item, e);
                  // }}
                  // onMouseLeave={(e) => {
                  //   if (!cardIsHovered) handleMouseLeaveCrew();
                  // }}
                  className=""
                >
                  <DraggableItem key={item.id} item={item} />
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/*
      {hoveredCrew && (
        <HoverCrewCard
          crewMember={hoveredCrew}
          crewWorkedWith={crewWorkedWith}
          crewMemberCounts={crewMemberCounts}
          setCrewWorkedWith={setCrewWorkedWith}
          setCardIsHovered={setCardIsHovered}
          setHoveredCrew={setHoveredCrew}
          cursorCoords={cursorCoords}
          positionTitle={currentPosition}
          isLoading={isLoading}
        />
      )}
      */}
    </>
  );
};

const Item: React.FC<{
  item: CompanyCrewMemberType;
  past?: boolean;
  inProgress?: boolean;
  status?: Database["public"]["Enums"]["crewing_contact_attempt_status"];
  confirmed?: boolean;
  className?: string;
}> = ({ item, past, inProgress, status, confirmed, className }) => {
  return (
    <div
      className={cn(
        "p-3 px-4 flex items-center justify-between gap-2 bg-white bg-opacity-5 rounded-[50px]",
        confirmed && "bg-accent bg-opacity-20",
        className
      )}
    >
      <div className={cn("flex items-center gap-2", confirmed && "gap-4")}>
        {confirmed && (
          <div className="w-12 h-[22px] flex items-center justify-center bg-lime-300 rounded-[100px]">
            <Icon
              name="double-check"
              className="w-[18px] h-[18px] text-background"
            />
          </div>
        )}
        {inProgress && (
          <div className="flex items-center gap-[6px]">
            <>
              <div className="w-6 h-6 flex items-center justify-center bg-amber-300 bg-opacity-30 rounded-full">
                <Icon name="send" className="text-amber-300 w-5 h-5" />
              </div>
              <div className="opacity-70 w-[22px]">
                <LoadingIndicator size="small" className="w-[22px] h-[22px]" />
              </div>
            </>
          </div>
        )}
        <div
          className={cn(
            "text-white text-base font-semibold",
            past && "line-through text-opacity-50"
          )}
        >
          {item.name}
        </div>
      </div>
      {inProgress && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6">
            <LoadingIndicator size="small" />
          </div>
          Awaiting
        </div>
      )}
      {past && (
        <div className="text-white text-opacity-40 text-xs font-medium uppercase font-label">
          {status
            ?.split("_")
            ?.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            ?.join(" ")}
        </div>
      )}
    </div>
  );
};

export const DraggableItem: React.FC<{
  item: CompanyCrewMemberType;
}> = ({ item }) => {
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

  return (
    <div
      id={item.id.toString()}
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 px-4 flex items-center gap-2 bg-white bg-opacity-5 rounded-[50px] cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-[6px]">
        <Icon
          name="drag"
          className={cn(
            "text-white opacity-40 w-6 h-6",
            isDragging && "opacity-60"
          )}
        />
        <Icon name="send-wait" className="w-6 h-6 opacity-40" />
      </div>
      <div className="text-white text-base font-semibold">{item.name}</div>
    </div>
  );
};
