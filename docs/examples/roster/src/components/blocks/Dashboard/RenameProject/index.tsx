"use client";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getUser } from "@/queries/get-user";
import { ProjectType } from "@/types/type";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { Formik, FormikValues } from "formik";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const RenameProject: React.FC<{
  close: () => void;
  p: ProjectType | null;
  onUpdate: () => void;
}> = ({ close, p, onUpdate }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [project, setProject] = useState<ProjectType | null>(p);

  const supabase = createClient();

  useEffect(() => {
    setProject(p);
  }, [p]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  if (!isMounted || !project) {
    return <></>;
  }

  return (
    <Dialog
      open={!!project}
      onOpenChange={(o) => {
        if (!o) {
          close();
        }
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{
            name: project.name,
          }}
          validateOnChange={true}
          onSubmit={async (values: FormikValues) => {
            if (!user) {
              toast.error("Something went wrong");
              return;
            }

            if (values.name === project.name) {
              close();
            }

            return await supabase
              .from("project")
              .update({
                name: values?.name,
              })
              .eq("id", project.id)
              .select()
              .single()
              .then(({ data, error }) => {
                if (error) {
                  toast.error(error.message);
                  return;
                }

                toast.success(`Project "${data?.name}" updated`);
                onUpdate();
                close();
              });
          }}
        >
          {({ isValidating, isValid, touched, errors, submitForm }) => {
            return (
              <>
                <div className="p-8 flex flex-col gap-5">
                  <Label className="flex flex-col gap-2">
                    Project Name
                    <Input
                      autoFocus
                      className={cn(
                        "h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
                        !errors.name && !!touched.name && "!border-lime-300",
                        !!errors.name && !!touched.name && "!border-pink-600"
                      )}
                      label="Project Name"
                      name="name"
                      placeholder="e.g Citizen Kane"
                      validate={(value: string) => {
                        if (!value) {
                          return "Name is required";
                        }
                      }}
                    />
                    {!!errors.name && !!touched.name && (
                      <div className=" h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                        <Icon name="error" className="w-4 h-4 text-pink-600" />
                        <div className="font-normal text-pink-600 text-xs leading-none">
                          {errors.name as string}
                        </div>
                      </div>
                    )}
                  </Label>
                </div>
                <DialogFooter>
                  <Button
                    className="px-4 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating}
                    onClick={submitForm}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};
