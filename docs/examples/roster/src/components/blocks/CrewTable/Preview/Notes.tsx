import React, { FC, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

type Props = {
  id: number | null;
};

export const Notes: FC<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [textAreaFocused, setTextAreaFocused] = useState(false);
  const [showNoteArea, setShowNoteArea] = useState(false);
  const [note, setNote] = useState<string | null>("");
  const [originalNote, setOriginalNote] = useState<string | null>("");

  const supabase = createClient();

  useEffect(() => {
    if (!props.id) return;

    setIsLoading(true);
    setNote(null);
    setOriginalNote(null);
    setShowNoteArea(false);

    supabase
      .from("company_crew_member")
      .select("note")
      .eq("id", props.id)
      .then(({ data }) => {
        if (data?.length) {
          const loadedNote = data[0].note as string | null;

          //-- save the original note.
          setOriginalNote(loadedNote);

          if (loadedNote !== "" && loadedNote !== null) {
            setShowNoteArea(true);
            setNote(loadedNote);
          }
        }
        setIsLoading(false);
      });
  }, [props.id]);

  const handleBlur = () => {
    if (!props.id) return;

    const trimmedNote = note?.trim() ?? null;

    //-- prevent update if trimmed note matches the original.
    if (trimmedNote === originalNote) {
      setTextAreaFocused(false);
      return;
    }

    //-- allow update for empty string and null.
    const updatedNote = trimmedNote === "" ? null : trimmedNote;

    setTextAreaFocused(false);

    supabase
      .from("company_crew_member")
      .update({ note: updatedNote })
      .eq("id", props.id)
      .select("note")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error: ", error);
          toast.error("Something went wrong updating member note.");

          return;
        }

        if (data?.length) {
          setOriginalNote(updatedNote);
          setNote(updatedNote);

          if (updatedNote === null) {
            setShowNoteArea(false);
          }

          toast.success("Crew member note updated successfully.");
        }
      });
  };

  return (
    <div className="relative top-[-7px] flex flex-col gap-2">
      <div className="text-sm text-white/60">Notes</div>
      {isLoading && <Skeleton className="w-full h-[64px]" />}

      {showNoteArea ? (
        <Tooltip content="Click to edit">
          <textarea
            className={cn(
              "w-full min-h-[64px] p-3 py-2 bg-zinc-800/80 rounded-lg rounded-br-none placeholder:font-medium placeholder:text-white/50",
              textAreaFocused && "border border-lime-300"
            )}
            onBlur={(e: any) => {
              e.preventDefault();
              handleBlur();
            }}
            onFocus={() => setTextAreaFocused(true)}
            autoFocus={textAreaFocused}
            placeholder="Enter a custom note..."
            onChange={(e: any) => setNote(e.target.value)}
            value={note ?? ""}
          />
        </Tooltip>
      ) : (
        <button
          className="flex gap-1 cursor-pointer items-center text-sm font-medium text-white py-1 group"
          onClick={() => {
            setTextAreaFocused(true);
            setShowNoteArea(true);
          }}
        >
          <div className="p-1">
            <Icon
              className="w-4 h-4 text-white text-opacity-60 group-hover:text-opacity-100 duration-100"
              name="plus-circle"
            />
          </div>
          Add
        </button>
      )}
    </div>
  );
};
