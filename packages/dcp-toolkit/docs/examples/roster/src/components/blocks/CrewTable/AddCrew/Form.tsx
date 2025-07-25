import { Button } from '@/components/ui/Button';
import { DialogFooter } from '@/components/ui/Dialog';
import { Formik, FormikValues } from 'formik';
import { Field } from './Field';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import React, { useMemo, useState } from 'react';
import { searchDepartments } from '@/rules/departments';
import { useSearchDepartments, useSearchPositions } from '@/store/crew';
import { cn } from '@/lib/utils';

export const AddCrewForm: React.FC<{
  onSubmit: (values: FormikValues) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  toSheet?: boolean;
  department?: string;
  position?: string;
  name?: string;
  email?: string;
  phone?: string;
  callTime?: string;
  wrapTime?: string;
  toProject?: boolean;
  hasPosition?: boolean;
  crewType?: 'crew' | 'talent';
}> = ({
  onSubmit,
  onCancel,
  loading,
  toSheet,
  department,
  position,
  name,
  email,
  phone,
  callTime,
  wrapTime,
  toProject,
  hasPosition,
  crewType = 'crew',
}) => {
  const { search: searchPositions, fuzzySearch: fuzzySearchPositions } = useSearchPositions();
  const { fuzzySearchDepartments, getAllDepartmentSuggestions } = useSearchDepartments();

  const [positionSuggestions, setPositionSuggestions] = useState<string[]>([]);
  const [positionSuggestionsVisible, setPositionSuggestionsVisible] = useState(false);
  const [departmentSuggestionsVisible, setDepartmentSuggestionsVisible] = useState(false);
  const [departmentSuggestions, setDepartmentSuggestions] = useState<string[]>([]);

  const [showWrap, setShowWrap] = useState(false);

  const getPositionSuggestions = (value: string) => {
    if (!value || value.length < 2) return setPositionSuggestions([]);

    return setPositionSuggestions(fuzzySearchPositions(value));
  };

  const getDepartmentSuggestions = (value: string, position?: string) => {
    if (position) {
      const positionDepartments = searchPositions(position)?.departments ?? [];
      const searchResults = value ? fuzzySearchDepartments(value) : getAllDepartmentSuggestions();

      return setDepartmentSuggestions(Array.from(new Set([...positionDepartments, ...searchResults])));
    }

    const searchResults = value ? fuzzySearchDepartments(value) : getAllDepartmentSuggestions();

    return setDepartmentSuggestions(Array.from(new Set([...searchResults])));
  };

  const initialValues = useMemo(() => {
    const p = position ? searchPositions(position)?.position || position : '';
    const d = department ? searchDepartments(department)?.department || department : '';

    return {
      name: name ?? '',
      email: email ?? '',
      phone: phone ?? '',
      position: p,
      department: toSheet || toProject ? d : [d].filter((v) => !!v),
      location: '',
      call_time: callTime ?? '',
      wrap_time: wrapTime ?? '',
    };
  }, [department, position, searchPositions, toSheet, toProject, callTime, wrapTime, name, email, phone]);

  return (
    <Formik initialValues={initialValues} validateOnBlur={true} validateOnMount={true} onSubmit={onSubmit}>
      {({ isValidating, isValid, touched, errors, values, submitForm, handleChange, handleBlur, setFieldValue }) => {
        return (
          <>
            <div className="p-8 flex flex-col gap-5 max-w-[463px]">
              <Field
                label="Full Name"
                name="name"
                placeholder="e.g., Steve Witmer"
                errors={errors}
                touched={touched}
                validate={(value: string) => {
                  if (!value) {
                    return 'Name is required';
                  }
                }}
                values={values}
              />

              <Field
                label="Email"
                name={'email'}
                type="email"
                placeholder="e.g., you@example.com"
                errors={errors}
                touched={touched}
                validate={(value: string) => {
                  if (value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
                    return 'Valid email is required';
                  }
                }}
                icon="email"
                values={values}
              />

              <Field
                label="Phone"
                name={'phone'}
                placeholder="e.g., (555) 867-5309"
                errors={errors}
                touched={touched}
                type="tel"
                icon="phone"
                values={values}
                handleChange={handleChange}
              />

              {!toSheet && (
                <div className="flex gap-2">
                  <Field
                    label="City"
                    name={'city'}
                    placeholder="e.g., Los Angeles"
                    errors={errors}
                    touched={touched}
                    type="text"
                    icon="pin"
                    values={values}
                    handleChange={handleChange}
                  />

                  <Field
                    label="State"
                    name={'state'}
                    placeholder="e.g., California"
                    errors={errors}
                    touched={touched}
                    type="text"
                    // icon="pin"
                    values={values}
                    handleChange={handleChange}
                  />
                </div>
              )}

              {!hasPosition && (
                <div className="relative">
                  <Field
                    label={crewType === 'crew' ? 'Position' : 'Role/Character Name'}
                    name={'position'}
                    placeholder={crewType === 'crew' ? 'e.g., Director, Producer' : 'e.g., Mia Wallace, Jules Winfield'}
                    errors={errors}
                    touched={touched}
                    values={values}
                    validate={(value: string) => {
                      if (!value || value === '') {
                        return 'Position is required';
                      }
                    }}
                    onBlur={(e) => {
                      setTimeout(() => {
                        setPositionSuggestionsVisible(false);
                      }, 500);
                      handleBlur(e);
                    }}
                    onFocus={() => {
                      setPositionSuggestionsVisible(true);
                    }}
                    handleChange={(e) => {
                      getPositionSuggestions(e.target.value);
                      handleChange(e);
                    }}
                  />

                  {positionSuggestions.length > 0 && positionSuggestionsVisible && (
                    <div className="flex animate-in fade-in-0 flex-col absolute left-0 right-0 max-h-[160px] z-40 top-[72px] overflow-scroll bg-zinc-900 rounded-lg p-1 text-white text-opacity-95 shadow-md">
                      {positionSuggestions.map((s, i) => {
                        return (
                          <div
                            onClick={() => {
                              setFieldValue('position', s);
                              setPositionSuggestions([]);
                            }}
                            className="px-2 py-1 cursor-pointer rounded-sm duration-100 text-base hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
                            key={`${s}-${i}`}
                          >
                            {s}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                {!hasPosition && crewType !== 'talent' && (
                  <Field
                    label="Department"
                    name={'department'}
                    placeholder="e.g., Production, Art"
                    errors={errors}
                    touched={touched}
                    values={values}
                    type={toSheet ? 'text' : 'tag'}
                    validate={(value: string) => {
                      if (!value || value === '') {
                        return 'Department is required';
                      }
                    }}
                    onBlur={(e) => {
                      if (toSheet) {
                        setTimeout(() => {
                          setDepartmentSuggestionsVisible(false);
                        }, 500);
                      }
                      handleBlur(e);
                    }}
                    onFocus={
                      toSheet
                        ? () => {
                            setDepartmentSuggestionsVisible(true);
                          }
                        : undefined
                    }
                    handleChange={(e) => {
                      getDepartmentSuggestions(e.target.value);
                      if (toSheet) {
                        handleChange(e);
                      }
                    }}
                    suggestions={departmentSuggestions}
                    resetSuggestions={() => setDepartmentSuggestions([])}
                  />
                )}

                {toSheet && departmentSuggestions.length > 0 && departmentSuggestionsVisible && (
                  <div className="flex animate-in fade-in-0 flex-col absolute left-0 right-0 max-h-[160px] z-40 top-[72px] overflow-scroll bg-zinc-900 rounded-lg p-1 text-white text-opacity-95 shadow-md">
                    {departmentSuggestions.map((s, i) => {
                      return (
                        <div
                          onClick={() => {
                            setFieldValue('department', s);
                            setDepartmentSuggestions([]);
                          }}
                          className="px-2 py-1 cursor-pointer rounded-sm duration-100 text-base hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
                          key={`${s}-${i}`}
                        >
                          {s}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!toProject && toSheet && (
                <div className={cn('flex items-center gap-2', crewType === 'talent' && 'relative top-[-15px]')}>
                  <Field
                    label="Call Time"
                    name="call_time"
                    placeholder="e.g., 10:00 AM"
                    errors={errors}
                    touched={touched}
                    values={values}
                  />

                  {showWrap ? (
                    <Field
                      label="Wrap Time"
                      name="wrap_time"
                      placeholder="e.g., 7:00 PM"
                      errors={errors}
                      touched={touched}
                      values={values}
                    />
                  ) : (
                    <div
                      key="wrap_time"
                      onClick={() => {
                        setShowWrap(true);
                      }}
                      className={cn(
                        'relative top-[10px] flex items-center justify-center min-w-[195px] h-[32px] px-1 text-sm text-white/70 cursor-pointer border-[0.5px] border-opacity-0 rounded-2xl bg-stone-900/90 duration-100 hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95',
                      )}
                    >
                      + Wrap Time
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button className="px-4 text-sm font-semibold" variant="outline" size="compact" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                variant="accent"
                size="compact"
                disabled={!isValid || isValidating || loading}
                onClick={submitForm}
              >
                {!loading ? 'Save' : <LoadingIndicator dark size="small" />}
              </Button>
            </DialogFooter>
          </>
        );
      }}
    </Formik>
  );
};
