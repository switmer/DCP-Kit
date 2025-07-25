import { useCallback, useState } from "react";
import {
  DropdownMenuContent,
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../DropdownMenu";
import { Icon } from "../Icon";
import { LoadingIndicator } from "../LoadingIndicator";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";
import { createClient } from "@/lib/supabase/client";
import { useCallSheetProgressStore } from "@/store/callsheet-progress";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useCompanyStore } from "@/store/company";
import { useRouter } from "next-nprogress-bar";

export const UploadButtonCallSheet: React.FC<{ project: string }> = ({
  project,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();
  const {
    /* @ts-ignore */
    data: { user } = {},
    isLoading: loading,
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const userId = user?.id;

  const { setCallSheetPlaceholders } = useCallSheetProgressStore();

  const onDropAccepted = (files: File[]) => {
    upload(files[0]);
  };
  const { activeCompany } = useCompanyStore();
  const router = useRouter();

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDropAccepted,
  });

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

  const addWorkday = async () => {
    const { data } = await supabase
      .from("call_sheet")
      .insert({
        company: activeCompany,
        status: "ready",
        project: project,
      })
      .select()
      .single();

    router.push(`/sheet/${data?.short_id}`);
  };

  return (
    <div className="justify-center items-center flex group cursor-pointer">
      <DropdownMenu open={menuOpen} onOpenChange={(open) => setMenuOpen(open)}>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer w-[38px] h-[38px] flex items-center justify-center bg-lime-300 bg-opacity-20 rounded-[9px]">
            {!loading ? (
              <>
                <Icon name="plus" className="w-[18px] h-[18px] text-lime-300" />
              </>
            ) : (
              <LoadingIndicator accent size="small" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            side="right"
            align="start"
            hideWhenDetached
            className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
          >
            <DropdownMenuItem className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm">
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                Upload call sheet
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={addWorkday}
              className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
            >
              Add workday
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
};
