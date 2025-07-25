import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";
import { Icon } from "@/components/ui/Icon";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableItem } from "../Positions/Options";
import {
  CompanyCrewMemberType,
  CrewingPositionCrew,
  CrewingPositionType,
} from "@/types/type";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useEffect, useMemo, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCrewingStore } from "@/store/crewing";
import { Button } from "@/components/ui/Button";

export const Crew: React.FC<{
  openSetup: (p?: CrewingPositionType) => void;
}> = ({ openSetup }) => {
  const [crew, setCrew] = useState<CompanyCrewMemberType[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const { focusCrewingPosition, setFocusCrewingPosition } = useCrewingStore();

  const options = useMemo(
    () => focusCrewingPosition?.crewing_position_crew ?? [],
    [focusCrewingPosition]
  );

  const fetchCrewMembers = useCallback(async () => {
    if (!options.length) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("company_crew_member")
      .select("*")
      .in(
        "id",
        options.map((o) => o.crew)
      );

    if (error) {
      //
    } else {
      const sortedData = options
        .sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0))
        .map((o) => data?.find((d) => d.id === o.crew))
        .filter((d) => !!d);

      setCrew(sortedData as CompanyCrewMemberType[]);
    }
    setLoading(false);
  }, [supabase, options]);

  useEffect(() => {
    fetchCrewMembers();

    return () => {
      setCrew([]);
    };
  }, [fetchCrewMembers]);

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

  return (
    <div className="px-4 py-2 bg-white bg-opacity-[0.02] rounded-3xl border border-white border-opacity-10 flex-col flex">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="w-full h-8 flex items-center justify-between [&>svg]:data-[state=open]:rotate-90">
          <div className="text-white text-opacity-95 text-base font-medium">
            Crew
          </div>
          <Icon
            name="chevron-small"
            className="min-w-[32px] w-[32px] h-[32px] duration-100 text-white"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="py-2 flex flex-col gap-2">
          <div className="text-base text-white text-opacity-95 leading-none font-medium">
            Hiring Order
          </div>
          {!!crew.length && (
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
                  {crew.map((item) => {
                    return (
                      <>
                        <DraggableItem key={item.id} item={item} />
                      </>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {focusCrewingPosition && (
            <Button
              variant={"outline"}
              size={"medium"}
              className="w-full px-3"
              onClick={() => {
                openSetup(focusCrewingPosition);
                setFocusCrewingPosition(null);
              }}
            >
              Manage crewing
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
