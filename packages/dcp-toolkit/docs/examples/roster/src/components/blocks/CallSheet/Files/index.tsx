/* eslint-disable @next/next/no-img-element */
"use client";

import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FileAttachment } from "@/types/type";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ManageFiles } from "./Manage";
import { File } from "lucide-react";
import { getPrettyFileType } from "./Item";
import { Skeleton } from "@/components/ui/Skeleton";

export const Files: React.FC<{
  callSheet: string;
  project: string;
  sheetFiles: FileAttachment[];
}> = ({ callSheet, project, sheetFiles }) => {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [previewFiles, setPreviewFiles] = useState<
    (FileAttachment & { signedUrl?: string | null })[]
  >([]);

  const [open, setOpen] = useState<number | null | boolean>(null);

  const signedUrlCacheRef = useRef<{
    [key: string]: { url: string; expiry: number };
  }>({});

  const getSignedUrl = useCallback(
    async (file: FileAttachment) => {
      if (!file.src) return null;

      const cacheKey = file.src;
      const cachedItem = signedUrlCacheRef.current[cacheKey];

      if (cachedItem && cachedItem.expiry > Date.now()) {
        return cachedItem.url;
      }

      try {
        const { data } = await supabase.storage
          .from("attachments")
          .createSignedUrl(file.src, 86400);

        if (data?.signedUrl) {
          signedUrlCacheRef.current[cacheKey] = {
            url: data.signedUrl,
            expiry: Date.now() + 86400000, // 24 hours in milliseconds
          };
          return data.signedUrl;
        }
      } catch (error) {
        console.error("Error creating signed URL:", error);
      }

      return null;
    },
    [supabase]
  );

  useEffect(() => {
    if (!files.length) {
      setPreviewFiles([]);
      return;
    }

    const updateFilesWithSignedUrls = async () => {
      const updatedFiles = await Promise.all(
        files.map(async (file) => ({
          ...file,
          signedUrl: await getSignedUrl(file),
        }))
      );

      setPreviewFiles(updatedFiles);
      setLoading(false);
    };

    updateFilesWithSignedUrls();
  }, [files, getSignedUrl]);

  useEffect(() => {
    setFiles(sheetFiles);
  }, [sheetFiles]);

  return (
    <>
      <div
        className={cn(
          "flex gap-3 flex-wrap max-sm:overflow-x-scroll max-sm:h-[125px] max-sm:items-center"
        )}
      >
        {loading ? (
          <>
            {[...new Array(2)].map((_, i) => (
              <FileItemSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            {previewFiles.map((file) => (
              <FileItem key={file.id} file={file} setOpen={setOpen} />
            ))}
          </>
        )}
        {!loading && (
          <div
            onClick={() => {
              setOpen(true);
              setTimeout(() => {
                document.getElementById(`default_FILE_INPUT`)?.click();
              }, 0);
            }}
            className="flex-1 min-w-[200px] max-w-[200px] h-[125px] flex items-center justify-center rounded-xl border-[3px] border-white/20 border-dashed flex-col p-4 gap-3 cursor-pointer hover:bg-white/5 duration-100"
          >
            <Icon
              name="attachment"
              className="w-9 h-9 fill-none text-[#2f2f2f]"
            />
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <Icon name="plus-alt" className="text-[#a4a4a4] w-4 h-4" />
              </div>
              <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                Add files
              </div>
            </div>
          </div>
        )}
      </div>
      {open && (
        <ManageFiles
          files={files}
          callSheet={callSheet}
          project={project}
          open={open}
          setFiles={setFiles}
          onClose={(f) => {
            if (f) {
              setFiles(f);
            }
            setOpen(null);
          }}
        />
      )}
    </>
  );
};

const FileItemSkeleton: React.FC = () => {
  return (
    <div className="relative rounded-[16px] overflow-hidden w-[160px] h-[140px] hover:bg-[#141414] duration-100 cursor-pointer flex flex-col justify-end items-end group">
      <div className="absolute inset-2 overflow-hidden rounded-md pointer-events-none">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-2 flex flex-col gap-1 bg-background group-hover:bg-[#141414] duration-100 w-full z-[1]">
        <div className="text-base leading-snug font-medium text-white text-opacity-80 overflow-hidden text-ellipsis whitespace-nowrap">
          <Skeleton className="w-full h-4" />
        </div>

        <div className="flex items-center gap-1 text-xs font-medium leading-none text-white text-opacity-80">
          <Skeleton className="w-10 h-2" />
        </div>
      </div>
    </div>
  );
};

export const FileItem: React.FC<{
  file: FileAttachment & { signedUrl?: string | null };
  setOpen: (id: number) => void;
}> = ({ file, setOpen }) => {
  const renderPreview = () => {
    const [type, subtype] = (file?.kind || "").split("/");

    if (!file.signedUrl) return <></>;

    switch (type) {
      case "application":
        if (subtype === "pdf") {
          return (
            <>
              <iframe
                src={`${file.signedUrl}#toolbar=0&scrollbar=0`}
                className="w-full h-full"
              />
            </>
          );
        }
        break;
      case "image":
        return (
          <>
            <img
              src={file.signedUrl}
              alt={file?.title ?? ""}
              className="max-w-full w-auto object-contain"
            />
          </>
        );
      case "video":
        return (
          <>
            <video
              src={file.signedUrl}
              controls={false}
              muted
              className="max-w-full w-auto object-contain"
            />
          </>
        );
    }

    return (
      <div className="rounded-md border-white w-full flex justify-center items-center">
        <div className="flex flex-col justify-center items-center gap-3">
          <Icon name="file" className="w-20 h-20" />
        </div>
      </div>
    );
  };

  return (
    <div
      key={file.id}
      onClick={() => setOpen(file.id)}
      className="relative rounded-[16px] overflow-hidden w-[160px] h-[140px] hover:bg-[#141414] duration-100 cursor-pointer flex flex-col justify-end items-end group"
    >
      <div className="absolute inset-2 overflow-hidden rounded-md pointer-events-none">
        {renderPreview()}
      </div>
      <div className="p-2 flex flex-col gap-1 bg-background group-hover:bg-[#141414] duration-100 w-full z-[1]">
        {file.title && (
          <div className="text-base leading-snug font-medium text-white text-opacity-80 overflow-hidden text-ellipsis whitespace-nowrap">
            {file.title}
          </div>
        )}
        {file.kind && (
          <div className="flex items-center gap-1 text-xs font-medium leading-none text-white text-opacity-80">
            <File className="w-3 h-3" /> {getPrettyFileType(file.kind)}
          </div>
        )}
      </div>
    </div>
  );
};
