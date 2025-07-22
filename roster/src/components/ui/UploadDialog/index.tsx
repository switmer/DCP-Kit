"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import UppyDashboard from "../Uppy";
import React from "react";

export const UploadDialog: React.FC<{
  visible: boolean;
  setVisible: (visible: boolean) => void;
  setShowUploadModal?: (bool: boolean) => void;
}> = ({ visible, setVisible, setShowUploadModal }) => {
  return (
    <Dialog
      defaultOpen={visible}
      open={visible}
      onOpenChange={(open) => setVisible(open)}
    >
      <DialogContent
        className="w-[650px] gap-0 max-w-[650px] max-sm:w-[350px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Upload Call Sheets</DialogTitle>
        </DialogHeader>

        <div className="w-full">
          <UppyDashboard
            onDone={() => setVisible(false)}
            setShowUploadModal={setShowUploadModal}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
