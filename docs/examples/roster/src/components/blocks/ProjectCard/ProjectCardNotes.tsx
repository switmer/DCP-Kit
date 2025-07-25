import React, { FC } from "react";
import { cn } from "@/lib/utils";
import { Note, NoteType } from "@/types/type";

type Props = {
  notes: {
    before_details: NoteType[];
    on_page: NoteType[];
  };
  setShowNotesType: (type: "before_details" | "on_page" | "all") => void;
  setSelectedNoteId: (type: number | null) => void;
  setShowNotes: (showNotes: boolean) => void;
};

export const ProjectCardNotes: FC<Props> = (props) => {
  if (
    [...(props.notes?.before_details ?? []), ...(props.notes?.on_page ?? [])]
      .length === 0
  ) {
    return (
      <div className="">
        <div className="text-white text-base font-medium leading-tight">
          Notes
        </div>

        <div className="pl-2 text-white/60">
          No notes found for this project.
        </div>
      </div>
    );
  }

  return (
    <>
      {!![
        ...(props.notes?.before_details ?? []),
        ...(props.notes?.on_page ?? []),
      ]?.filter((n) => !!n.title || !!n.note).length && (
        <>
          <div className="text-white text-base font-medium leading-tight">
            Notes
          </div>

          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4">
            <div className="w-2 min-w-2 max-w-2 flex flex-1 opacity-0 snap-start flex-shrink-0"></div>
            {[
              ...(props.notes?.before_details ?? []),
              ...(props.notes?.on_page ?? []),
            ]?.map((n) => {
              return (
                <div
                  className={cn(
                    "p-6 rounded-3xl border border-white/20 flex flex-col gap-1 cursor-pointer w-[220px] flex-shrink-0 snap-start hover:bg-white/5 duration-100"
                  )}
                  key={n.id}
                  onClick={() => {
                    props.setShowNotesType("all");
                    props.setSelectedNoteId(n.id);
                    props.setShowNotes(true);
                  }}
                >
                  {n.title && (
                    <div className="text-white/95 text-base font-bold leading-tight">
                      {n.title}
                    </div>
                  )}

                  {n.note && (
                    <div className="font-label text-white/60 text-sm">
                      {n.note}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="w-2 min-w-2 max-w-2 flex flex-1 opacity-0 snap-start flex-shrink-0"></div>
          </div>
        </>
      )}
    </>
  );
};
