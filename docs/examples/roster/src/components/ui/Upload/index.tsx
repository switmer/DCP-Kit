"use client";

import { useDropzone } from "react-dropzone";
import { Button } from "../Button";
import { Icon } from "../Icon";
import React, { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingIndicator } from "../LoadingIndicator";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";
import { useCompanyStore } from "@/store/company";
import { useCallSheetProgressStore } from "@/store/callsheet-progress";

export const UploadButton: React.FC<{
  project?: string | null;
  square?: boolean;
  bigSquare?: boolean;
  setShowUploadModal?: (bool: boolean) => void;
}> = ({ project, square, bigSquare, setShowUploadModal }) => {
  const onDropAccepted = (files: File[]) => {
    upload(files[0]);
    setShowUploadModal && setShowUploadModal(false);
  };
  const { activeCompany } = useCompanyStore();

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDropAccepted,
  });

  const supabase = createClient();

  const { setCallSheetPlaceholders } = useCallSheetProgressStore();

  const {
    /* @ts-ignore */
    data: { user } = {},
    isLoading: loading,
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const userId = user?.id;

  const upload = useCallback(
    (file: File) => {
      setCallSheetPlaceholders(1);
      supabase.storage
        .from("call-sheets")
        .upload(`${userId}/sheet_${new Date().toISOString()}.pdf`, file)
        .then(async ({ data: callSheetData, error: callSheetError }) => {
          if (callSheetError || !callSheetData.path) {
            toast.error("Something went wrong.");
            return;
          }

          fetch("/sheet/process", {
            method: "POST",
            body: JSON.stringify({
              callSheetSrc: callSheetData.path,
              project,
              company: activeCompany,
            }),
          })
            .then(async (res) => await res.json())
            .catch(() => {
              toast.error("Something went wrong.");
            });
        });
    },
    [setCallSheetPlaceholders, supabase.storage, userId, project, activeCompany]
  );

  return (
    <div
      {...getRootProps({
        className: "justify-center items-center flex group cursor-pointer",
      })}
    >
      <input {...getInputProps()} />

      {bigSquare && (
        <Button
          className="flex flex-col items-start justify-start w-[235px] h-[235px] gap-3 px-7 py-10 bg-accent/10 text-sm rounded-3xl hover:bg-accent/20 max-sm:px-1 max-sm:min-w-[150px]"
          disabled={loading}
        >
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-lime-300/50">
            <Icon name="upload" className="w-[18px] h-[18px] fill-none" />
          </div>
          <p className="text-[23px] text-white/80 font-bold">Upcoming</p>
          <p className="text-sm text-white/60 text-left">
            Parse a call sheet to send
            <br /> out to your crew & talent.
          </p>
        </Button>
      )}

      {square && (
        <button className="cursor-pointer w-[38px] h-[38px] flex items-center justify-center bg-lime-300 bg-opacity-20 rounded-[9px]">
          {!loading ? (
            <>
              <Icon name="plus" className="w-[18px] h-[18px] text-lime-300" />
            </>
          ) : (
            <LoadingIndicator accent size="small" />
          )}
        </button>
      )}

      {!square && !bigSquare && (
        <Button
          variant="accent"
          className="gap-2 flex-1 px-7 text-sm min-w-[199px] max-sm:px-1 max-sm:min-w-[150px]"
          disabled={loading}
        >
          <>
            <Icon name="upload" className="w-[18px] h-[18px] fill-none" />
            <p className="max-sm:hidden">Upload call sheet</p>

            <p className="hidden max-sm:block">Upload sheet</p>
          </>
        </Button>
      )}
    </div>
  );
};
