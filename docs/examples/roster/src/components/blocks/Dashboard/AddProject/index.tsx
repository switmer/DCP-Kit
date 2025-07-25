'use client';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { createClient } from '@/lib/supabase/client';
import { capitalizeString, cn } from '@/lib/utils';
import { getUser } from '@/queries/get-user';
import { useQuery } from '@tanstack/react-query';
import { Field, Formik, FormikValues } from 'formik';
import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { TagSelection } from '@/components/ui/TagSelection';
import {
  addDays,
  addWeeks,
  compareAsc,
  eachDayOfInterval,
  format,
  formatISO,
  parse,
  previousDay,
  subDays,
  subWeeks,
} from 'date-fns';
import { Calendar } from '@/components/ui/Calendar';
import { useRouter } from 'next-nprogress-bar';
import { useCompanyStore } from '@/store/company';
import { formatDate } from 'date-fns/format';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { ShootDayPicker } from '@/components/blocks/CallSheet/ShootDates/ShootDayPicker';
import { useDateRangeManager } from '@/lib/hooks/useDateRangeManager';
import { crewTemplates } from '@/components/blocks/Crewing/StartFromTemplate/templates';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

export const AddProject: React.FC<{
  open: boolean;
  close: () => void;
  onUpdate?: () => void;
}> = ({ open, close, onUpdate }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showPrepDates, setShowPrepDates] = useState(false);
  const [showPostDates, setShowPostDates] = useState(false);
  const [showJobNumber, setShowJobNumber] = useState(false);

  const {
    prepDates: prepDatesArr,
    shootDates: datesArr,
    postDates: postDatesArr,
    deliveryDate,
    setShootDates,
    setPrepDates,
    setPostDates,
    setDeliveryDate,
  } = useDateRangeManager();

  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDeliveryDateInput, setShowDeliveryDateInput] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [showShootDatesPicker, setShowShootDatesPicker] = useState(false);
  const [showPrepDatesPicker, setShowPrepDatesPicker] = useState(false);
  const [showPostDatesPicker, setShowPostDatesPicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([
    'Commercial',
    'Documentary',
    'Film',
    'Live Event',
    'Music Video',
    'TV Movie',
    'TV Series',
    'YouTube',
  ]);

  const statusSuggestions = ['Status 1', 'Status 2', 'Status 3', 'Status 4', 'Status 5'];

  const { activeCompany } = useCompanyStore();

  const router = useRouter();
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

  // Update form field value when deliveryDate changes
  const formRef = useRef<{ setFieldValue?: (field: string, value: any) => void }>({});

  useEffect(() => {
    if (formRef.current?.setFieldValue && deliveryDate) {
      // Parse the deliveryDate string to a Date object
      const deliveryDateObj = parse(deliveryDate, 'MM/dd/yy', new Date());
      // Update the form field value with the adjusted date
      formRef.current.setFieldValue('delivery_date', deliveryDateObj);
    }
  }, [deliveryDate]);

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ['user'], queryFn: () => getUser(supabase) });

  if (!isMounted) {
    return <></>;
  }

  const addCustomTag = (type: string) => {
    suggestions.push(capitalizeString(type));
  };

  const handleFormSubmit = async (values: FormikValues) => {
    if (!user) {
      toast.error('Something went wrong.');

      return { id: null, slug: null };
    }

    setIsLoading(true);

    const { data: createProjectData, error: createProjectError } = await supabase
      .from('project')
      .insert({
        name: values?.name,
        job_number: values?.job_number,
        type: values?.type,
        dates: datesArr,
        prep_dates: prepDatesArr,
        post_dates: postDatesArr,
        delivery_date: deliveryDate,
        company: activeCompany,
        budget: values?.budget,
        status: values?.status,
      })
      .select()
      .single();

    if (createProjectError || !createProjectData) {
      toast.error('Something went wrong creating the project.');
      console.log('Error: ', createProjectError);

      setIsLoading(false);

      return { id: null, slug: null };
    }

    toast.success(`Project "${createProjectData?.name}" created`);

    // create positions based on selected template.
    if (selectedTemplate && crewTemplates[selectedTemplate as keyof typeof crewTemplates]) {
      const template = crewTemplates[selectedTemplate as keyof typeof crewTemplates];

      // create project positions for each template position.
      for (const pos of template.positions) {
        let department = pos.department;

        // create an array of position objects based on the quantity.
        const positionsToCreate = Array.from({ length: pos.quantity }, () => ({
          title: pos.position,
          department: department,
          project: createProjectData.id,
        }));

        // insert an amount of records equal to the quantity of positions in the template.
        const { error: positionError } = await supabase.from('project_position').insert(positionsToCreate);

        if (positionError) {
          console.error('Error creating project position:', positionError);
        }
      }

      toast.success(`Successfully created positions from template.`);
    }

    if (datesArr && datesArr.length > 0) {
      const callSheetData = datesArr.map((date, i) => ({
        company: activeCompany,
        status: 'ready' as any,
        project: createProjectData.id,
        date: date,
        raw_json: {
          full_date: date,
          day_of_days: `Day ${i + 1} of ${datesArr.length}`,
          job_name: `Shoot Day ${i + 1}`,
        },
      }));

      const { error } = await supabase.from('call_sheet').insert(callSheetData).select();

      if (error) {
        console.error('Error creating workdays:', error);
        toast.error('Something went wrong creating workdays.');
      } else {
        toast.success('Successfully created workdays.');
      }
    }

    return { id: createProjectData.id, slug: createProjectData.slug };

    // .then(() => {
    //   setShowJobNumber(false);
    //   setShowPrepDates(false);
    //   setShowPostDates(false);
    //
    //   setDatesArr(null);
    //   setPrepDatesArr(null);
    //   setPostDatesArr(null);
    // });
  };

  const setRangeDatesCallback = (range: { from: Date; to: Date }, type: 'shoot' | 'prep' | 'post') => {
    switch (type) {
      case 'shoot':
        setShootDates(range);
        setShowPrepDates(true);

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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          close();
        }
      }}
    >
      <DialogContent
        className={cn('w-[700px] max-w-[700px]')}
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={{
            name: '',
            job_number: '',
            type: 'Commercial',
            dates: null,
            prep_dates: null,
            post_dates: null,
            delivery_date: '',
            budget: '',
            status: '',
          }}
          validateOnChange={true}
          onSubmit={async (values: FormikValues) => {
            const { id, slug } = await handleFormSubmit(values);

            if (!id && !slug) return;

            router.push(`/project/${slug ?? id}`);
          }}
        >
          {({ isValidating, isValid, dirty, touched, errors, submitForm, values, setFieldValue, ...props }) => {
            // Store the setFieldValue function directly
            formRef.current = { setFieldValue };
            return (
              <>
                <div className="px-8 py-5 flex flex-col gap-5">
                  <div className="flex justify-between gap-2">
                    <Label className={cn('flex flex-col w-full gap-2')}>
                      <div className="text-white font-bold">Project title</div>

                      <Input
                        // autoFocus
                        className={cn(
                          'h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                          !errors.name && !!touched.name && '!border-lime-300',
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
                      {!!errors.name && !!touched.name && (
                        <div className="h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                          <Icon name="error" className="w-4 h-4 text-pink-600" />
                          <div className="font-normal text-pink-600 text-xs leading-none">{errors.name as string}</div>
                        </div>
                      )}
                    </Label>

                    {!showJobNumber && (
                      <div
                        onClick={() => setShowJobNumber(true)}
                        className={cn(
                          'fixed top-[131px] right-[38px] w-[80px] py-1 px-3 text-white cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-white/5 text-sm font-medium hover:bg-white/20',
                        )}
                      >
                        + Job #
                      </div>
                    )}

                    {showJobNumber && (
                      <Label className={cn('flex flex-col gap-2')}>
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold">Job number</div>

                          <div
                            onClick={() => setShowJobNumber(false)}
                            className="flex justify-center text-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                          >
                            x
                          </div>
                        </div>

                        <Input
                          className={cn(
                            'w-[170px] h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                            !errors.job_number && values.job_number !== '' && '!border-lime-300',
                          )}
                          label="Job number"
                          name="job_number"
                          placeholder="e.g. 162534"
                        />
                      </Label>
                    )}
                  </div>

                  {/* project budget and status */}
                  <div
                    className={cn(
                      'flex gap-4 w-full h-full items-center justify-evenly',
                      !showBudgetInput && !showStatusDropdown && 'pt-4',
                    )}
                  >
                    {showBudgetInput ? (
                      <Label className={cn('relative flex flex-col w-[300px] h-[66px] gap-1')}>
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
                            !errors.budget && values.budget !== '' && '!border-lime-300',
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
                      <div className="flex flex-col justify-between w-[300px] gap-1">
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
                      <Label className={cn('relative flex flex-col w-[300px] h-[66px] gap-1')}>
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
                              !errors.status && values.status !== null && '!border-lime-300',
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
                      <div className="flex flex-col justify-between w-[300px] gap-1">
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
                      suggestions={suggestions}
                      addCustomTagCallback={addCustomTag}
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

                  {/* project templates */}
                  <Label className={cn('flex flex-col gap-2')}>
                    <div className="text-white font-bold">Crew size</div>

                    <div className="flex items-center justify-evenly gap-3">
                      {Object.keys(crewTemplates).map((key) => {
                        if (key === 'full') return null;

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedTemplate(key)}
                            className={cn(
                              'group flex flex-col justify-center w-[200px] h-[70px] px-3 py-3 border-2 border-stone-900/90 bg-stone-900/90 rounded-xl cursor-pointer hover:bg-stone-900/100',
                              selectedTemplate === key &&
                                'bg-lime-300/10 border-2 border-lime-300/80 text-white/100 hover:bg-lime-300/10',
                              key === 'full' && 'cursor-disabled',
                            )}
                          >
                            <div className="text-lg group-hover:text-white/100">
                              {crewTemplates[key as keyof typeof crewTemplates].size}
                            </div>

                            <div
                              className={cn(
                                'text-sm text-white/50 group-hover:text-white/70',
                                selectedTemplate === key && 'text-white/70',
                              )}
                            >
                              {crewTemplates[key as keyof typeof crewTemplates].crewSize}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Label>

                  {/* shoot date & delivery date */}
                  <div className={cn('flex items-center justify-between gap-2')}>
                    <Label className={cn('flex flex-col gap-1')}>
                      <div className="flex items-center gap-1">
                        <div className="text-sm text-white font-bold">Shoot dates</div>

                        <div className="flex h-[14px]">Optional</div>
                      </div>

                      <div className="relative flex">
                        <Input
                          className={cn(
                            'w-[300px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                            !errors.dates && values.dates?.length > 0 && '!border-lime-300',
                            !!errors.dates && !!touched.dates && '!border-pink-600',
                          )}
                          type="text"
                          name="shoot_dates"
                          placeholder="Select date(s)"
                          value={formatDatesForInput(datesArr ?? [])}
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
                                classNames="left-0 bottom-[60px]"
                                field={{
                                  ...field,
                                  // Use shootDates from useDateRangeManager if available
                                  value:
                                    datesArr && datesArr.length > 0
                                      ? {
                                          from: new Date(parse(datesArr[0], 'MM/dd/yy', new Date())),
                                          to: new Date(parse(datesArr[datesArr.length - 1], 'MM/dd/yy', new Date())),
                                        }
                                      : field.value,
                                }}
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

                          <div className="font-normal text-pink-600 text-xs leading-none">{errors.dates as string}</div>
                        </div>
                      )}
                    </Label>

                    {showDeliveryDateInput ? (
                      <Label className={cn('relative flex flex-col gap-1')}>
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
                              'w-[300px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
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
                                'absolute bottom-[12px] right-[10px] w-5 h-5 text-white ',
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
                                  classNames="right-0 bottom-[60px]"
                                  field={{
                                    ...field,
                                    // Use deliveryDate from useDateRangeManager if available
                                    value: deliveryDate ? parse(deliveryDate, 'MM/dd/yy', new Date()) : field.value,
                                  }}
                                  form={form}
                                  values={values}
                                  setShowDatePicker={setShowDeliveryDatePicker}
                                  handleSelect={(date: Date) => {
                                    //-- format date for the hook.
                                    const formattedDate = format(date, 'MM/dd/yy');

                                    //-- use handleSetDeliveryDate directly.
                                    setDeliveryDate(formattedDate);

                                    // If we have shoot dates, show post dates section as they'll be auto-filled
                                    if (datesArr && datesArr.length > 0) {
                                      setShowPostDates(true);
                                    }

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
                      <div className="flex flex-col justify-between w-[300px] gap-1">
                        <div
                          onClick={() => setShowDeliveryDateInput(true)}
                          className={cn(
                            'relative top-[11px] flex items-center justify-center h-[32px] py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95',
                          )}
                        >
                          + Delivery Date
                        </div>
                      </div>
                    )}
                  </div>

                  {/* prep and post dates */}
                  <div className={cn('flex items-center justify-between gap-2')}>
                    {showPrepDates ? (
                      <Label className={cn('flex flex-col gap-2')}>
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

                        <div className="flex">
                          <Input
                            className={cn(
                              'w-[300px] relative top-[1px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.prep_dates && values.prep_dates?.length > 0 && '!border-lime-300',
                              !!errors.prep_dates && !!touched.prep_dates && '!border-pink-600',
                            )}
                            type="text"
                            name="prep_dates"
                            placeholder="Select date(s)"
                            value={prepDatesArr && formatDatesForInput(prepDatesArr)}
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
                                'absolute top-[12px] right-[10px] w-5 h-5',
                                showPrepDatesPicker && 'hidden',
                              )}
                            />
                          </div>
                        </div>

                        {showPrepDatesPicker && (
                          <Field
                            className={cn(
                              'relative z-10 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.prep_dates && values.prep_dates?.length && '!border-lime-300',
                              !!errors.prep_dates && !!touched.prep_dates && '!border-pink-600',
                            )}
                            type="text"
                            label="Prep dates"
                            name="prep_dates"
                            render={({ field, form }: { field: any; form: any }) => (
                              <div className="relative">
                                <Calendar
                                  classNames="left-0 bottom-[60px]"
                                  positioning="dashboard"
                                  field={{
                                    ...field,
                                    // Use prepDates from useDateRangeManager if available
                                    value:
                                      prepDatesArr && prepDatesArr.length > 0
                                        ? {
                                            from: new Date(parse(prepDatesArr[0], 'MM/dd/yy', new Date())),
                                            to: new Date(
                                              parse(prepDatesArr[prepDatesArr.length - 1], 'MM/dd/yy', new Date()),
                                            ),
                                          }
                                        : field.value,
                                  }}
                                  form={form}
                                  values={values}
                                  type="prep"
                                  setShowDatePicker={handleToggleDatePickers}
                                  setRangeDatesCallback={setRangeDatesCallback}
                                />
                              </div>
                            )}
                          />
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
                          className="relative top-[11px] flex items-center justify-center w-[300px] h-[32px] py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
                        >
                          + Prep Dates
                        </div>
                      </div>
                    )}

                    {showPostDates ? (
                      <Label className={cn('flex flex-col gap-2')}>
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

                        <div className="flex">
                          <Input
                            className={cn(
                              'w-[300px] relative top-[1px] px-3 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.post_dates && values.post_dates?.length > 0 && '!border-lime-300',
                              !!errors.post_dates && !!touched.post_dates && '!border-pink-600',
                            )}
                            type="text"
                            name="post_dates"
                            placeholder="Select date(s)"
                            value={postDatesArr && formatDatesForInput(postDatesArr)}
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
                              'relative z-10 h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                              !errors.post_dates && values.post_dates?.length && '!border-lime-300',
                              !!errors.post_dates && !!touched.post_dates && '!border-pink-600',
                            )}
                            type="text"
                            label="Post dates"
                            name="post_dates"
                            render={({ field, form }: { field: any; form: any }) => (
                              <div className="relative">
                                <Calendar
                                  classNames="right-0 bottom-[60px]"
                                  positioning="dashboard"
                                  field={{
                                    ...field,
                                    // Use postDates from useDateRangeManager if available
                                    value:
                                      postDatesArr && postDatesArr.length > 0
                                        ? {
                                            from: new Date(parse(postDatesArr[0], 'MM/dd/yy', new Date())),
                                            to: new Date(
                                              parse(postDatesArr[postDatesArr.length - 1], 'MM/dd/yy', new Date()),
                                            ),
                                          }
                                        : field.value,
                                  }}
                                  form={form}
                                  values={values}
                                  type="post"
                                  setShowDatePicker={handleToggleDatePickers}
                                  setRangeDatesCallback={setRangeDatesCallback}
                                />
                              </div>
                            )}
                          />
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
                        className="relative top-[11px] flex items-center justify-center w-[300px] h-[32px] py-1 px-3 text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 text-sm hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
                      >
                        + Post/Edit Dates
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className={cn('px-8')}>
                  <Button
                    className="px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="outlineAccent"
                    size="compact"
                    onClick={close}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="w-[150px] px-6 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || !dirty || isLoading}
                    onClick={submitForm}
                  >
                    {isLoading ? <LoadingIndicator size="small" /> : 'Save Changes'}
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
