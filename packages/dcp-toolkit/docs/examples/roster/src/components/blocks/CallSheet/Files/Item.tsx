import React, { CSSProperties, useMemo } from "react";
import { CSS } from "@dnd-kit/utilities";

import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { FileAttachment } from "./Manage";
import { File } from "lucide-react";

export const FileItem: React.FC<{
  file: FileAttachment;
  current: boolean;
  setCurrent: (id: number) => void;
}> = ({ file, current, setCurrent }) => {
  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: file.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  const prettyFileType = useMemo(() => {
    if (!file.kind) return null;
    return getPrettyFileType(file.kind);
  }, [file.kind]);
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex relative flex-col gap-1 px-3 pr-5 h-[50px] min-h-[50px] justify-center rounded-lg duration-100 cursor-pointer",
        current && "bg-accent bg-opacity-5",
        !current && "hover:bg-white hover:bg-opacity-5"
      )}
      onClick={() => setCurrent(file.id)}
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
        <>
          <div
            className={cn(
              "text-base max-w-[85%] font-bold overflow-hidden text-ellipsis whitespace-nowrap leading-none",
              current ? "text-accent" : "text-white"
            )}
          >
            {!!file.title ? file.title : "Untitled"}
          </div>
          {prettyFileType && (
            <div className="text-white font-bold leading-3 text-white/50 text-[9px] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1">
              <File className="w-[10px] h-[10px]" /> {prettyFileType}
            </div>
          )}
        </>
      </>
    </div>
  );
};

export function getPrettyFileType(mimeType: string): string {
  const [type, subtype] = mimeType.split("/");

  switch (type) {
    case "application":
      if (subtype === "pdf") return "PDF";
      if (subtype.includes("word")) return "Word Document";
      if (subtype.includes("excel") || subtype === "vnd.ms-excel")
        return "Excel Spreadsheet";
      if (subtype.includes("powerpoint")) return "PowerPoint";
      return "File";
    case "image":
      return `${subtype.toUpperCase()} Image`;
    case "video":
      return `${subtype.toUpperCase()} Video`;
    case "audio":
      return `${subtype.toUpperCase()} Audio`;
    case "text":
      return `${subtype.charAt(0).toUpperCase() + subtype.slice(1)} File`;
    default:
      return "File";
  }
}
