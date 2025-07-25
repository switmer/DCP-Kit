import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import React, { FC } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const SetupWizard: FC<Props> = (props) => {
  return (
    <Dialog
      defaultOpen={props.open}
      open={props.open}
      onOpenChange={(o) => {
        if (!o) {
          props.onClose();
        }
      }}
    >
      <DialogContent className="max-w-[800px] w-[800px] gap-0">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Adding positions needed</DialogTitle>
            <button
              onClick={props.onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="px-4 text-sm font-semibold"
            variant="outline"
            size="compact"
            onClick={props.onClose}
          >
            Cancel
          </Button>
          {/*<Button*/}
          {/*  className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"*/}
          {/*  variant="accent"*/}
          {/*  size="compact"*/}
          {/*  onClick={() => {}}*/}
          {/*>*/}
          {/*  Next*/}
          {/*</Button>*/}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
