"use client";

import { Dashboard } from "@uppy/react";
import { useUppy } from "@/lib/uppy";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export default function UppyDashboard({
  onDone,
  setShowUploadModal,
}: {
  onDone: () => void;
  setShowUploadModal?: (bool: boolean) => void;
}) {
  const { uppy } = useUppy();
  if (!uppy) return null;

  return (
    <Dashboard
      // className="w-[650px] max-sm:w-full"
      width="100%"
      height={500}
      uppy={uppy}
      id="supa-upload"
      theme="dark"
      doneButtonHandler={() => {
        onDone();
        setShowUploadModal && setShowUploadModal(false);
        uppy.cancelAll();
      }}
      proudlyDisplayPoweredByUppy={false}
    />
  );
}
