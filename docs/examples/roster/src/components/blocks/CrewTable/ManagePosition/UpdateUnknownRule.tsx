import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContentPortless,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { createClient } from "@/lib/supabase/client";
import { searchDepartments } from "@/rules/departments";
import { PositionType } from "@/types/type";
import { useEffect, useMemo, useState } from "react";
import { useCrewStore } from "@/store/crew";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/Label";

import Link from "next/link";
import { capitalizeString, stringToParam } from "@/lib/utils";

export const UpdateUnknownRule: React.FC<{
  position: PositionType;
  onClose: () => void;
  open?: boolean;
  onMerge?: () => void;
  onCreate?: () => void;
  setOpen: (open: boolean) => void;
}> = ({ position, onClose, open, onMerge, onCreate, setOpen }) => {
  const supabase = createClient();
  const [usedBy, setUsedBy] = useState<number>(0);

  const { company } = useCrewStore();

  useEffect(() => {
    if (!company?.id || !position) return;

    supabase
      .from("company_crew_member")
      .select(
        `
        position!inner(
          id
        )
      `,
        { count: "exact" }
      )
      .eq("company", company?.id)
      .or(
        [position?.name]
          .map((r) => `name.eq.${r?.toLocaleLowerCase()}`)
          .join(", "),
        { foreignTable: "position" }
      )
      .then(({ count }) => {
        setUsedBy(count ?? 0);
      });
  }, [company?.id, position]);

  const cleanedPosition = useMemo(() => {
    return {
      name: capitalizeString(position?.name ?? ""),
      department:
        position?.department?.map(
          (d) => searchDepartments(d)?.department ?? capitalizeString(d)
        ) ?? [],
    };
  }, [position]);

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
        setOpen(o);
      }}
    >
      <DialogContentPortless
        className="gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div
                className="flex flex-col gap-[2px]
            "
              >
                Edit Position
                <span className="text-white text-opacity-50 text-base font-normal leading-none">
                  {cleanedPosition.name}
                </span>
              </div>
            </DialogTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6">
          <Label>Position</Label>
          <div className="text-white text-2xl font-medium">
            {cleanedPosition.name}
          </div>
          <Label>Department</Label>
          <div className="text-white text-2xl font-medium">
            {cleanedPosition.department.join(", ")}
          </div>

          <Label>Used by</Label>
          <Link
            onClick={() => onClose()}
            href={`/crew/${stringToParam(
              cleanedPosition.department[0]
            )}/${stringToParam(cleanedPosition.name)}`}
            className="px-2 py-1.5 bg-zinc-900 rounded-lg justify-start items-center gap-2 inline-flex text-white text-sm font-medium leading-tight w-fit"
          >
            {usedBy ?? 0} {(usedBy ?? 0) === 1 ? "person" : "people"}
            <Icon name="chevron-small" className="w-4 h-4" />
          </Link>
        </div>

        <div className="px-6 py-3 bg-yellow-400 bg-opacity-10 items-center gap-2 flex">
          <Icon name="alert" className="text-yellow-400 w-4 h-4" />
          <div className=" text-yellow-400 text-sm font-medium leading-tight">
            This is an unknown position
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-1 gap-2">
            <Button
              className="px-4 text-sm font-semibold"
              variant="alert"
              size="compact"
              onClick={onMerge}
            >
              Merge into existing
            </Button>

            <Button
              className="px-4 text-sm font-semibold"
              variant="outline"
              size="compact"
              onClick={onCreate}
            >
              Create as new
            </Button>
          </div>
        </DialogFooter>
      </DialogContentPortless>
    </Dialog>
  );
};
