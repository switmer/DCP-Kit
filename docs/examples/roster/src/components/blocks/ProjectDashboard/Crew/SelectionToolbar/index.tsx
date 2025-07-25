import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SelectionToolbarProps {
  checkedIds: number[];
  setCheckedIds: (ids: number[]) => void;
  onUpdate: () => void;
  setOpenDaysWorking: (open: boolean) => void;
  setDaysWorkingFor: (ids: number[]) => void;
}

export const SelectionToolbar = ({
  checkedIds,
  setCheckedIds,
  onUpdate,
  setOpenDaysWorking,
  setDaysWorkingFor,
}: SelectionToolbarProps) => {
  const supabase = createClient();

  return (
    <div
      className={cn(
        "duration-200 pointer-events-none max-w-[500px] opacity-0 translate-y-[100px] w-full h-16 px-6 bg-stone-900 bg-opacity-70 rounded-2xl backdrop-blur-2xl justify-between items-center gap-3.5 flex fixed bottom-6 left-1/2 -translate-x-1/2 max-sm:max-w-[350px] max-sm:gap-2 max-sm:px-3",
        checkedIds.length > 0 &&
          "translate-y-0 opacity-100 pointer-events-auto max-sm:translate-y-[-70px] z-30"
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="text-white text-sm font-semibold max-sm:text-xs max-sm:min-w-[70px] max-sm:text-center">
          {checkedIds.length} selected
        </div>
      </div>
      <AlertDialog
        onConfirm={async () => {
          try {
            const { error: positionError } = await supabase
              .from("project_position")
              .delete()
              .in("id", checkedIds);

            if (positionError) throw positionError;

            setCheckedIds([]);
            onUpdate();
            toast.success("Crew members removed successfully");
          } catch (error) {
            toast.error("Failed to remove crew members");
          }
        }}
        onCancel={() => {}}
        title={`Are you sure you want to delete ${
          checkedIds.length === 1 ? "this crew member" : "these crew members"
        }?`}
        description="This cannot be undone. This will permanently remove this project and all call sheets related to it."
        isDelete
        withPortal
        asChild
      >
        <Button
          size={"compact"}
          className="px-3 text-xs font-semibold h-10 text-white gap-2"
          variant="outline"
        >
          <Icon name="bin" className="w-4 h-4 text-red-400" />
          Remove
        </Button>
      </AlertDialog>
      <Button
        className="h-10 text-xs text-neutral-300 gap-1 hover:brightness-125 max-sm:px-3"
        variant={"secondary"}
        onClick={() => {
          setDaysWorkingFor(checkedIds);
          setOpenDaysWorking(true);
        }}
      >
        <Icon
          name="calendar"
          className="w-5 h-5 text-neutral-300 fill-none max-sm:hidden"
        />
        Assign Days
      </Button>
    </div>
  );
};
