/* eslint-disable @next/next/no-img-element */
"use client";

import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FileAttachment } from "@/types/type";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { File } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ManageProjectFiles } from "@/components/blocks/ProjectDashboard/ProjectFiles/ManageProjectFiles";
import { getPrettyFileType } from "@/components/blocks/CallSheet/Files/Item";
import { formatDistanceStrict } from "date-fns";

type Props = {
  projectId: string;
  view?: "dash";
  projectFilesModalOpen: boolean;
  setProjectFilesModalOpen: (open: boolean) => void;
  setFilesEmpty: (bool: boolean) => void;
};

const renderPreview = (
  file: FileAttachment & { signedUrl?: string | null },
  view?: "dash"
) => {
  const [type, subtype] = (file?.kind || "").split("/");

  if (!file.signedUrl) return <></>;

  switch (type) {
    case "application":
      if (subtype === "pdf") {
        if (view === "dash") {
          //-- use a wrapper with overflow and scaling to completely hide toolbar
          return (
            <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 flex justify-center items-center rounded-lg"
                style={{
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.7)",
                }}
              >
                {/* icon as fallback */}
                <Icon
                  name="file-pdf"
                  className="w-10 h-10 text-white/50 absolute z-10"
                />

                {/* scaled iframe to make sure toolbars are hidden */}
                <iframe
                  src={`${file.signedUrl}#view=fitH`}
                  className="absolute"
                  style={{
                    width: "200%",
                    height: "200%",
                    top: "-40px",
                    left: "-31px",
                    opacity: 0.9,
                    pointerEvents: "none",
                    transform: "scale(0.8)",
                    zIndex: 5,
                  }}
                  frameBorder="0"
                />

                {/* label overlay */}
                {/*<div className="z-20 absolute bottom-0 left-0 right-0 bg-black/70 py-1 text-xs text-white/70 text-center">*/}
                {/*  PDF*/}
                {/*</div>*/}
              </div>
            </div>
          );
        } else {
          return (
            <iframe
              src={`${file.signedUrl}#toolbar=0&scrollbar=0`}
              className="w-full h-full"
              frameBorder="0"
            />
          );
        }
      }
      break;

    case "image":
      return (
        <>
          <img
            src={file.signedUrl}
            alt={file?.title ?? ""}
            className="max-w-full w-auto h-full object-contain"
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

export const ProjectFiles: React.FC<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filesModalOpen, setFilesModalOpen] = useState<number | null | boolean>(
    null
  );

  const [projectFiles, setProjectFiles] = useState<FileAttachment[]>([]);
  const [previewFiles, setPreviewFiles] = useState<
    (FileAttachment & { signedUrl?: string | null })[]
  >([]);

  const supabase = createClient();

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

  const fetchProjectFiles = useCallback(() => {
    setIsLoading(true);

    supabase
      .from("file")
      .select()
      .eq("project", props.projectId)
      .then(({ data }) => {
        if (!data || !data.length) {
          setIsLoading(false);

          return;
        }

        setProjectFiles(data);
      });

    setIsLoading(false);
  }, [props.projectId]);

  useEffect(() => {
    fetchProjectFiles();
  }, [props.projectId]);

  useEffect(() => {
    if (!projectFiles.length) {
      setPreviewFiles([]);

      return;
    }

    const updateFilesWithSignedUrls = async () => {
      const updatedFiles = await Promise.all(
        projectFiles.map(async (file) => ({
          ...file,
          signedUrl: await getSignedUrl(file),
        }))
      );

      setPreviewFiles(updatedFiles);
      setIsLoading(false);
    };

    updateFilesWithSignedUrls();
  }, [projectFiles, getSignedUrl]);

  useEffect(() => {
    setProjectFiles(projectFiles);
  }, [projectFiles]);

  useEffect(() => {
    setFilesModalOpen(props.projectFilesModalOpen);
  }, [props.projectFilesModalOpen]);

  useEffect(() => {
    if (typeof filesModalOpen !== "number" && filesModalOpen !== null) {
      props.setProjectFilesModalOpen(filesModalOpen);
      return;
    }

    props.setProjectFilesModalOpen(!!filesModalOpen);
  }, [filesModalOpen]);

  useEffect(() => {
    if (projectFiles.length === 0) {
      props.setFilesEmpty(true);
    } else {
      props.setFilesEmpty(false);
    }
  }, [projectFiles]);

  const formattedDistance = (distance: string) => {
    return distance
      .replace(/ hours?/, "h")
      .replace(/ minutes?/, "m")
      .replace(/ seconds?/, "s")
      .replace(/ days?/, "d")
      .replace(/ months?/, "mo")
      .replace(/ years?/, "y");
  };

  return (
    <>
      {isLoading ? (
        <>
          {[...new Array(2)].map((_, i) => (
            <FileItemSkeleton key={i} />
          ))}
        </>
      ) : (
        <>
          {!isLoading && previewFiles.length > 0 && props.view === "dash" && (
            <div className="flex flex-col gap-[6px] w-full mt-2 overflow-y-scroll hide-scrollbars">
              {previewFiles.map((file) => {
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 w-full min-h-[75px] h-[75px] px-2 rounded-lg bg-white bg-opacity-[0.02] border border-white/10 hover:bg-opacity-[0.04] hover:border-white/30 cursor-pointer"
                    onClick={() => setFilesModalOpen(file.id)}
                  >
                    <div className="flex items-center justify-center rounded-lg w-[55px] h-[55px]">
                      {file.signedUrl ? (
                        renderPreview(file, "dash")
                      ) : (
                        <Icon name="file" className="w-5 h-5 text-white/50" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-white/100">
                        {file.title}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-[2px]">
                          <Icon
                            name="clock"
                            className="w-[14px] h-[14px] text-white/30"
                          />

                          <div className="text-xs text-white/40">{`Uploaded: ${formattedDistance(
                            formatDistanceStrict(new Date(), file.created_at, {
                              addSuffix: false,
                            })
                          )} ago`}</div>
                        </div>

                        {file.kind && (
                          <div className="text-xs text-white/30">
                            {getPrettyFileType(file.kind)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && previewFiles.length === 0 && (
            <div
              className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
              onClick={(e) => {
                setFilesModalOpen(true);
              }}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <Icon
                  name="attachment"
                  className="w-[35px] h-[35px] text-white/45 group-hover:text-white/60"
                />

                <div className="flex gap-3 items-center justify-center w-full pb-2">
                  <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                    <Icon
                      name="plus"
                      className="w-5 h-5 text-white/30 group-hover:text-white/50"
                    />
                  </div>

                  <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                    Add Files
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && previewFiles.length > 0 && props.view !== "dash" && (
            <div className="flex flex-col">
              {/*<div className="flex items-center gap-3 pb-2">*/}
              {/*  <Icon*/}
              {/*    name="attachment"*/}
              {/*    className="w-[22px] h-[22px] text-white/70"*/}
              {/*  />*/}
              {/*  <div className="text-xl text-white/80">Files</div>*/}
              {/*</div>*/}

              <div
                className={cn(
                  "flex gap-3 h-[125px] flex-wrap max-sm:overflow-x-scroll max-sm:items-center max-sm:hidden"
                )}
              >
                {previewFiles.map((file) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    setOpen={setFilesModalOpen}
                  />
                ))}

                <div className="flex flex-col items-center justify-evenly gap-2 pr-3 h-full max-sm:hidden max-sm:py-3">
                  <div
                    onClick={() => {
                      setFilesModalOpen(true);
                    }}
                    className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                  >
                    <Icon name="plus" className="w-8 h-8" />
                  </div>

                  <div
                    onClick={() => {
                      // setSelectedLocation(null);
                      setFilesModalOpen(true);
                    }}
                    className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                  >
                    <Icon name="edit" className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="hidden max-sm:flex max-sm:flex-col gap-[6px] w-full mt-2 mb-20 overflow-y-scroll hide-scrollbars max-sm:gap-4">
                {previewFiles.map((file) => {
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 w-full min-h-[75px] h-[75px] px-2 rounded-lg bg-white bg-opacity-[0.02] border border-white/10 hover:bg-opacity-[0.04] hover:border-white/30 cursor-pointer"
                      onClick={() => setFilesModalOpen(file.id)}
                    >
                      <div className="flex items-center justify-center rounded-lg w-[55px] h-[55px]">
                        {file.signedUrl ? (
                          renderPreview(file, "dash")
                        ) : (
                          <Icon name="file" className="w-5 h-5 text-white/50" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-white/100">
                          {file.title}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-[2px]">
                            <Icon
                              name="clock"
                              className="w-[14px] h-[14px] text-white/30"
                            />

                            <div className="text-xs text-white/40">{`Uploaded: ${formattedDistance(
                              formatDistanceStrict(
                                new Date(),
                                file.created_at,
                                {
                                  addSuffix: false,
                                }
                              )
                            )} ago`}</div>
                          </div>

                          {file.kind && (
                            <div className="text-xs text-white/30">
                              {getPrettyFileType(file.kind)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={() => {
                    setFilesModalOpen(true);
                  }}
                  className="hidden group max-sm:flex items-center justify-center gap-2 w-[120px] min-h-[50px] rounded-xl border border-zinc-700 cursor-pointer hover:bg-white/5"
                >
                  <Icon
                    name="plus"
                    className="w-5 h-5 text-white text-opacity-70 duration-150 group-hover:text-opacity-90"
                  />
                  <div className="text-white/70 group-hover:text-white/90">
                    Add File
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {filesModalOpen && (
        <ManageProjectFiles
          files={projectFiles}
          project={props.projectId}
          open={filesModalOpen}
          setFiles={setProjectFiles}
          onClose={(f) => {
            if (f) {
              setProjectFiles(f);
            }

            setFilesModalOpen(null);
          }}
        />
      )}
    </>
  );
};

const FileItemSkeleton: React.FC = () => {
  return (
    <div className="relative rounded-[16px] overflow-hidden w-[160px] h-[125px] hover:bg-[#141414] duration-100 cursor-pointer flex flex-col justify-end items-end group">
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
  return (
    <div
      key={file.id}
      onClick={() => setOpen(file.id)}
      className="relative rounded-[16px] overflow-hidden w-[160px] h-[125px] hover:bg-[#141414] duration-100 cursor-pointer flex flex-col justify-end items-end group"
    >
      <div className="absolute inset-2 overflow-hidden rounded-md pointer-events-none">
        {renderPreview(file)}
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
