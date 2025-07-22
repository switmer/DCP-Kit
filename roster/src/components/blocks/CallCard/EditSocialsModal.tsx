import React, { ChangeEvent, FC, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { Field, Formik, FormikValues } from "formik";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { MemberType } from "@/types/type";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

type Props = {
  member: MemberType;
  editSocialsModalOpen: boolean;
  setEditSocialsModalOpen: (arg: boolean) => void;
  setRefreshKey: (a: (p: number) => number) => void;
};

export const EditSocialsModal: FC<Props> = (props) => {
  const [newInstagram, setNewInstagram] = useState<string | null>(
    props.member.instagram ?? null
  );
  const [newImdb, setNewImdb] = useState<string | null>(
    props.member.imdb ?? null
  );
  const [newVimeo, setNewVimeo] = useState<string | null>(
    props.member.vimeo ?? null
  );
  const [newYoutube, setNewYoutube] = useState<string | null>(
    props.member.youtube ?? null
  );

  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleFormSubmit = async (values: FormikValues) => {
    setIsLoading(true);

    const { error: updateSocialsReqError } = await supabase
      .from("member")
      .update({
        ...(newInstagram !== null
          ? { instagram: newInstagram }
          : { instagram: null }),
        ...(newImdb !== null ? { imdb: newImdb } : { imdb: null }),
        ...(newYoutube !== null ? { youtube: newYoutube } : { youtube: null }),
        ...(newVimeo !== null ? { vimeo: newVimeo } : { vimeo: null }),
      })
      .eq("id", props.member.id)
      .select();

    if (updateSocialsReqError) {
      console.error("Error: ", updateSocialsReqError);
      toast.error("Something went wrong updating socials. Please try again.");

      setIsLoading(false);

      return;
    }

    props.setRefreshKey((p: number) => p + 1);
    props.setEditSocialsModalOpen(false);

    toast.success("Social links updated successfully.");

    setIsLoading(false);

    return;
  };

  return (
    <Dialog
      open={props.editSocialsModalOpen}
      onOpenChange={(o) => {
        if (!o) {
          close();
        }
      }}
    >
      <DialogContent
        className={cn("w-[450px] max-w-[450px]")}
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <div>Edit social links</div>

            <button
              onClick={() => props.setEditSocialsModalOpen(false)}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={{
            imdb: props.member.imdb ?? "",
            instagram: props.member.instagram ?? "",
            youtube: props.member.youtube ?? "",
            vimeo: props.member.vimeo ?? "",
          }}
          validateOnChange={true}
          onSubmit={(values: FormikValues) => handleFormSubmit(values)}
        >
          {({
            isValidating,
            isValid,
            dirty,
            touched,
            errors,
            submitForm,
            values,
            setFieldValue,
          }) => {
            return (
              <>
                <div className="flex flex-col justify-evenly w-full px-10 pt-3 pb-5">
                  <div className="flex flex-col gap-5 justify-center w-full">
                    <div
                      className={cn(
                        "flex items-center justify-start gap-2 w-full"
                      )}
                    >
                      <Label className={cn("flex flex-col gap-2 w-full")}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">IMDb</div>
                          {/*<div className="text-xs text-stone-600">Optional</div>*/}
                        </div>

                        <div className="flex w-full">
                          <Input
                            className={cn(
                              "w-full px-[12px] h-[40px] bg-zinc-900 rounded-lg shadow border border-zinc-700 text-base placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
                              !errors.imdb &&
                                values.imdb !== newImdb &&
                                newImdb !== null &&
                                newImdb !== "" &&
                                "!border-lime-300",
                              !!errors.imdb &&
                                !!touched.imdb &&
                                "!border-pink-600"
                            )}
                            type="text"
                            name="imdb"
                            placeholder="Enter URL here..."
                            value={newImdb}
                            onChange={(e: any) => {
                              if (e.target.value === "") {
                                setNewImdb(null);
                                return;
                              }

                              setNewImdb(e.target.value);
                            }}
                          />
                        </div>

                        {!!errors.imdb && !!touched.imdb && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon
                              name="error"
                              className="w-4 h-4 text-pink-600"
                            />
                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.imdb as string}
                            </div>
                          </div>
                        )}
                      </Label>
                    </div>

                    <div
                      className={cn(
                        "flex items-center justify-start gap-2 w-full"
                      )}
                    >
                      <Label className={cn("flex flex-col gap-2 w-full")}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">Instagram</div>
                          {/*<div className="text-xs text-stone-600">Optional</div>*/}
                        </div>

                        <div className="flex w-full">
                          <Input
                            className={cn(
                              "w-full px-[12px] h-[40px] bg-zinc-900 rounded-lg shadow border border-zinc-700 text-base placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
                              !errors.instagram &&
                                values.instagram !== newInstagram &&
                                newInstagram !== "" &&
                                newInstagram !== null &&
                                "!border-lime-300",
                              !!errors.instagram &&
                                !!touched.instagram &&
                                "!border-pink-600"
                            )}
                            type="text"
                            name="instagram"
                            placeholder="Enter URL here..."
                            value={newInstagram}
                            onChange={(e: any) => {
                              if (e.target.value === "") {
                                setNewInstagram(null);
                                return;
                              }

                              setNewInstagram(e.target.value);
                            }}
                          />
                        </div>

                        {!!errors.instagram && !!touched.instagram && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon
                              name="error"
                              className="w-4 h-4 text-pink-600"
                            />
                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.instagram as string}
                            </div>
                          </div>
                        )}
                      </Label>
                    </div>

                    <div
                      className={cn(
                        "flex items-center justify-start gap-2 w-full"
                      )}
                    >
                      <Label className={cn("flex flex-col gap-2 w-full")}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">YouTube</div>
                          {/*<div className="text-xs text-stone-600">Optional</div>*/}
                        </div>

                        <div className="flex w-full">
                          <Input
                            className={cn(
                              "w-full px-[12px] h-[40px] bg-zinc-900 rounded-lg shadow border border-zinc-700 text-base placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
                              !errors.youtube &&
                                values.youtube !== newYoutube &&
                                newYoutube !== "" &&
                                newYoutube !== null &&
                                "!border-lime-300",
                              !!errors.youtube &&
                                !!touched.youtube &&
                                "!border-pink-600"
                            )}
                            type="text"
                            name="youtube"
                            placeholder="Enter URL here..."
                            value={newYoutube}
                            onChange={(e: any) => {
                              if (e.target.value === "") {
                                setNewYoutube(null);
                                return;
                              }

                              setNewYoutube(e.target.value);
                            }}
                          />
                        </div>

                        {!!errors.youtube && !!touched.youtube && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon
                              name="error"
                              className="w-4 h-4 text-pink-600"
                            />
                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.youtube as string}
                            </div>
                          </div>
                        )}
                      </Label>
                    </div>

                    <div
                      className={cn(
                        "flex items-center justify-start gap-2 w-full"
                      )}
                    >
                      <Label className={cn("flex flex-col gap-2 w-full")}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">Vimeo</div>
                          {/*<div className="text-xs text-stone-600">Optional</div>*/}
                        </div>

                        <div className="flex w-full">
                          <Input
                            className={cn(
                              "w-full px-[12px] h-[40px] bg-zinc-900 rounded-lg shadow border border-zinc-700 text-base placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
                              !errors.vimeo &&
                                values.vimeo !== newVimeo &&
                                newVimeo !== "" &&
                                newVimeo !== null &&
                                "!border-lime-300",
                              !!errors.vimeo &&
                                !!touched.vimeo &&
                                "!border-pink-600"
                            )}
                            type="text"
                            name="vimeo"
                            placeholder="Enter URL here..."
                            value={newVimeo}
                            onChange={(e: any) => {
                              if (e.target.value === "") {
                                setNewVimeo(null);
                                return;
                              }

                              setNewVimeo(e.target.value);
                            }}
                          />
                        </div>

                        {!!errors.vimeo && !!touched.vimeo && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon
                              name="error"
                              className="w-4 h-4 text-pink-600"
                            />
                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.vimeo as string}
                            </div>
                          </div>
                        )}
                      </Label>
                    </div>
                  </div>
                </div>

                <DialogFooter className={cn("px-8")}>
                  <Button
                    className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="outlineAccent"
                    size="compact"
                    onClick={() => props.setEditSocialsModalOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={isLoading}
                    onClick={submitForm}
                  >
                    {isLoading ? (
                      <LoadingIndicator size="small" />
                    ) : (
                      "Save Changes"
                    )}
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
