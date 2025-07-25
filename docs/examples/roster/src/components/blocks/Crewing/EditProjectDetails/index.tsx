'use client';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { createClient } from '@/lib/supabase/client';
import { capitalizeString, cn } from '@/lib/utils';
import { getUser } from '@/queries/get-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Field, Formik, FormikValues } from 'formik';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TagSelection } from '@/components/ui/TagSelection';
import { compareAsc, format, parse } from 'date-fns';
import { Calendar } from '@/components/ui/Calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { useCompanyStore } from '@/store/company';
import { formatDate } from 'date-fns/format';
import { ProjectType } from '@/types/type';
import { ShootDayPicker } from '@/components/blocks/CallSheet/ShootDates/ShootDayPicker';
import { useDateRangeManager } from '@/lib/hooks/useDateRangeManager';

export const EditProjectDetails: React.FC<{
  project: ProjectType;
  open: boolean;
  isForSheet?: boolean; //-- are we accessing this modal from a call sheet.
  close: () => void;
  onUpdate?: () => void;
  refreshCallback: () => void;
}> = ({ open, isForSheet, close, onUpdate, project, refreshCallback }) => {
  const [isMounted, setIsMounted] = useState(false);

  const [showJobNumber, setShowJobNumber] = useState(project.job_number ?? false);
  const [showPrepDates, setShowPrepDates] = useState((project.prep_dates && project.prep_dates?.length > 0) ?? false);
  const [showPostDates, setShowPostDates] = useState((project.post_dates && project.post_dates?.length > 0) ?? false);
  const [showDeliveryDateInput, setShowDeliveryDateInput] = useState(project.delivery_date ?? false);

  const existingProjectDates = {
    ...(project.prep_dates && project.prep_dates.length > 0 ? { prepDates: project.prep_dates } : {}),
    ...(project.dates && project.dates.length > 0 ? { shootDates: project.dates } : {}),
    ...(project.post_dates && project.post_dates.length > 0 ? { postDates: project.post_dates } : {}),
    ...(project.delivery_date && project.delivery_date.length > 0 ? { deliveryDate: project.delivery_date } : {}),
  };

  const {
    prepDates: prepDatesArr,
    shootDates: datesArr,
    postDates: postDatesArr,
    deliveryDate,
    setShootDates,
    setPrepDates,
    setPostDates,
    setDeliveryDate,
  } = useDateRangeManager(existingProjectDates);

  const queryClient = useQueryClient();

  const [showShootDatesPicker, setShowShootDatesPicker] = useState(false);
  const [showPrepDatesPicker, setShowPrepDatesPicker] = useState(false);
  const [showPostDatesPicker, setShowPostDatesPicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

  const [showBudgetInput, setShowBudgetInput] = useState(!!project.budget);
  const [showStatusDropdown, setShowStatusDropdown] = useState(!!project.status);

  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingRecords, setConflictingRecords] = useState<any>([]);
  const [formValues, setFormValues] = useState<FormikValues>();

  const [typeSuggestions, setTypeSuggestions] = useState([
    'Commercial',
    'Documentary',
    'Film',
    'Live Event',
    'Music Video',
    'TV Movie',
    'TV Series',
  ]);

  const statusSuggestions = ['Status 1', 'Status 2', 'Status 3', 'Status 4', 'Status 5'];

  const { activeCompany } = useCompanyStore();
  const supabase = createClient();

  const formatDatesForInput = (dates: string[]) => {
    if (dates.length === 0) return;

    if (dates.length > 1) {
      dates.sort(compareAsc).map((date) => formatDate(date, 'MM/dd/yy'));

      const endsOfRange = [dates[0], dates[dates.length - 1]];
      const formattedRange = [format(endsOfRange[0], 'MMM dd'), format(endsOfRange[1], 'MMM dd, yyyy')];

      return formattedRange[0] + ' - ' + formattedRange[1];
    }

    return format(dates[0], 'MMM dd, yyyy');
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ['user'], queryFn: () => getUser(supabase) });

  if (!isMounted) {
    return <></>;
  }

  const addCustomTag = (tag: string, type: 'type' | 'status') => {
    switch (type) {
      case 'type':
        setTypeSuggestions((p) => {
          return [...p, capitalizeString(tag)];
        });

        return;

      case 'status':
        statusSuggestions.push(capitalizeString(tag));
        return;
    }
  };

  const fetchAndCompareCallSheetDateRecords = async () => {
    /*
      fetch all existing call_sheet records for the current project, compare them with the updated dates in our datesArr,
      and return an array of records that will be deleted.
     */

    //-- fetch all existing sheets for the current project.
    const { data: existingSheets, error: fetchError } = await supabase
      .from('call_sheet')
      .select(
        `
        id,
        date,
        call_sheet_member(id),
        call_sheet_location(id)
      `,
      )
      .eq('project', project.id);

    if (!existingSheets || fetchError) {
      toast.error('Something went wrong fetching existing project sheets.');
      console.error('Error: ', fetchError);

      return [];
    }

    //-- find dates that need to be added (dates that exist in our new datesArr but not in existing records).
    const existingDates = existingSheets.map((sheet) => sheet.date);
    const datesToAdd = datesArr.filter((date) => !existingDates.includes(date));

    //-- find records that need to be deleted (dates/records that exist in db but not in our new datesArr).
    const recordsToDelete = existingSheets.filter(
      (sheet) =>
        !datesArr.includes(sheet.date as string) &&
        (sheet.call_sheet_member.length || sheet.call_sheet_location.length),
    );

    return recordsToDelete;
  };

  const handleFormSubmit = async (values: FormikValues) => {
    if (!user) {
      toast.error('Something went wrong.');

      return;
    }

    //-- get existing dates for the project.
    const { data: existingRecords, error: fetchError } = await supabase
      .from('call_sheet')
      .select('id, date')
      .eq('project', project.id);

    if (fetchError) {
      console.error('Error: ', fetchError);
      toast.error('Something went wrong fetching existing workdays.');

      return;
    }

    const existingDates = new Set(existingRecords.map((r) => r.date));
    const newDates = new Set(datesArr);

    //-- determine records to delete (existing call_sheet records with dates outside our newly submitted dates).
    const recordsToDelete = existingRecords.filter((r) => !newDates.has(r.date as string)).map((r) => r.id);

    if (recordsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from('call_sheet').delete().in('id', recordsToDelete);

      if (deleteError) {
        console.error('Error: ', deleteError);
        toast.error('Something went wrong deleting old workdays.');

        return;
      }
    }

    //-- prepare records to insert or update.
    const callSheetData = datesArr.map((date, i) => ({
      company: activeCompany,
      status: 'ready' as any,
      project: project.id,
      date,
      raw_json: {
        full_date: date,
        day_of_days: `Day ${i + 1} of ${datesArr.length}`,
        job_name: `Shoot Day ${i + 1}`,
      },
    }));

    //-- split into new inserts and updates.
    const recordsToInsert = callSheetData.filter((entry) => !existingDates.has(entry.date));
    const recordsToUpdate = callSheetData.filter((entry) => existingDates.has(entry.date));

    //-- insert new records.
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('call_sheet').insert(recordsToInsert);

      if (insertError) {
        console.error('Error: ', insertError);
        toast.error('Something went wrong inserting new workdays.');

        return;
      }
    }

    //-- update existing records with new "day_of_days".
    for (const record of recordsToUpdate) {
      const { error: updateError } = await supabase
        .from('call_sheet')
        .update({ raw_json: record.raw_json })
        .eq('project', project.id)
        .eq('date', record.date);

      if (updateError) {
        console.error('Error: ', updateError);
        toast.error('Something went wrong updating workdays.');

        return;
      }
    }

    //-- update the project information.
    const { error: projectUpdateError } = await supabase
      .from('project')
      .update({
        ...(values.name !== project.name ? { name: values.name } : {}),
        ...(values.job_number !== project.job_number ? { job_number: values.job_number } : {}),
        ...(values.type !== project.type ? { type: values.type } : {}),
        ...(values.budget !== project.budget ? { budget: values.budget } : {}),
        ...(values.status !== project.status ? { status: values.status } : {}),
        dates: datesArr,
        prep_dates: prepDatesArr,
        post_dates: postDatesArr,
        delivery_date: deliveryDate,
        //-- if we're accessing this modal from a call sheet, include "contact_info_visible" in the update.
        ...(isForSheet ? { contact_info_visible: values?.contact_info_visible } : {}),
      })
      .eq('id', project.id);

    if (projectUpdateError) {
      console.error('Error: ', projectUpdateError);
      toast.error(projectUpdateError.message);

      return;
    }

    toast.success(`Project "${project.name}" updated.`);

    queryClient.invalidateQueries({ queryKey: ['project', project.id] });

    close();
    onUpdate?.();
    refreshCallback();
  };

  const setRangeDatesCallback = (range: { from: Date; to: Date }, type: 'shoot' | 'prep' | 'post') => {
    switch (type) {
      case 'shoot':
        setShootDates(range);
        setShowPrepDates(true);
        setShowPostDates(true);

        break;

      case 'prep':
        setPrepDates(range);

        break;

      case 'post':
        setPostDates(range);

        break;
    }
  };

  const handleToggleDatePickers = (bool: boolean, type: string) => {
    switch (type) {
      case 'shoot':
        setShowShootDatesPicker(bool);

        if (bool) {
          setShowPrepDatesPicker(false);
          setShowPostDatesPicker(false);
          setShowDeliveryDatePicker(false);
        }

        return;

      case 'prep':
        setShowPrepDatesPicker(bool);

        if (bool) {
          setShowShootDatesPicker(false);
          setShowPostDatesPicker(false);
          setShowDeliveryDatePicker(false);
        }

        return;

      case 'post':
        setShowPostDatesPicker(bool);

        if (bool) {
          setShowShootDatesPicker(false);
          setShowPrepDatesPicker(false);
          setShowDeliveryDatePicker(false);
        }

        return;

      case 'delivery':
        setShowDeliveryDatePicker(true);

        if (bool) {
          setShowPrepDatesPicker(false);
          setShowShootDatesPicker(false);
          setShowPostDatesPicker(false);
        }

        return;
    }
  };

  const handleConfirmOverwrite = async (values: any) => {
    setShowConflictDialog(false);
    await handleFormSubmit(values);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            close();
          }
        }}
      >
        <DialogContent
          className={cn(
            'w-[700px] max-w-[680px] max-sm:w-full max-sm:max-w-full max-sm:h-[100vh] max-sm:max-h-[100vh] max-sm:rounded-none',
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit project details</DialogTitle>
          </DialogHeader>

          <Formik
            initialValues={{
              name: project.name ?? '',
              job_number: project.job_number ?? '',
              type: project.type,
              dates: project.dates ?? [],
              prep_dates: project.prep_dates ?? [],
              post_dates: project.post_dates ?? [],
              delivery_date: project.delivery_date ?? '',
              budget: project.budget ?? '',
              status: project.status ?? '',
              //-- if we're accessing this modal from a call sheet, include "contact_info_visible" as an initial value.
              ...(isForSheet ? { contact_info_visible: project.contact_info_visible ?? false } : {}),
            }}
            validateOnChange={true}
            onSubmit={async (values: FormikValues) => {
              setFormValues(values);

              //-- first check our newly submitted datesArr with our existing call_sheet records.
              const recordsToDelete = await fetchAndCompareCallSheetDateRecords();

              if (recordsToDelete.length > 0) {
                setConflictingRecords(recordsToDelete);
                setShowConflictDialog(true);
              } else {
                await handleFormSubmit(values);
              }
            }}
          >
            {({ isValidating, isValid, dirty, touched, errors, submitForm, values, setFieldValue }) => {
              return (
                <>
                  <div className="px-8 py-5 flex flex-col gap-5 max-sm:overflow-y-auto max-sm:px-4 max-sm:max-h-[calc(100vh-132px)]">
                    <div className="flex justify-between gap-2 max-sm:flex-row">
                      <div className={cn('flex flex-col w-full gap-2', showJobNumber && 'max-sm:w-[calc(100%-180px)]')}>
                        <div className="text-white font-bold">Project title</div>

                        <div className="relative w-full">
                          <Input
                            // autoFocus
                            className={cn(
                              'h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.name && values.name !== project.name && values.name !== '' && '!border-lime-300',
                              !!errors.name && !!touched.name && '!border-pink-600',
                              // (showShootDatesPicker ||
                              //   showPrepDatesPicker ||
                              //   showPostDatesPicker) &&
                              //   "blur"
                            )}
                            label="Project name"
                            name="name"
                            // min={}
                            placeholder="e.g. Citizen Kane"
                            validate={(value: string) => {
                              if (!value) {
                                return 'Title is required';
                              }
                            }}
                          />

                          {!showJobNumber && (
                            <div
                              onClick={() => setShowJobNumber(true)}
                              className={cn(
                                'absolute top-[50%] right-[8px] translate-y-[-50%] w-[70px] py-1 px-2 text-white cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-white/5 text-sm font-medium hover:bg-white/20',
                              )}
                            >
                              + Job #
                            </div>
                          )}
                        </div>

                        {!!errors.name && !!touched.name && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon name="error" className="w-4 h-4 text-pink-600" />

                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.name as string}
                            </div>
                          </div>
                        )}
                      </div>

                      {showJobNumber && (
                        <div className={cn('flex flex-col gap-2 w-[170px]')}>
                          <div className="flex items-center gap-2">
                            <div className="text-white font-bold">Job number</div>

                            <div
                              onClick={() => setShowJobNumber(false)}
                              className="flex justify-center items-center text-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                            >
                              x
                            </div>
                          </div>

                          <Input
                            className={cn(
                              'w-full h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.job_number && values.job_number !== '' && '!border-lime-300',
                            )}
                            label="Job number"
                            name="job_number"
                            placeholder="e.g. 162534"
                          />
                        </div>
                      )}
                    </div>

                    {/* project budget and status */}
                    <div
                      className={cn(
                        'flex gap-4 w-full h-full items-center justify-evenly max-sm:flex-col max-sm:items-stretch max-sm:gap-6',
                        !showBudgetInput && !showStatusDropdown && 'pt-4',
                      )}
                    >
                      {showBudgetInput ? (
                        <Label className={cn('relative flex flex-col w-[300px] h-[66px] gap-1 max-sm:w-full')}>
                          <div className="flex items-center gap-1">
                            <div className="text-sm text-white font-bold">Project budget</div>

                            <div
                              onClick={() => {
                                setFieldValue('budget', '');
                                setShowBudgetInput(false);
                              }}
                              className="flex justify-center text-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                            >
                              x
                            </div>
                          </div>

                          <Input
                            // autoFocus
                            className={cn(
                              'h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.budget &&
                                values.budget !== project.budget &&
                                values.budget !== '' &&
                                '!border-lime-300',
                              !!errors.budget && !!touched.budget && '!border-pink-600',
                            )}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setFieldValue('budget', e.target.value);
                            }}
                            onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const rawValue = e.target.value;

                              //-- strip non-numeric and non-decimal characters.
                              const numericValue = rawValue.replace(/[^0-9.]/g, '');

                              const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                              setFieldValue('budget', formattedValue);
                            }}
                            label="Budget"
                            name="budget"
                            type="text"
                            // min={1}
                            placeholder="e.g., $1,000,000"
                            validate={(value: string) => {
                              if (value === null) return;

                              const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));

                              if (!value || value === '') {
                                return;
                              }

                              if (isNaN(numericValue) || numericValue <= 0) {
                                return 'Budget must be a positive number.';
                              }

                              return;
                            }}
                          />

                          <div
                            className={cn(
                              'hidden absolute left-[6px] top-[38px] text-[16px] text-white/70 font-bold',
                              values.budget !== '' && 'block',
                            )}
                          >
                            $
                          </div>

                          {!!errors.budget && !!touched.budget && (
                            <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                              <Icon name="error" className="w-4 h-4 text-pink-600" />

                              <div className="font-normal text-pink-600 text-xs leading-none">
                                {errors.budget as string}
                              </div>
                            </div>
                          )}
                        </Label>
                      ) : (
                        <div className="flex flex-col justify-between w-[300px] gap-1 max-sm:w-full">
                          <div
                            onClick={() => setShowBudgetInput(true)}
                            className={cn(
                              'flex items-center justify-center h-[32px] px-1 text-sm text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95',
                              showStatusDropdown && 'relative top-[12px]',
                            )}
                          >
                            + Project budget
                          </div>
                        </div>
                      )}

                      {showStatusDropdown ? (
                        <Label className={cn('relative flex flex-col w-[300px] h-[66px] gap-1 max-sm:w-full')}>
                          <div className="flex items-center gap-1">
                            <div className="text-sm text-white font-bold">Project status</div>

                            <div
                              onClick={() => {
                                setFieldValue('status', null);
                                setShowStatusDropdown(false);
                              }}
                              className="flex justify-center text-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                            >
                              x
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                'flex items-center justify-between h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                                !errors.status &&
                                  values.status !== project.status &&
                                  values.status !== null &&
                                  '!border-lime-300',
                                !!errors.status && !!touched.status && '!border-pink-600',
                              )}
                            >
                              <div className={cn('pl-4', !values.status && 'text-zinc-500')}>
                                {!!values.status ? values.status : 'Select a status...'}
                              </div>

                              <Icon name="chevron-small" className="w-7 h-7 px-0 mr-4 rotate-90" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              side="bottom"
                              align="end"
                              className="rounded-md shadow border border-neutral-800 bg-stone-950 w-64"
                            >
                              {statusSuggestions.map((status, i) => {
                                return (
                                  <DropdownMenuItem
                                    key={status + i}
                                    onClick={async () => {
                                      setFieldValue('status', status);
                                    }}
                                    className={cn(
                                      'h-11 pl-8 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-sm text-neutral-400 flex items-center gap-2',
                                      status === values.status &&
                                        'text-lime-300 hover:!text-lime-300 bg-white bg-opacity-[.04]',
                                    )}
                                  >
                                    {status}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {!!errors.status && !!touched.status && (
                            <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                              <Icon name="error" className="w-4 h-4 text-pink-600" />

                              <div className="font-normal text-pink-600 text-xs leading-none">
                                {errors.status as string}
                              </div>
                            </div>
                          )}
                        </Label>
                      ) : (
                        <div className="flex flex-col justify-between w-[300px] gap-1 max-sm:w-full">
                          <div
                            onClick={() => setShowStatusDropdown(true)}
                            className={cn(
                              'flex items-center justify-center h-[32px] px-2 text-sm text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95',
                              showBudgetInput && 'relative top-[12px]',
                            )}
                          >
                            + Project status
                          </div>
                        </div>
                      )}
                    </div>

                    {/* project type */}
                    <Label className={cn('flex flex-col gap-2')}>
                      <div className="text-white font-bold">Project type</div>

                      <TagSelection
                        className=""
                        name="type"
                        type="type"
                        label="Project type"
                        value={values.type}
                        suggestions={typeSuggestions}
                        addCustomTagCallback={addCustomTag}
                        project={project}
                        // resetSuggestions={() => setSuggestions([])}
                        validate={(value: string) => {
                          if (!value) {
                            return 'Type is required';
                          }
                        }}
                      />

                      {!!errors.type && !!touched.type && (
                        <div className=" h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                          <Icon name="error" className="w-4 h-4 text-pink-600" />

                          <div className="font-normal text-pink-600 text-xs leading-none">{errors.type as string}</div>
                        </div>
                      )}
                    </Label>

                    {/* shoot date & delivery date */}
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-stretch max-sm:gap-6',
                      )}
                    >
                      <Label className="flex flex-col gap-1 h-[66px] max-sm:w-full">
                        <div className="flex items-center gap-1">
                          <div className="text-sm text-white font-bold">Shoot dates</div>

                          <div className="flex h-[14px]">Optional</div>
                        </div>

                        <div className="relative flex max-sm:w-full">
                          <Input
                            className={cn(
                              'w-[300px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40 max-sm:w-full',
                              !errors.dates && values.dates?.length > 0 && '!border-lime-300',
                              !!errors.dates && !!touched.dates && '!border-pink-600',
                            )}
                            type="text"
                            name="shoot_dates"
                            placeholder="Select date(s)"
                            value={formatDatesForInput(datesArr.length > 0 ? datesArr : (project.dates ?? []))}
                          />

                          <div
                            className="relative cursor-pointer !text-white"
                            onClick={() => {
                              handleToggleDatePickers(!showShootDatesPicker, 'shoot');
                            }}
                          >
                            <Icon
                              name="calendar"
                              className={cn(
                                'absolute bottom-[12px] right-[10px] w-5 h-5 text-white',
                                showShootDatesPicker && 'hidden',
                              )}
                            />
                          </div>
                        </div>

                        {showShootDatesPicker && (
                          <Field
                            className={cn(
                              'z-10 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.dates && values.dates?.length && '!border-lime-300',
                              !!errors.dates && !!touched.dates && '!border-pink-600',
                            )}
                            type="text"
                            label="Shoot dates"
                            name="dates"
                          >
                            {({ field, form }: { field: any; form: any }) => (
                              <div className="relative">
                                <Calendar
                                  classNames="left-0 bottom-[55px]"
                                  // field={{
                                  //   ...field,
                                  //   value: datesArr && datesArr.length > 0 ?
                                  //     {
                                  //       from: parse(datesArr[0], 'MM/dd/yy', new Date()),
                                  //       to: parse(datesArr[datesArr.length - 1], 'MM/dd/yy', new Date())
                                  //     } : field.value
                                  // }}
                                  field={field}
                                  form={form}
                                  values={values}
                                  type="shoot"
                                  setShowDatePicker={handleToggleDatePickers}
                                  setRangeDatesCallback={setRangeDatesCallback}
                                />
                              </div>
                            )}
                          </Field>
                        )}

                        {!!errors.dates && !!touched.dates && (
                          <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                            <Icon name="error" className="w-4 h-4 text-pink-600" />

                            <div className="font-normal text-pink-600 text-xs leading-none">
                              {errors.dates as string}
                            </div>
                          </div>
                        )}
                      </Label>

                      {showDeliveryDateInput ? (
                        <Label className={cn('flex flex-col gap-1 h-[66px] max-sm:w-full')}>
                          <div className="flex items-center gap-1">
                            <div className="text-sm text-white font-bold">Delivery date</div>

                            <div
                              onClick={() => {
                                setDeliveryDate(null);
                                setFieldValue('delivery_date', '');
                                setShowDeliveryDateInput(false);
                              }}
                              className="flex justify-center items-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                            >
                              x
                            </div>
                          </div>

                          <div className="relative flex">
                            <Input
                              className={cn(
                                'w-[300px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40 max-sm:w-full',
                                !errors.delivery_date && deliveryDate && '!border-lime-300',
                                !!errors.delivery_date && !!touched.delivery_date && '!border-pink-600',
                              )}
                              type="text"
                              readOnly
                              name="delivery_date"
                              placeholder="Select date"
                              value={
                                deliveryDate ? format(parse(deliveryDate, 'MM/dd/yy', new Date()), 'MMM d, yyyy') : ''
                              }
                            />

                            <div
                              className="relative cursor-pointer"
                              onClick={() => {
                                handleToggleDatePickers(!showDeliveryDatePicker, 'delivery');
                              }}
                            >
                              <Icon
                                name="calendar"
                                className={cn(
                                  'absolute bottom-[12px] right-[10px] w-5 h-5 text-white',
                                  showDeliveryDatePicker && 'hidden',
                                )}
                              />
                            </div>
                          </div>

                          {showDeliveryDatePicker && (
                            <Field
                              className={cn(
                                'z-10 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                                !errors.delivery_date && '!border-lime-300',
                                !!errors.delivery_date && !!touched.delivery_date && '!border-pink-600',
                              )}
                              type="text"
                              label="Delivery date"
                              name="delivery_date"
                            >
                              {({ field, form }: { field: any; form: any }) => (
                                <div className="relative">
                                  <ShootDayPicker
                                    classNames="right-0 bottom-[55px]"
                                    // field={{
                                    //   ...field,
                                    //   value: deliveryDate ? parse(deliveryDate, 'MM/dd/yy', new Date()) : field.value,
                                    // }}
                                    field={field}
                                    form={form}
                                    values={values}
                                    setShowDatePicker={setShowDeliveryDatePicker}
                                    handleSelect={(date: Date) => {
                                      //-- format date for the hook.
                                      const formattedDate = format(date, 'MM/dd/yy');

                                      //-- use handleSetDeliveryDate directly.
                                      setDeliveryDate(formattedDate);

                                      setShowDeliveryDatePicker(false);
                                    }}
                                  />
                                </div>
                              )}
                            </Field>
                          )}

                          {!!errors.delivery_date && !!touched.delivery_date && (
                            <div className=" h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                              <Icon name="error" className="w-4 h-4 text-pink-600" />

                              <div className="font-normal text-pink-600 text-xs leading-none">
                                {errors.delivery_date as string}
                              </div>
                            </div>
                          )}
                        </Label>
                      ) : (
                        <div className="flex flex-col justify-between w-[300px] gap-1 max-sm:w-full">
                          <div
                            onClick={() => setShowDeliveryDateInput(true)}
                            className={cn(
                              'relative top-[11px] flex items-center justify-center h-[32px] py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95 max-sm:w-full max-sm:top-0',
                            )}
                          >
                            + Delivery Date
                          </div>
                        </div>
                      )}
                    </div>

                    {/* pre-pro and post dates */}
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-stretch max-sm:gap-6',
                      )}
                    >
                      {showPrepDates ? (
                        <Label className={cn('flex flex-col gap-2 h-[66px] max-sm:w-full')}>
                          <div className="flex items-center gap-1">
                            <div className="text-white font-bold">Prep dates</div>

                            <div
                              onClick={() => {
                                setPrepDates(null);
                                setShowPrepDates(false);
                              }}
                              className="flex justify-center text-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                            >
                              x
                            </div>
                          </div>

                          <div className="relative flex max-sm:w-full">
                            <Input
                              className={cn(
                                'w-[300px] relative top-[1px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40 max-sm:w-full',
                                !errors.prep_dates && values.prep_dates.length > 0 && '!border-lime-300',
                                !!errors.prep_dates && !!touched.prep_dates && '!border-pink-600',
                              )}
                              type="text"
                              name="prep_dates"
                              placeholder="Select date(s)"
                              value={formatDatesForInput(
                                prepDatesArr.length > 0 ? prepDatesArr : (project.prep_dates ?? []),
                              )}
                            />

                            <div
                              className="relative cursor-pointer"
                              onClick={() => {
                                handleToggleDatePickers(!showPrepDatesPicker, 'prep');
                              }}
                            >
                              <Icon
                                name="calendar"
                                className={cn(
                                  'absolute bottom-[12px] right-[10px] w-5 h-5',
                                  showPrepDatesPicker && 'hidden',
                                )}
                              />
                            </div>
                          </div>

                          {showPrepDatesPicker && (
                            <Field
                              className={cn(
                                'absolute z-10 top-0 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                                !errors.prep_dates && values.prep_dates.length && '!border-lime-300',
                                !!errors.prep_dates && !!touched.prep_dates && '!border-pink-600',
                              )}
                              type="text"
                              label="Prep dates"
                              name="prep_dates"
                            >
                              {({ field, form }: { field: any; form: any }) => (
                                <div className="relative">
                                  <Calendar
                                    classNames="left-0 bottom-[60px]"
                                    // field={{
                                    //   ...field,
                                    //   value: prepDatesArr && prepDatesArr.length > 0 ?
                                    //     {
                                    //       from: parse(prepDatesArr[0], 'MM/dd/yy', new Date()),
                                    //       to: parse(prepDatesArr[prepDatesArr.length - 1], 'MM/dd/yy', new Date())
                                    //     } : field.value
                                    // }}
                                    field={field}
                                    form={form}
                                    values={values}
                                    type="prep"
                                    setShowDatePicker={handleToggleDatePickers}
                                    setRangeDatesCallback={setRangeDatesCallback}
                                  />
                                </div>
                              )}
                            </Field>
                          )}

                          {!!errors.prep_dates && !!touched.prep_dates && (
                            <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                              <Icon name="error" className="w-4 h-4 text-pink-600" />

                              <div className="font-normal text-pink-600 text-xs leading-none">
                                {errors.prep_dates as string}
                              </div>
                            </div>
                          )}
                        </Label>
                      ) : (
                        <div>
                          <div
                            onClick={() => setShowPrepDates(true)}
                            className="relative top-[11px] flex justify-center w-[300px] h-[32px] py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95 max-sm:w-full"
                          >
                            + Prep Dates
                          </div>
                        </div>
                      )}

                      {showPostDates ? (
                        <Label className={cn('flex flex-col gap-2 h-[66px] max-sm:w-full')}>
                          <div className="flex items-center gap-1">
                            <div className="text-white font-bold">Post dates</div>

                            <div
                              onClick={() => {
                                setPostDates(null);
                                setShowPostDates(false);
                              }}
                              className="flex justify-center items-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                            >
                              x
                            </div>
                          </div>

                          <div className="relative flex max-sm:w-full">
                            <Input
                              className={cn(
                                'w-[300px] relative top-[1px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40 max-sm:w-full',
                                !errors.post_dates && values.post_dates.length > 0 && '!border-lime-300',
                                !!errors.post_dates && !!touched.post_dates && '!border-pink-600',
                              )}
                              type="text"
                              name="post_dates"
                              placeholder="Select date(s)"
                              value={formatDatesForInput(
                                postDatesArr.length > 0 ? postDatesArr : (project.post_dates ?? []),
                              )}
                            />

                            <div
                              className="relative cursor-pointer"
                              onClick={() => {
                                handleToggleDatePickers(!showPostDatesPicker, 'post');
                              }}
                            >
                              <Icon
                                name="calendar"
                                className={cn(
                                  'absolute bottom-[12px] right-[10px] w-5 h-5 text-white',
                                  showPostDatesPicker && 'hidden',
                                )}
                              />
                            </div>
                          </div>

                          {showPostDatesPicker && (
                            <Field
                              className={cn(
                                'z-10 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                                !errors.post_dates && values.post_dates.length && '!border-lime-300',
                                !!errors.post_dates && !!touched.post_dates && '!border-pink-600',
                              )}
                              type="text"
                              label="Post dates"
                              name="post_dates"
                            >
                              {({ field, form }: { field: any; form: any }) => (
                                <div className="relative">
                                  <Calendar
                                    classNames="right-0 bottom-[60px]"
                                    // field={{
                                    //   ...field,
                                    //   value:
                                    //     postDatesArr && postDatesArr.length > 0
                                    //       ? {
                                    //           from: parse(postDatesArr[0], 'MM/dd/yy', new Date()),
                                    //           to: parse(postDatesArr[postDatesArr.length - 1], 'MM/dd/yy', new Date()),
                                    //         }
                                    //       : field.value,
                                    // }}
                                    field={field}
                                    form={form}
                                    values={values}
                                    type="post"
                                    setShowDatePicker={handleToggleDatePickers}
                                    setRangeDatesCallback={setRangeDatesCallback}
                                  />
                                </div>
                              )}
                            </Field>
                          )}

                          {!!errors.post_dates && !!touched.post_dates && (
                            <div className=" h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                              <Icon name="error" className="w-4 h-4 text-pink-600" />

                              <div className="font-normal text-pink-600 text-xs leading-none">
                                {errors.post_dates as string}
                              </div>
                            </div>
                          )}
                        </Label>
                      ) : (
                        <div
                          onClick={() => setShowPostDates(true)}
                          className="relative top-[11px] flex justify-center w-[300px] h-[32px] py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95 max-sm:w-full"
                        >
                          + Post/Edit Dates
                        </div>
                      )}
                    </div>

                    {isForSheet && (
                      <Label className={cn('flex flex-col gap-2')}>
                        <div className="text-white font-bold">Crew contact info visible</div>

                        <div className="flex items-center">
                          <div
                            onClick={() => {
                              setFieldValue('contact_info_visible', true);
                            }}
                            className={cn(
                              'flex justify-center items-center w-[45px] h-[28px] bg-[#2a2a2a] text-[12px] text-white/60 font-bold text-center rounded-tl-2xl rounded-bl-2xl cursor-pointer',
                              values.contact_info_visible && 'bg-lime-300/80 text-black',
                            )}
                          >
                            YES
                          </div>

                          <div
                            onClick={() => {
                              setFieldValue('contact_info_visible', false);
                            }}
                            className={cn(
                              'flex justify-center items-center w-[45px] h-[28px] bg-[#2a2a2a] text-[12px] text-white/60 font-bold text-center rounded-tr-2xl rounded-br-2xl cursor-pointer',
                              !values.contact_info_visible && 'bg-red-500/80 text-white/100',
                            )}
                          >
                            NO
                          </div>
                        </div>
                      </Label>
                    )}
                  </div>

                  <DialogFooter
                    className={cn(
                      'px-8 max-sm:px-2 max-sm:sticky max-sm:bottom-0 max-sm:bg-stone-950 max-sm:py-3 max-sm:border-t max-sm:border-zinc-700/70 max-sm:flex-row max-sm:gap-2 max-sm:justify-between',
                    )}
                  >
                    <Button
                      className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed max-sm:w-[46%]"
                      variant="outlineAccent"
                      size="compact"
                      onClick={close}
                    >
                      Cancel
                    </Button>

                    <Button
                      className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed max-sm:w-[46%]"
                      variant="accent"
                      size="compact"
                      disabled={!isValid || isValidating || !dirty}
                      onClick={submitForm}
                    >
                      Continue
                    </Button>
                  </DialogFooter>
                </>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>

      {showConflictDialog && (
        <Dialog open={showConflictDialog} onOpenChange={(open) => !open && setShowConflictDialog(false)}>
          <DialogContent
            className="w-[500px] max-sm:w-[90%] max-sm:max-h-[80vh]"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Icon name="alert" className="w-8 h-8 text-yellow-400" />
                <DialogTitle>Overwrite dates?</DialogTitle>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-2 p-4 max-sm:overflow-y-auto">
              <div className="text-[15px] text-white/70">
                You&apos;re submitting a new range of workdays that will overwrite the previous ones. The following days
                have associated entities, locations, and/or crew that will be deleted:
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1 w-full">
                {conflictingRecords.map((record: any, i: number) => {
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-center w-auto h-[30px] px-2 py-1 text-sm font-bold rounded-xl bg-zinc-800"
                    >
                      {record.date ? formatDate(new Date(record.date), 'EEE, MMM do') : 'Unknown date'}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="h-[40px] cursor-pointer"
                onClick={() => setShowConflictDialog(false)}
              >
                Cancel
              </Button>

              <Button
                variant="alert"
                className="h-[40px] cursor-pointer"
                onClick={() => handleConfirmOverwrite(formValues)}
              >
                Proceed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
