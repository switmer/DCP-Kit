import React, { CSSProperties, useMemo } from "react";
import { CSS } from "@dnd-kit/utilities";
import { Note } from "@/types/type";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

export const NoteItem: React.FC<{
  note: Note;
  current: boolean;
  setCurrent: (id: number) => void;
}> = ({ note, current, setCurrent }) => {
  const hasTitle = useMemo(() => !!note.title, [note.title]);
  const hasNote = useMemo(() => !!note.note, [note.note]);

  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: note.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex relative flex-col gap-1 px-3 pr-5 h-[50px] min-h-[50px] justify-center rounded-lg duration-100 cursor-pointer",
        current && "bg-accent bg-opacity-5",
        !current && "hover:bg-white hover:bg-opacity-5"
      )}
      onClick={() => setCurrent(note.id)}
    >
      <div
        className={cn(
          "cursor-grab absolute top-1 right-1 ",
          isDragging && "cursor-grabbing"
        )}
        {...attributes}
        {...listeners}
      >
        <Icon
          name="drag"
          className={cn(
            "text-white group-hover:opacity-40 duration-100 w-4 h-4 opacity-0",
            isDragging && "!opacity-60"
          )}
        />
      </div>
      <>
        {hasNote || hasTitle ? (
          <>
            <div
              className={cn(
                "text-base max-w-[85%] font-bold overflow-hidden text-ellipsis whitespace-nowrap leading-none",
                current ? "text-accent" : "text-white"
              )}
            >
              {hasTitle ? note.title : note.note}
            </div>
            {hasTitle && (
              <div className="text-white leading-3 text-white/50 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                {note.note}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className={cn(
                "text-base max-w-[85%] font-bold overflow-hidden text-ellipsis whitespace-nowrap leading-none",
                current ? "text-accent" : "text-white"
              )}
            >
              {note.id < 0 ? "New note" : "Empty note"}
            </div>

            <div className="text-white leading-3 text-white/50 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
              Enter note details...
            </div>
          </>
        )}
      </>
    </div>
  );
};
