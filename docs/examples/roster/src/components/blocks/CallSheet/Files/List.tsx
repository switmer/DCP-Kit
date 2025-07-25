import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";

import { FileAttachment } from "@/types/type";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { FileItem } from "./Item";
import { Button } from "@/components/ui/Button";
import { useRef } from "react";

type FileType = "default";

interface ContainerItems {
  default: FileAttachment[];
}

interface ContainerProps {
  id: string;
  items: FileAttachment[];
  current: number | boolean | null | undefined;
  setCurrent: (id: number) => void;
  addNew: (type: FileType, selectedFile: File) => void;
  company?: boolean;
}

const Container: React.FC<ContainerProps> = ({
  id,
  items,
  current,
  setCurrent,
  addNew,
}) => {
  const filesRef = useRef<File[]>([]);
  const { setNodeRef } = useSortable({
    id,
    data: {
      type: "container",
      children: items,
    },
  });

  return (
    <div ref={setNodeRef}>
      <input
        type="file"
        id={`${id}_FILE_INPUT`}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            filesRef.current.push(selectedFile);
            addNew(id as FileType, selectedFile);
          }
        }}
      />
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <FileItem
              key={item.id}
              file={item}
              current={current === item.id}
              setCurrent={setCurrent}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const List: React.FC<{
  company?: boolean;
  containers: ContainerItems;
  setContainers: React.Dispatch<React.SetStateAction<ContainerItems>>;
  current: number | boolean | null | undefined;
  setCurrent: (id: number) => void;
  addNew: (type: FileType, selectedFile: File) => void;
}> = ({ containers, setContainers, current, setCurrent, addNew, company }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: UniqueIdentifier) => {
    if (id in containers) return id as string;
    return Object.keys(containers).find((key) =>
      containers[key as FileType].some((item) => item.id === id)
    );
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id as UniqueIdentifier);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    setContainers((prev) => {
      const activeItems = prev[activeContainer as FileType];
      const overItems = prev[overContainer as FileType];

      const activeIndex = activeItems.findIndex(
        (item) => item.id === active.id
      );
      const overIndex = overItems.findIndex((item) => item.id === over?.id);

      const newContainers = { ...prev };
      newContainers[activeContainer as FileType] = newContainers[
        activeContainer as FileType
      ].filter((item) => item.id !== active.id);
      newContainers[overContainer as FileType] = [
        ...newContainers[overContainer as FileType].slice(0, overIndex + 1),
        activeItems[activeIndex],
        ...newContainers[overContainer as FileType].slice(overIndex + 1),
      ];

      newContainers[overContainer as FileType] = newContainers[
        overContainer as FileType
      ].map((file) => ({
        ...file,
        type: overContainer as FileType,
      }));

      return newContainers;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer !== overContainer
    ) {
      return;
    }

    const activeIndex = containers[activeContainer as FileType].findIndex(
      (item) => item.id === active.id
    );
    const overIndex = containers[overContainer as FileType].findIndex(
      (item) => item.id === over.id
    );

    if (activeIndex !== overIndex) {
      setContainers((prev) => {
        const newContainers = { ...prev };
        newContainers[overContainer as FileType] = arrayMove(
          newContainers[overContainer as FileType],
          activeIndex,
          overIndex
        );

        newContainers[overContainer as FileType] = newContainers[
          overContainer as FileType
        ].map((file) => ({
          ...file,
          type: overContainer as FileType,
        }));

        return newContainers;
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div>
        {Object.entries(containers).map(([id, items]) => (
          <Container
            key={id}
            id={id}
            items={items}
            current={current}
            setCurrent={setCurrent}
            addNew={addNew}
          />
        ))}
      </div>
    </DndContext>
  );
};
