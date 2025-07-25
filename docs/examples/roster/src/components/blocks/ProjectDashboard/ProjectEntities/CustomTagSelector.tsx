import { Formik, FormikValues } from 'formik';
import { capitalizeString, cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { splitAndLowercaseFirst } from '@/components/blocks/CallSheet/Locations/util/splitAndLowercaseFirst';

type Props = {
  className?: string;
  suggestions: string[];
  value: string;
  label: string;
  addCustomTagCallback?: (tag: string) => void;
  setNewTag: (newTag: string) => void;
};

export const CustomTagSelector: React.FC<Props> = (props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [customTag, setCustomTag] = useState<string>('');
  const [_refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string>(splitAndLowercaseFirst(props.value) ?? '');

  useEffect(() => {
    setSelected(splitAndLowercaseFirst(props.value));
  }, [props.value]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFormSubmit = (values: FormikValues) => {
    if (props.suggestions.includes(capitalizeString(values.custom_tag))) {
      return;
    }

    if (props.addCustomTagCallback && values.custom_tag !== '') {
      if (props.suggestions.length > 2) {
        props.suggestions.length = 2;
      }

      props.addCustomTagCallback(values.custom_tag);

      setRefreshKey((prev) => prev + 1);

      const newValue = capitalizeString(values.custom_tag);

      //-- set the selected item in the ui list.
      setSelected(newValue);
      props.setNewTag(newValue);

      //-- set the value for the form field.
      // helpers.setValue(newValue);

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
              <div className="flex items-center justify-between">
                <DialogTitle>Add custom type</DialogTitle>

                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
                >
                  <Icon name="cross" className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </DialogHeader>

            <Formik
              initialValues={{
                custom_tag: '',
              }}
              validateOnChange={true}
              onSubmit={(values: FormikValues) => handleFormSubmit(values)}
            >
              {({ isValidating, isValid, dirty, touched, errors, submitForm, values }) => {
                return (
                  <div className="flex flex-col p-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <Input
                        autoFocus
                        className={cn(
                          'h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                        )}
                        label={props.label}
                        name="custom_tag"
                        value={values.custom_tag}
                        validate={(value: string) => {
                          if (props.suggestions.includes(capitalizeString(value))) {
                            return 'Type already exists';
                          }
                        }}
                      />

                      {!!errors.custom_tag && !!touched.custom_tag && (
                        <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                          <Icon name="error" className="w-4 h-4 text-pink-600" />

                          <div className="font-normal text-pink-600 text-xs leading-none">
                            {errors.custom_tag as string}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="w-1/2 px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
                        variant="outline"
                        size="compact"
                        onClick={() => setModalOpen(false)}
                      >
                        Cancel
                      </Button>

                      <Button
                        className="w-1/2 rounded-lg h-[40px] bg-lime-300 cursor-pointer"
                        variant="accent"
                        size="compact"
                        disabled={!isValid || isValidating || !dirty}
                        onClick={submitForm}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                );
              }}
            </Formik>
          </DialogContent>
        </Dialog>
      )}

      <div className="relative">
        <div
          className={cn(props.className, 'flex items-center gap-[6px] flex-wrap')}
          onClick={() => {
            inputRef.current?.focus();
          }}
        >
          {props?.suggestions.length > 0 && (
            <div className="flex flex-wrap max-h-[160px] top-[52px] rounded-lg p-1 text-white text-opacity-95 gap-[6px]">
              {props?.suggestions.map((s: string, i: number) => {
                return (
                  <div
                    onClick={() => {
                      setSelected(splitAndLowercaseFirst(s));
                      props.setNewTag(splitAndLowercaseFirst(s));
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1 py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95',
                      splitAndLowercaseFirst(s) === splitAndLowercaseFirst(selected) &&
                        'text-lime-300 bg-lime-800/35 border-[0.5px] border-opacity-100 border-lime-300 hover:text-lime-300',
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
