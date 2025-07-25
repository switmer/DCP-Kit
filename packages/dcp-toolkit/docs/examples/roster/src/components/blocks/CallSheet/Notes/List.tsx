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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';

import { CompanyPolicy, Note } from '@/types/type';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { NoteItem } from './NoteItem';
import { StaticNoteItem } from './StaticNoteItem';
import React from 'react';

type NoteType = 'before_details' | 'on_page' | 'featured';

export interface ContainerItems {
  before_details: Note[];
  on_page: Note[];
  featured: Note[];
}

interface ContainerProps {
  id: string;
  items: Note[];
  current: number | boolean | null | undefined;
  setCurrent: (id: number) => void;
  addNewNote: (type: NoteType) => void;
  company?: boolean;
  section?: 'above' | 'below';
}

const LABELS: Record<string, string> = {
  before_details: 'Before Call Sheet',
  on_page: 'On Call Sheet',
};

const LABELS_COMPANY: Record<string, string> = {
  before_details: 'Before Showing Call Time',
  on_page: 'Below Call Time/Job Details',
};

const Container: React.FC<ContainerProps> = ({ id, items, current, setCurrent, addNewNote, company }) => {
  const { setNodeRef } = useSortable({
    id,
    data: {
      type: 'container',
      children: items,
    },
  });

  return (
    <div ref={setNodeRef}>
      <h2 className="font-label text-sm text-white text-opacity-60 font-medium uppercase pb-2 pt-4 flex justify-between gap-2">
        {company ? LABELS_COMPANY[id] : LABELS[id]}

        <Tooltip content={'Add new note'}>
          <button className="w-5 h-5 flex justify-center items-center mr-2" onClick={() => addNewNote(id as NoteType)}>
            <Icon
              name="plus-circle"
              className="w-[16px] h-[16px] text-white text-opacity-60 hover:text-opacity-100 duration-150"
            />
          </button>
        </Tooltip>
      </h2>

      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {items.length > 0
            ? items.map((item) => (
                <NoteItem key={item.id} note={item} current={current === item.id} setCurrent={setCurrent} />
              ))
            : null}

          <div
            className={cn(
              'flex px-2 items-center gap-1 text-white text-opacity-50 h-8 text-xs cursor-pointer hover:text-opacity-100 duration-150',
            )}
            onClick={() => addNewNote(id as NoteType)}
          >
            <Icon name="plus-circle" className="w-[16px] h-[16px]" />
            Add note
          </div>
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
  addNewNote: (type: NoteType) => void;
}> = ({ containers, setContainers, current, setCurrent, addNewNote, company }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const displayContainers = {
    before_details: containers?.before_details || [],
    on_page: [...(containers.featured ? containers.featured : []), ...(containers.on_page || [])],
  };

  const findContainer = (id: UniqueIdentifier) => {
    if (id in containers) return id as string;

    return Object.keys(containers).find((key) => containers[key as NoteType].some((item) => item.id === id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id as UniqueIdentifier);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setContainers((prev) => {
      const activeItems = prev[activeContainer as NoteType];
      const overItems = prev[overContainer as NoteType];

      const activeIndex = activeItems.findIndex((item) => item.id === active.id);
      const overIndex = overItems.findIndex((item) => item.id === over?.id);

      const newContainers = { ...prev };

      // get the active note.
      const activeNote = activeItems[activeIndex];

      // remove the active note from its current container.
      newContainers[activeContainer as NoteType] = newContainers[activeContainer as NoteType].filter(
        (item) => item.id !== active.id,
      );

      // create an updated note with the new container type.
      const updatedNote = {
        ...activeNote,
        type: overContainer as NoteType,
        acknowledgeable:
          overContainer === 'on_page' || overContainer === 'featured' ? false : activeNote.acknowledgeable,
      };

      // add the updated note to the new container.
      newContainers[overContainer as NoteType] = [
        ...newContainers[overContainer as NoteType].slice(0, overIndex + 1),
        updatedNote,
        ...newContainers[overContainer as NoteType].slice(overIndex + 1),
      ];

      return newContainers;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      const activeIndex = containers[activeContainer as NoteType].findIndex((item) => item.id === active.id);
      const overIndex = containers[overContainer as NoteType].findIndex((item) => item.id === over.id);

      if (activeIndex !== overIndex) {
        setContainers((prev) => {
          const newContainers = { ...prev };
          newContainers[overContainer as NoteType] = arrayMove(
            newContainers[overContainer as NoteType],
            activeIndex,
            overIndex,
          );

          newContainers[overContainer as NoteType] = newContainers[overContainer as NoteType].map((note) => ({
            ...note,
            type: overContainer as NoteType,
            acknowledgeable: overContainer === 'on_page' || overContainer === 'featured' ? false : note.acknowledgeable,
          }));

          return newContainers;
        });
      }
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
        {Object.entries(displayContainers).map(([id, items]) => (
          <Container
            key={id}
            id={id}
            items={items}
            current={current}
            setCurrent={setCurrent}
            addNewNote={addNewNote}
            company={company}
          />
        ))}
      </div>
    </DndContext>
  );
};
