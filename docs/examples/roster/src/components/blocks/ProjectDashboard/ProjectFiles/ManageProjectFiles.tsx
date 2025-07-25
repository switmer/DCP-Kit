import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { FileAttachment as FileAttachmentType } from "@/types/type";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCompanyStore } from "@/store/company";
import { List } from "@/components/blocks/CallSheet/Files/List";
import { FilePreview } from "@/components/blocks/CallSheet/Files/Preview";

export interface FileAttachment extends FileAttachmentType {
  file?: File;
}

interface ManageFilesProps {
  open?: number | null | boolean;
  onClose: (files?: FileAttachment[]) => void;
  setFiles: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
  files: FileAttachment[];
  project: string;
}

type FileType = "default";

const createNewFile = (
  type: FileType,
  project: string,
  company: string | null
  /* @ts-ignore */
): FileAttachment => ({
  id: -Date.now(),
  company,
  title: "",
  priority: 0,
  project,
  src: "",
  type,
});

export const ManageProjectFiles: React.FC<ManageFilesProps> = ({
  open,
  onClose,
  files,
  project,
  setFiles,
}) => {
  const [current, setCurrent] = useState(open);
  const titleRef = useRef<HTMLInputElement>(null);
  const { activeCompany } = useCompanyStore();
  const [saving, setSaving] = useState(false);
  const [containers, setContainers] = useState<{
    default: FileAttachment[];
  }>({
    default: files.filter((n) => n.type === "default"),
  });

  const supabase = createClient();

  useEffect(() => {
    if (typeof open === "boolean") {
      setCurrent(files[0]?.id ?? null);

      return;
    }

    setCurrent(open);
  }, [open]);

  const currentFile: FileAttachment | undefined = useMemo(
    () => [...containers.default].find((n) => n.id === current),
    [containers, current]
  );

  const addNew = (type: FileType, selectedFile: File) => {
    const newFile = createNewFile(type, project, activeCompany);

    const fileAttachment: FileAttachment = {
      ...newFile,
      src: "",
      file: selectedFile,
      title: selectedFile.name || `New Attachment`,
      kind: selectedFile.type,
    };

    setContainers((prevContainers) => ({
      ...prevContainers,
      [type]: [
        ...prevContainers[type].map((n) => ({
          ...n,
          priority: (n?.priority ?? 0) + 1,
        })),
        fileAttachment,
      ],
    }));

    setCurrent(fileAttachment.id);
  };

  const handleSave = async () => {
    if (current !== null) {
      setSaving(true);

      const filesToSave = await Promise.all(
        [...containers.default]
          .map(async (f, index) => {
            const type = containers.default.some((n) => n.id === f.id)
              ? "default"
              : "signable";

            if (f.id < 0) {
              const { id, file, ...fileWithoutId } = f;

              if (!f.file) return null;

              const { data, error } = await supabase.storage
                .from("attachments")
                .upload(
                  [activeCompany, f.project, f.title].filter(Boolean).join("/"),
                  f.file,
                  {
                    upsert: true,
                  }
                );

              if (error) {
                toast.error(`Error saving file: ${f.title ?? f.file?.name}`);

                return null;
              }

              return {
                ...fileWithoutId,
                type,
                priority: index,
                src: data?.path,
              };
            }

            return { ...f, type, priority: index };
          })
          .filter((f) => !!f)
      );

      const { data, error } = await supabase
        .from("file")
        .upsert(filesToSave as FileAttachment[], { defaultToNull: false })
        .select()
        .order("priority", { ascending: true });

      if (error) {
        toast.error(`Error saving files: ${error.message}`);
      } else {
        onClose(data);
      }

      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (currentFile) {
      if (currentFile.id > 0) {
        const { error } = await supabase
          .from("file")
          .delete()
          .eq("id", currentFile.id);

        if (currentFile.src) {
          await supabase.storage.from("attachments").remove([currentFile.src]);
        }
        if (error) {
          toast.error(`Error deleting file: ${error.message}`);
        }
      }

      setFiles((f) => f.filter((file) => file.id !== currentFile.id));

      setContainers((prevContainers) => ({
        ...prevContainers,
        [currentFile?.type as "default"]: prevContainers[
          currentFile?.type as "default"
        ].filter((file) => file.id !== currentFile.id),
      }));
    }
  };

  const handleUpdate = (field: "title", value: string | boolean) => {
    if (currentFile) {
      const fileType = currentFile.type as "default";
      setContainers((prevContainers) => ({
        [fileType]: prevContainers[fileType].map((file) =>
          file.id === currentFile.id
            ? { ...file, [field]: value as FileAttachment[typeof field] }
            : file
        ),
      }));
    }
  };

  useEffect(() => {
    // Cleanup function to revoke object URLs
    return () => {
      [...containers.default].forEach((file) => {
        if (file.src && file.src.startsWith("blob:")) {
          URL.revokeObjectURL(file.src);
        }
      });
    };
  }, [containers]);

  useEffect(() => {
    if (current !== null && titleRef.current) {
      titleRef.current.focus();

      const length = titleRef.current.value.length;
      titleRef.current.setSelectionRange(length, length);
    }
  }, [current]);

  return (
    <Dialog
      defaultOpen={!!open}
      open={!!open}
      onOpenChange={(o) => {
        if (!o) {
          onClose(files?.filter((f) => f.id > 0));
        }
      }}
    >
      <DialogContent className="max-w-[800px] w-full gap-0 max-sm:h-full">
        <DialogHeader className="max-sm:h-[75px]">
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items center gap-2 items-center">
                Manage project files
              </div>
            </DialogTitle>

            <button
              onClick={() => onClose(files?.filter((f) => f.id > 0))}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 flex gap-6 max-w-[800px] overflow-hidden max-sm:flex-col max-sm:overflow-y-scroll">
          <div className="flex flex-1 flex-col gap-2 min-w-[240px] max-w-[240px]">
            <div className="w-full max-h-[500px] h-auto overflow-y-auto flex flex-col">
              <List
                containers={containers}
                setContainers={setContainers}
                current={current}
                setCurrent={setCurrent}
                addNew={addNew}
              />
            </div>

            <Button
              variant="outline"
              size="small"
              className="mt-1 rounded-lg gap-2 text-xs text-semibold hover:bg-white hover:bg-opacity-5 duration-100"
              onClick={() =>
                document.getElementById(`default_FILE_INPUT`)?.click()
              }
            >
              <Icon name="attachment" className="w-3 h-3 text-accent" />
              Upload attachment
            </Button>
          </div>

          <FilePreview
            titleRef={titleRef}
            deleteFile={handleDelete}
            currentFile={currentFile}
            updateFile={handleUpdate}
          />
        </div>

        <DialogFooter className="max-sm:flex-row max-sm:h-[75px] max-sm:items-center max-sm:justify-end max-sm:gap-2 max-sm:p-3">
          <Button
            className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
            variant="outline"
            size="compact"
            disabled={saving}
            onClick={() => onClose(files?.filter((f) => f.id > 0))}
          >
            Cancel
          </Button>

          <Button
            className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
            variant="accent"
            size="compact"
            onClick={handleSave}
            disabled={saving}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
