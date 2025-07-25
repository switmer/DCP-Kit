"use client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { useCompanyStore } from "@/store/company";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { ProjectType } from "@/types/type";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useRouter } from "next-nprogress-bar";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export const Parse = () => {
  const supabase = createClient();
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [project, setProject] = useState<string | undefined>();

  const {
    /* @ts-ignore */
    data: { user } = {},
    isLoading: loading,
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });
  const userId = user?.id;

  const { activeCompany } = useCompanyStore();

  const router = useRouter();

  useEffect(() => {
    if (activeCompany) {
      supabase
        .from("project")
        .select(
          `
            *,
            call_sheet (
              *
            )
          `
        )
        .eq("company", activeCompany)
        .then(({ data }) => {
          setProjects(data ?? []);
        });
    }
  }, [activeCompany]);

  const upload = useCallback(
    (file: File) => {
      setLoadingUpload(true);
      supabase.storage
        .from("call-sheets")
        .upload(`${userId}/sheet_${new Date().toISOString()}.pdf`, file)
        .then(async ({ data: callSheetData, error: callSheetError }) => {
          if (callSheetError || !callSheetData.path) {
            toast.error("Something went wrong.");
            return;
          }

          const { data, error } = await supabase
            .from("call_sheet")
            .insert({
              src: callSheetData.path,
              company: activeCompany,
              project: project,
              historical: false,
              status: "ready",
            })
            .select()
            .single();

          if (error || !data) {
            toast.error("Something went wrong.");
            return;
          }

          router.push(`/parse/${data?.short_id}`);
          setLoadingUpload(false);
        });
    },
    [supabase, userId, activeCompany, project, router]
  );

  const onDropAccepted = (files: File[]) => {
    upload(files[0]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDropAccepted,
  });

  if (loadingUpload) {
    return <LoadingIndicator />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Select
        /* @ts-ignore */
        value={project}
        onValueChange={(value) => setProject(value)}
      >
        <SelectTrigger className="w-[235px]">
          {projects?.find((p) => p.id == project)?.name || "Select a project"}
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {/* @ts-ignore */}
              {p.name} ({p.call_sheet?.length} call sheets)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="max-w-[235px]">
        <div
          {...getRootProps({
            className: "group cursor-pointer",
          })}
        >
          <input {...getInputProps()} />
          <Button
            className="flex flex-col items-start justify-start w-[235px] h-[235px] gap-3 px-7 py-10 bg-accent/10 text-sm rounded-3xl hover:bg-accent/20 max-sm:px-1 max-sm:min-w-[150px]"
            disabled={loading}
          >
            <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-lime-300/50">
              <Icon name="upload" className="w-[18px] h-[18px] fill-none" />
            </div>
            <p className="text-[23px] text-white/80 font-bold">
              Upload a sheet
            </p>
          </Button>
        </div>
      </div>
    </div>
  );
};
