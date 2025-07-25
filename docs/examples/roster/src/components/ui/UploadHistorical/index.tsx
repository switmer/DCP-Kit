"use client";

import { Button } from "../Button";
import { Icon } from "../Icon";
import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadDialog } from "../UploadDialog";
import { useUppy } from "@/lib/uppy";
import { UploadResult } from "@uppy/core";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";
import { useCompanyStore } from "@/store/company";
import { useCallSheetProgressStore } from "@/store/callsheet-progress";

type Props = {
  setShowUploadModal?: (bool: boolean) => void;
  variantStyle?: "lg-square";
};

export const UploadHistoricalButton: React.FC<Props> = (props) => {
  const [visible, setVisible] = useState(false);
  const { activeCompany } = useCompanyStore();

  const supabase = createClient();

  const { setBulkUploadCallSheetsPlaceholders } = useCallSheetProgressStore();

  const startProcess = useCallback(async (path: string, bulkJobId?: number) => {
    return await fetch("/sheet/process/historical", {
      method: "POST",
      body: JSON.stringify({
        path,
        bulkJobId,
        company: activeCompany,
      }),
    }).then(async (res) => await res.json());
  }, []);

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const { uppy } = useUppy();

  useEffect(() => {
    const cb = async (
      result: UploadResult<Record<string, unknown>, Record<string, unknown>>
    ) => {
      const { data: bulkUploadData } = await supabase
        .from("bulk_upload")
        .insert({
          company: user?.id,
        })
        .select()
        .single();

      const processPromises = result.successful.map((file) => {
        if (!file.meta.objectName) {
          return;
        }

        return startProcess(file.meta.objectName as string, bulkUploadData?.id);
      });

      setBulkUploadCallSheetsPlaceholders(result.successful.length);

      Promise.all(processPromises).catch((error) => {
        toast.success("Something went wrong");
      });
    };

    uppy?.off("complete", cb).on("complete", cb);

    return () => {
      uppy?.off("complete", cb);
    };
  }, [startProcess, supabase, uppy, user?.id]);

  return (
    <>
      {props.variantStyle === "lg-square" && (
        <Button
          variant={"outline"}
          size={"compact"}
          className="flex flex-col items-start justify-start w-[235px] h-[235px] gap-3 px-7 py-10 text-white text-sm text-opacity-70 font-bold border-opacity-15 hover:bg-white/10 duration-100 rounded-3xl"
          onClick={() => {
            setVisible(true);
          }}
        >
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-yellow-400/30">
            <Icon
              name="import"
              className="w-[25px] h-[25px] fill-none text-yellow-400"
            />
          </div>
          <p className="text-[23px] text-white/80 font-bold">Past Sheets</p>
          <p className="text-sm text-white/60 text-left">
            Upload old call sheets to
            <br /> fill out your crew list &
            <br /> history of work.
          </p>
        </Button>
      )}

      {!props.variantStyle && (
        <Button
          variant={"outline"}
          size={"compact"}
          className="w-[150px] h-[42px] text-white text-sm text-opacity-70 font-bold gap-2 px-2 hover:bg-white hover:bg-opacity-5 duration-100 rounded-xl"
          onClick={() => {
            setVisible(true);
          }}
        >
          <>
            <Icon name="import" className="w-6 h-6" />
            Upload sheet
          </>
        </Button>
      )}

      <UploadDialog
        visible={visible}
        setVisible={setVisible}
        setShowUploadModal={props.setShowUploadModal}
      />
    </>
  );
};
