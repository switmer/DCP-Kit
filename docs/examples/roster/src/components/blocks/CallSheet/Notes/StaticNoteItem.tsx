import React, { useMemo } from "react";
import { Note } from "@/types/type";
import { cn } from "@/lib/utils";

export const StaticNoteItem: React.FC<{
  note: Note;
  current: boolean;
  setCurrent: (id: number) => void;
}> = ({ note, current, setCurrent }) => {
  const hasTitle = useMemo(() => !!note.title, [note.title]);
  const hasNote = useMemo(() => !!note.note, [note.note]);

  return (
    <div
      className={cn(
        "group flex relative flex-col gap-1 px-3 pr-5 h-[50px] min-h-[50px] justify-center rounded-lg duration-100 cursor-pointer",
        current && "bg-accent bg-opacity-5",
        !current && "hover:bg-white hover:bg-opacity-5"
      )}
      onClick={() => setCurrent(note.id)}
    >
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
