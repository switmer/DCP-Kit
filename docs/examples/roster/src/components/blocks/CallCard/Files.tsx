/* eslint-disable @next/next/no-img-element */
import { createClient } from "@/lib/supabase/client";
import { FileAttachment } from "@/types/type";
import React, { useState } from "react";
import { getPrettyFileType } from "../CallSheet/Files/Item";
import { Download, File } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import saveAs from "file-saver";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { wrap } from "popmotion";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useQuery } from "@tanstack/react-query";

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    };
  },
};

const swipeConfidenceThreshold = 10000;

const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export const Files = ({
  files,
  loading,
}: {
  files: FileAttachment[];
  loading: boolean;
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const supabase = createClient();

  const { data: signedUrls, isLoading: isLoadingUrls } = useQuery({
    queryKey: ["signedUrls", files.map((f) => f.src)],
    queryFn: async () => {
      const urls = await Promise.all(
        files.map(async (file) => {
          const { data } = await supabase.storage
            .from("attachments")
            .createSignedUrl(file.src as string, 86400);
          return { id: file.id, signedUrl: data?.signedUrl };
        })
      );
      return Object.fromEntries(
        urls.map(({ id, signedUrl }) => [id, signedUrl])
      );
    },
    enabled: files.length > 0,
  });

  const filesWithUrls = files.map((file) => ({
    ...file,
    signedUrl: signedUrls?.[file.id],
  }));

  if (!loading && !isLoadingUrls && !filesWithUrls.length) {
    return (
      <div className="flex flex-col">
        <div className="text-white text-base font-medium leading-tight">
          Attachments
        </div>

        <div className="pl-2 text-white/60">
          No attachments found for this project.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-white text-base font-medium leading-tight">
        Attachments
      </div>

      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4">
        <div className="w-2 min-w-2 max-w-2 flex flex-1 opacity-0 snap-start flex-shrink-0"></div>
        {(loading || isLoadingUrls) && (
          <>
            {[...new Array(2)].map((_, i) => (
              <FileItemSkeleton key={i} />
            ))}
          </>
        )}
        {filesWithUrls.map((file) => (
          <FileItem
            file={file}
            key={file.id}
            onClick={() => {
              setSelectedFileId(file.id);
              setShowPreview(true);
            }}
          />
        ))}
        <div className="w-2 min-w-2 max-w-2 flex flex-1 opacity-0 snap-start flex-shrink-0"></div>
      </div>

      {showPreview && (
        <FilesPreview
          files={filesWithUrls}
          selectedFileId={selectedFileId}
          setShowPreview={setShowPreview}
          showPreview={showPreview}
        />
      )}
    </>
  );
};

export const FilesPreview: React.FC<{
  files: (FileAttachment & { signedUrl?: string | null })[];
  selectedFileId: number | null;
  setShowPreview: (show: boolean) => void;
  showPreview: boolean;
}> = ({ files, selectedFileId, setShowPreview, showPreview }) => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [[index, direction], setCurrentIndex] = useState(() => {
    if (selectedFileId) {
      const selectedIndex = files.findIndex(
        (file) => file.id === selectedFileId
      );
      return [selectedIndex !== -1 ? selectedIndex : 0, 0];
    }
    return [0, 0];
  });

  const currentIndex = wrap(0, files.length, index);
  const currentFile = files[currentIndex];

  const paginate = (newDirection: number) => {
    const newIndex = index + newDirection;
    if (newIndex >= 0 && newIndex < files.length) {
      setCurrentIndex([newIndex, newDirection]);
    } else if (newIndex >= files.length) {
      setShowPreview(false);
    }
  };

  const renderPreview = () => {
    const [type, subtype] = (currentFile?.kind || "").split("/");

    if (!currentFile?.signedUrl || !currentFile) return <></>;

    switch (type) {
      case "application":
        if (subtype === "pdf") {
          return (
            <>
              {isLoading && (
                <div className="rounded-md w-full h-full flex justify-center items-center">
                  <Skeleton className="w-full h-full" />
                </div>
              )}
              <iframe
                src={currentFile?.signedUrl}
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
              <div className="rounded-md w-full h-full flex justify-center items-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <img
              src={currentFile?.signedUrl}
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
              <div className="rounded-md w-full h-full flex justify-center items-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <video
              src={currentFile?.signedUrl}
              controls
              className="max-w-full w-auto object-contain"
              onLoad={() => setIsLoading(false)}
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        );
      case "audio":
        return (
          <>
            {isLoading && (
              <div className="rounded-md w-full flex justify-center items-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <audio
              src={currentFile?.signedUrl}
              controls
              className="max-w-[400px] w-full object-contain"
              onLoad={() => setIsLoading(false)}
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        );
    }

    return (
      <div className="rounded-3xl border-white w-full h-full flex justify-center items-center">
        <div className="flex flex-col justify-center items-center gap-3 max-w-[90%]">
          <Icon name="file" className="w-20 h-20" />
          <div className="text-white mb-4 font-semibold leading-3 text-white/50 text-sm overflow-hidden text-center flex items-center gap-1">
            {currentFile?.title}
          </div>
          <Button
            variant={"secondary"}
            className="w-full gap-2 h-8 flex items-center justify-center text-xs max-w-[50%]"
            onClick={async () => {
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
    <AnimatePresence>
      {showPreview && (
        <motion.div
          className="fixed inset-0 bg-black z-50 flex justify-center items-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className={
              "max-w-[calc(100%-1rem)] flex flex-col gap-3 w-screen h-screen p-5 bg-inherit"
            }
          >
            <button
              onClick={() => setShowPreview(false)}
              className="w-10 h-10 absolute right-5 top-5 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>

            <div className="text-white/50 uppercase text-sm tracking-[1px] text-nowrap text-ellipsis overflow-hidden h-10 leading-10 w-[calc(100%-44px)]">
              {currentFile?.title}
            </div>

            <div className="relative flex flex-1 flex-col">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  className="inset-0 absolute cursor-grab"
                  key={currentIndex}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.35 },
                  }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);

                    if (swipe < -swipeConfidenceThreshold) {
                      paginate(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                      paginate(-1);
                    }
                  }}
                >
                  <div className="relative border-opacity-10 border flex flex-col w-full items-center justify-center overflow-hidden rounded-3xl z-0 h-full">
                    {renderPreview()}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
  onClick: () => void;
}> = ({ file, onClick }) => {
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
      onClick={onClick}
      className="relative rounded-[16px] overflow-hidden w-[160px] min-w-[160px] h-[140px] hover:bg-[#141414] duration-100 cursor-pointer flex flex-col justify-end items-end group"
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
