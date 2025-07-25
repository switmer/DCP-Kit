import React, { FC, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { Field, Formik, FormikValues } from 'formik';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ShootDayPicker } from '@/components/blocks/CallSheet/ShootDates/ShootDayPicker';
import { CallSheetType } from '@/types/type';
import { format, parse } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Props = {
  sheet: CallSheetType;
  editShootDateModalOpen: boolean;
  setEditShootDateModalOpen: (arg: boolean) => void;
};

export const EditShootDate: FC<Props> = (props) => {
  const [showShootDayPicker, setShowShootDayPicker] = useState(false);

  const [initialDayOf, setInitialDayOf] = useState('');
  const [dayOf, setDayOf] = useState('');
  const [initialDays, setInitialDays] = useState('');
  const [days, setDays] = useState('');
  const [initialShootDate, setInitialShootDate] = useState('');
  const [shootDate, setShootDate] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!props.sheet.date) return;

    const parsedShootDate = props.sheet.date ? parse(props.sheet.date, 'MM/dd/yy', new Date()) : '';
    const formattedDate = format(parsedShootDate, 'EEE, MMM d, yyyy');

    setInitialShootDate(format(parsedShootDate, 'MMM d, yyyy'));
    setShootDate(formattedDate);
  }, [props.sheet.date]);

  useEffect(() => {
    //@ts-ignore
    if (!props.sheet.raw_json?.day_of_days) return;

    //@ts-ignore
    const day_of_days = props.sheet.raw_json.day_of_days;
    const splitDayOfDays = day_of_days?.split(' ') || [];

    const dayOf = splitDayOfDays[splitDayOfDays.length === 4 ? 1 : 0];
    let days = splitDayOfDays[splitDayOfDays.length === 4 ? 3 : 2];

    setInitialDayOf(dayOf);
    setDayOf(dayOf);
    setInitialDays(days);
    setDays(days);
  }, [props.sheet.raw_json]);

  const handleFormSubmit = async (values: FormikValues) => {
    let { data: sheetRawJson, error: fetchSheetRawJsonError } = await supabase
      .from('call_sheet')
      .select('raw_json')
      .eq('id', props.sheet.id)
      .single();

    if (fetchSheetRawJsonError) {
      toast.error('Something went wrong. Please try again.');
      return;
    }

    if (!sheetRawJson?.raw_json) {
      sheetRawJson = { raw_json: {} };
    }

    //@ts-ignore
    sheetRawJson.raw_json.day_of_days = `Day ${dayOf} of ${days}`;
    //@ts-ignore
    sheetRawJson.raw_json.full_date = values.date ? format(values.date, 'MM/dd/yy') : null;

    supabase
      .from('call_sheet')
      .update({
        raw_json: sheetRawJson.raw_json,
        date: values.date ? format(values.date, 'MM/dd/yy') : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', props.sheet.id)
      .then(() => {
        props.setEditShootDateModalOpen && props.setEditShootDateModalOpen(false);
        toast.success(`Shoot date updated.`);

        // if (selectedContactId !== "new") props.onCancel();
        window.location.reload();
      });

    return;
  };

  const getInitialDayOfDays = (day_of_days: string) => {
    const splitDayOfDays = day_of_days?.split(' ') || [];

    const dayOf = splitDayOfDays[splitDayOfDays.length === 4 ? 1 : 0];
    let days = splitDayOfDays[splitDayOfDays.length === 4 ? 3 : 2];

    return { dayOf: dayOf, days: days };
  };

  return (
    <Dialog
      open={props.editShootDateModalOpen}
      onOpenChange={(o) => {
        if (!o) {
          close();
        }
      }}
    >
      <DialogContent
        className={cn('w-[450px] max-w-[450px]')}
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <div>Edit shoot date</div>

            <button
              onClick={() => props.setEditShootDateModalOpen(false)}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={{
            date: props.sheet.date
              ? format(parse(props.sheet.date, 'MM/dd/yy', new Date()), 'MMM d, yyyy')
              : new Date(),
            //@ts-ignore
            dayOf: getInitialDayOfDays(props.sheet.raw_json?.day_of_days).dayOf,
            //@ts-ignore
            days: getInitialDayOfDays(props.sheet.raw_json?.day_of_days).days,
          }}
          validateOnChange={true}
          onSubmit={(values: FormikValues) => handleFormSubmit(values)}
        >
          {({ isValidating, isValid, dirty, touched, errors, submitForm, values, setFieldValue }) => {
            return (
              <>
                <div className="flex flex-col justify-evenly w-full px-10 pt-3 pb-5">
                  <div className="flex flex-col gap-5 justify-center w-full">
                    <div className={cn('flex items-center justify-start gap-2 w-full')}>
                      <Label className={cn('flex flex-col gap-2 w-full')}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">Shoot date</div>
                          {/*<div className="text-xs text-stone-600">Optional</div>*/}
                        </div>

                        <div className="flex w-full">
                          <Input
                            className={cn(
                              'w-full px-[20px] h-[62px] bg-zinc-900 !rounded-[16px] shadow border border-zinc-700 text-[22px] cursor-not-allowed placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.date &&
                                values.date &&
                                initialShootDate !== '' &&
                                values.date !== initialShootDate &&
                                '!border-lime-300',
                              !!errors.date && !!touched.date && '!border-pink-600',
                            )}
                            type="text"
                            readOnly
                            name="date"
                            placeholder="Select date"
                            value={values.date ? format(values.date, 'EEE, MMM d, yyy') : ''}
                          />

                          <div
                            className="cursor-pointer !text-white"
                            onClick={() => {
                              setShowShootDayPicker(!showShootDayPicker);
                            }}
                          >
                            <Icon
                              name="calendar"
                              className={cn(
                                'fixed top-[137px] right-[60px] w-8 h-8 text-white/100',
                                // showShootDayPicker && "hidden"
                              )}
                            />
                          </div>
                        </div>

                        {showShootDayPicker && (
                          <Field
                            className={cn(
                              'absolute z-10 top-[100px] h-11 bg-zinc-900 !rounded-[16px] shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              // !errors.date &&
                              //   values.date !== null &&
                              //   "!border-lime-300",
                              !!errors.date && !!touched.date && '!border-pink-600',
                            )}
                            type="text"
                            label="Shoot date"
                            name="date"
                            // render={({
                            //   field,
                            //   form,
                            // }: {
                            //   field: any;
                            //   form: any;
                            // }) => (
                          >
                            {({ field, form }: { field: any; form: any }) => {
                              return (
                                <ShootDayPicker
                                  field={field}
                                  form={form}
                                  values={values}
                                  // type="shoot"
                                  setShowDatePicker={setShowShootDayPicker}
                                  handleSelect={(date: Date) => {
                                    setShootDate(format(date, 'EEE, MMM d, yyy'));

                                    setFieldValue('date', date);
                                    setShowShootDayPicker(false);
                                  }}
                                  // setRangeDatesCallback={setRangeDatesCallback}
                                />
                              );
                            }}
                          </Field>
                        )}

                        {!!errors.date && !!touched.date && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon name="error" className="w-4 h-4 text-pink-600" />
                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.date as string}
                            </div>
                          </div>
                        )}
                      </Label>
                    </div>

                    <div className="flex gap-3 w-full">
                      <Label className={cn('flex flex-col justify-between gap-2 w-full')}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">Day of days</div>
                          {/*<div className="text-xs text-stone-600">Optional</div>*/}
                        </div>

                        <div className="flex gap-3 justify-between w-full">
                          <div className="relative flex max-w-[150px]">
                            <div className="absolute text-white/70 text-lg leading-tight top-[32px] left-[20px] -translate-y-1/2">
                              DAY
                            </div>

                            <Field name="dayOf">
                              {({ field }: { field: any }) => (
                                <input
                                  {...field}
                                  className={cn(
                                    'text-center w-[150px] h-[62px] pr-[5px] pl-[60px] text-white text-[24px] rounded-[16px] border border-zinc-700 bg-zinc-900 focus:border-gray-400 shadow placeholder:text-zinc-500 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                    !errors.dayOf &&
                                      values.dayOf !== '' &&
                                      initialDayOf !== '' &&
                                      values.dayOf !== initialDayOf &&
                                      '!border-lime-300',
                                    !!errors.dayOf && !!touched.dayOf && '!border-pink-600',
                                  )}
                                  type="number"
                                  // autoFocus
                                  min="1"
                                  max="999"
                                  placeholder="--"
                                  value={values.dayOf}
                                  onChange={(e) => {
                                    if (parseInt(e.target.value) <= 0) {
                                      e.target.value = '1';
                                    }

                                    if (parseInt(e.target.value) > 999) {
                                      e.target.value = '999';
                                    }

                                    if (parseInt(e.target.value) > parseInt(values.days)) {
                                      setDays((prev) => {
                                        // setPrevDays(prev);

                                        return e.target.value;
                                      });

                                      setFieldValue('days', e.target.value);
                                    }

                                    setDayOf((prev) => {
                                      // setPrevDayOf(prev);

                                      return e.target.value;
                                    });

                                    setFieldValue('dayOf', e.target.value);
                                  }}
                                />
                              )}
                            </Field>
                          </div>

                          <div className="flex items-center text-white/70 text-xl leading-tight">OF</div>

                          <div className="relative flex items-center">
                            <Field name="days">
                              {({ field }: { field: any }) => (
                                <input
                                  {...field}
                                  className={cn(
                                    'text-center w-[150px] h-[62px] pl-[5px] pr-[60px] text-white text-[24px] rounded-[16px] border border-zinc-700 bg-zinc-900 focus:border-gray-400 shadow placeholder:text-zinc-500 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                    !errors.days &&
                                      values.days !== '' &&
                                      initialDays !== '' &&
                                      values.days !== initialDays &&
                                      '!border-lime-300',
                                    !!errors.days && !!touched.days && '!border-pink-600',
                                  )}
                                  type="number"
                                  min="1"
                                  max="999"
                                  placeholder="--"
                                  value={values.days}
                                  onChange={(e) => {
                                    if (parseInt(e.target.value) <= 0) {
                                      e.target.value = '1';
                                    }

                                    if (parseInt(e.target.value) > 999) {
                                      e.target.value = '999';
                                    }

                                    setDays(e.target.value);

                                    setFieldValue('days', e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    if (parseInt(e.target.value) <= 0 || e.target.value === '') {
                                      if (parseInt(dayOf) <= 0) {
                                        e.target.value = '1';
                                        return;
                                      }

                                      e.target.value = dayOf;
                                    }

                                    if (parseInt(e.target.value) < parseInt(dayOf)) {
                                      setDayOf(e.target.value);

                                      setFieldValue('dayOf', e.target.value);
                                    }
                                  }}
                                />
                              )}
                            </Field>

                            <div className="absolute text-white/70 text-lg leading-tight top-[32px] right-[20px] -translate-y-1/2">
                              DAYS
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>

                <DialogFooter className={cn('px-8')}>
                  <Button
                    className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="outlineAccent"
                    size="compact"
                    onClick={() => props.setEditShootDateModalOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || !dirty}
                    onClick={submitForm}
                  >
                    Save Changes
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
