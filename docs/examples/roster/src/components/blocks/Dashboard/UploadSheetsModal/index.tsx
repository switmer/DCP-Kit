import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import React, { FC } from "react";
import { Icon } from "@/components/ui/Icon";
import { UploadButton } from "@/components/ui/Upload";
import { UploadHistoricalButton } from "@/components/ui/UploadHistorical";

type Props = {
  open: boolean;
  setShowUploadModal: (bool: boolean) => void;
};

export const UploadSheetsModal: FC<Props> = (props) => {
  return (
    <Dialog open={props.open} onOpenChange={() => {}}>
      <DialogContent
        onPointerDownOutside={() => props.setShowUploadModal(false)}
        className="!max-w-[550px] py-6"
      >
        <DialogHeader className="py-0">
          <DialogTitle className="flex items-center gap-4 pb-4">
            <Icon name="upload" className="w-[18px] h-[18px] fill-none" />
            Upload call sheets
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center items-center">
          <div className="py-2 px-4">
            <UploadButton
              setShowUploadModal={props.setShowUploadModal}
              bigSquare
            />
          </div>

          <div className="py-2 px-4">
            <UploadHistoricalButton
              setShowUploadModal={props.setShowUploadModal}
              variantStyle="lg-square"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
