/* eslint-disable @next/next/no-img-element */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileAttachment } from "./Manage";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { getPrettyFileType } from "./Item";
import { File, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import saveAs from "file-saver";

type SignedUrlCache = {
  [key: string]: { url: string; expiry: number };
};

export const FilePreview = ({
  currentFile,
  deleteFile,
  updateFile,
  titleRef,
}: {
  currentFile?: FileAttachment;
  deleteFile: () => Promise<void>;
  updateFile: (field: "title", value: string | boolean) => void;
  titleRef: React.RefObject<HTMLInputElement>;
}) => {
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [src, setSrc] = useState<string | null | undefined>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signedUrlCacheRef = useRef<SignedUrlCache>({});

  const getSignedUrl = useCallback(async (fileSrc: string) => {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(fileSrc, 86400);

    if (data?.signedUrl) {
      signedUrlCacheRef.current[fileSrc] = {
        url: data.signedUrl,
        expiry: Date.now() + 86400000, // 24 hours in milliseconds
      };
    }
    return data?.signedUrl;
  }, []);

  const getCachedOrFreshUrl = useCallback(
    async (fileSrc: string) => {
      const cachedItem = signedUrlCacheRef.current[fileSrc];
      if (cachedItem && cachedItem.expiry > Date.now()) {
        return cachedItem.url;
      }
      return getSignedUrl(fileSrc);
    },
    [getSignedUrl]
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setSrc(null);

    const loadSrc = async () => {
      if (!currentFile?.src || currentFile.id < 0) {
        if (currentFile?.file) {
          try {
            const objectUrl = URL.createObjectURL(currentFile.file);
            if (isMounted) setSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
          } catch (error) {
            console.error("Error creating object URL:", error);
          }
        }
      } else {
        const signedUrl = await getCachedOrFreshUrl(currentFile.src);
        if (isMounted) setSrc(signedUrl);
      }
      if (isMounted) setIsLoading(false);
    };

    loadSrc();

    return () => {
      isMounted = false;
    };
  }, [currentFile, getCachedOrFreshUrl]);

  const prettyFileType = useMemo(() => {
    if (!currentFile?.kind) return null;
    return getPrettyFileType(currentFile.kind);
  }, [currentFile?.kind]);

  const renderPreview = () => {
    const [type, subtype] = (currentFile?.kind || "").split("/");

    if (!src || !currentFile) return <></>;

    switch (type) {
      case "application":
        if (subtype === "pdf") {
          return (
            <>
              {isLoading && (
                <div className="rounded-md w-full  flex justify-center items-center">
                  <Skeleton className="w-full h-full" />
                </div>
              )}
              <iframe
                src={src}
                className="w-full h-full"
                onLoad={() => setIsLoading(false)}
                style={{ display: isLoading ? "none" : "block" }}
              />
            </>
          );
        }
        break;
      case "image":
        return (
          <>
            {isLoading && (
              <div className="rounded-md w-full  flex justify-center items-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <img
              src={src}
              alt={currentFile?.title ?? ""}
              className="max-w-full w-auto object-contain"
              onLoad={() => setIsLoading(false)}
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        );
      case "video":
        return (
          <>
            {isLoading && (
              <div className="rounded-md w-full  flex justify-center items-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <video
              src={src}
              controls
              className="max-w-full w-auto object-contain"
              onLoadedData={() => setIsLoading(false)}
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        );
      case "audio":
        return (
          <>
            {isLoading && (
              <div className="rounded-md w-full  flex justify-center items-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <audio
              src={src}
              controls
              className="max-w-[400px] w-full object-contain"
              onLoadedData={() => setIsLoading(false)}
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        );
    }

    return (
      <div className="rounded-md border-white w-full border-opacity-10 border flex justify-center items-center">
        <div className="flex flex-col justify-center items-center gap-3">
          <Icon name="file" className="w-20 h-20" />
          <div className="text-white mb-4 font-semibold leading-3 text-white/50 text-sm overflow-hidden text-center flex items-center gap-1">
            {currentFile?.title}
          </div>
          <Button
            variant={"secondary"}
            className="w-full gap-2 h-8 flex items-center justify-center text-xs max-w-[50%]"
            onClick={async () => {
              if (currentFile?.id > 0) {
                const { data, error } = await supabase.storage
                  .from("attachments")
                  .download(currentFile?.src as string);

                if (error) {
                  toast.error("Failed to download file");
                  return;
                }

                if (data) {
                  const blob = new Blob([data]);
                  saveAs(blob, currentFile.title || "download");
                }
              } else {
                window.open(src, "_blank");
              }
            }}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-1 flex-col gap-2 shadow min-h-[550px] ">
        {!!currentFile && (
          <>
            <div className="flex justify-between gap-2">
              <div className="px-2 flex-1 flex items-center bg-transparent hover:bg-white hover:bg-opacity-5 focus-within:bg-white focus-within:bg-opacity-5 rounded-md duration-100">
                <input
                  ref={titleRef}
                  value={currentFile?.title ?? ""}
                  placeholder="Title"
                  className="flex-1 text-[26px] min-h-[42px] font-bold placeholder:text-white placeholder:text-opacity-40 placeholder:text-xl bg-transparent leading-none resize-none overflow-hidden"
                  onChange={(e) => {
                    updateFile("title", e.target.value);
                  }}
                />
              </div>
              <DropdownMenu
                open={menuOpen}
                onOpenChange={(open) => setMenuOpen(open)}
              >
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="w-11 h-11 p-3 opacity-80 rounded-xl border border-transparent hover:bg-white/5 border-opacity-20 justify-center items-center flex"
                >
                  <Icon name="dots" className="w-[18px] h-[18px] text-white" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  hideWhenDetached
                  className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
                >
                  <DropdownMenuItem
                    onClick={async () => {
                      deleteFile();
                    }}
                    className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-white mb-4 font-semibold leading-3 text-white/50 text-sm overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1">
              <File className="w-4 h-4" /> {prettyFileType}
            </div>
            {src && (
              <div className="flex-1 max-h-[500px] flex justify-center rounded-md overflow-hidden bg-white/5">
                {renderPreview()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
