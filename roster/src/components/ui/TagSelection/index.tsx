import { Formik, FormikValues, useField } from "formik";
import { capitalizeString, cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Props = {
  name: string;
  type: "type" | "status";
  className?: string;
  suggestions: string[];
  value: string;
  // resetSuggestions: () => void;
  validate: any;
  label: string;
  addCustomTagCallback?: (tag: string, type: "type" | "status") => void;
  project?: any;
};

export const TagSelection: React.FC<Props> = (props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [customTag, setCustomTag] = useState<string>("");
  const [_refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string>(
    props.project?.type ?? props.value ?? ""
  );
  const [_field, _meta, helpers] = useField({
    name: props.name,
    // validate: (v) => {
    //   if (!v.length) {
    //     return "Required";
    //   }
    // },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFormSubmit = (values: FormikValues) => {
    if (props.suggestions.includes(capitalizeString(values.custom_tag))) {
      return;
    }

    if (props.addCustomTagCallback && values.custom_tag !== "") {
      if (props.suggestions.length > 7) {
        props.suggestions.pop();
      }

      props.addCustomTagCallback(
        capitalizeString(values.custom_tag),
        props.type === "type" ? "type" : "status"
      );

      setRefreshKey((prev) => prev + 1);

      const newValue = capitalizeString(values.custom_tag);

      //-- set the selected item in the UI list
      setSelected(newValue);

      //-- set the value for the form field
      helpers.setValue(newValue);

      setModalOpen(false);
    }
  };

  return (
    <>
      {modalOpen && (
        <Dialog
          open={modalOpen}
          onOpenChange={(o) => {
            if (!o) {
              setModalOpen(false);
            }
          }}
        >
          <DialogContent
            className="w-[300px] max-w-[300px]"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Add custom tag</DialogTitle>
            </DialogHeader>

            <Formik
              initialValues={{
                custom_tag: "",
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
              }) => {
                return (
                  <div className="flex flex-col p-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <Input
                        autoFocus
                        className={cn(
                          "h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40"
                        )}
                        label="Custom project type"
                        name="custom_tag"
                        value={values.custom_tag}
                        placeholder="e.g., Comedy Special"
                        validate={(value: string) => {
                          if (
                            props.suggestions.includes(capitalizeString(value))
                          ) {
                            return "Tag already exists";
                          }
                        }}
                      />

                      {!!errors.custom_tag && !!touched.custom_tag && (
                        <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                          <Icon
                            name="error"
                            className="w-4 h-4 text-pink-600"
                          />

                          <div className="font-normal text-pink-600 text-xs leading-none">
                            {errors.custom_tag as string}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full rounded-lg h-[40px] bg-lime-300"
                      variant="accent"
                      disabled={!isValid || isValidating || !dirty}
                      onClick={submitForm}
                    >
                      Add
                    </Button>
                  </div>
                );
              }}
            </Formik>
          </DialogContent>
        </Dialog>
      )}

      <div className="relative">
        <div
          className={cn(
            props.className,
            "cursor-text flex items-center gap-[6px] flex-wrap"
          )}
          onClick={() => {
            inputRef.current?.focus();
          }}
        >
          {props?.suggestions.length > 0 && (
            <div className="flex flex-wrap max-h-[160px] top-[52px] rounded-lg p-1 text-white text-opacity-95 gap-2">
              {props?.suggestions.map((s: string, i: number) => {
                return (
                  <div
                    onClick={() => {
                      helpers.setValue(s);
                      // helpers.setValue([
                      //   ...new Set([
                      //     /* @ts-ignore */
                      //     ...(props.values?.[props.custom_tag] ?? []),
                      //     s,
                      //   ]),
                      // ]);
                      setSelected(s);

                      // query.current = "";
                      // props?.resetSuggestions?.();
                    }}
                    className={cn(
                      "py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95",
                      s === selected &&
                        "text-lime-300 bg-lime-800/35 border-[0.5px] border-opacity-100 border-lime-300 hover:text-lime-300"
                    )}
                    key={`${s}-${i}`}
                  >
                    {s}
                  </div>
                );
              })}

              {props.addCustomTagCallback && (
                <div
                  onClick={() => {
                    if (props.addCustomTagCallback) {
                      setRefreshKey((prev) => prev + 1);

                      // props.addCustomTagCallback("test tag");
                      setModalOpen(true);
                    }
                  }}
                  className="py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
                >
                  +
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
