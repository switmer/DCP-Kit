import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import React from "react";

export const ViewMenu: React.FC<{
  view: "default" | "department";
  setView: (view: "default" | "department") => void;
}> = ({ view, setView }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-auto px-4 h-10 rounded-md border border-neutral-700 justify-center items-center flex gap-[10px] text-white text-sm font-medium max-sm:rounded-3xl max-sm:gap-0 max-sm:border-none max-sm:bg-stone-850">
        <Icon name="settings" className="w-4 h-4 text-white mx-1" />

        <p className="max-sm:hidden">View</p>

        <Icon
          name="chevron-small"
          className="[@media(min-width:601px)]:hidden w-5 h-5 px-0 rotate-90"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        className="rounded-md shadow border border-neutral-800 bg-stone-950 w-64"
      >
        <DropdownMenuItem
          onClick={async () => {
            setView(view === "department" ? "default" : "department");
          }}
          className={cn(
            "h-10 pl-8 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-sm text-neutral-400 flex items-center gap-2",
            view === "department" && "text-white pl-2"
          )}
        >
          {view === "department" && (
            <Icon name="checkmark" className="w-4 h-4" />
          )}
          By Department
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
