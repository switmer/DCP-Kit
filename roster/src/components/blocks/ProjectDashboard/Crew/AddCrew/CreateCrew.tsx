import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Formik, FormikValues } from 'formik';
import { Button } from '@/components/ui/Button';
import { useMemo, useState } from 'react';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useCrewStore, useSearchDepartments, useSearchPositions } from '@/store/crew';
import { fuzzySearchDepartments, searchDepartments } from '@/rules/departments';
import { Field } from '@/components/blocks/CrewTable/AddCrew/Field';
import { CrewMember } from '.';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { createDepartmentRule } from '@/lib/rules/createRules';
import { Json } from '@/types/supabase';

export const CreateCrew = ({
  open,
  onClose,
  position,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  position?: string;
  onSave?: (crew: CrewMember) => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [positionSuggestions, setPositionSuggestions] = useState<string[]>([]);
  const [positionSuggestionsVisible, setPositionSuggestionsVisible] = useState(false);
  const [departmentSuggestionsVisible, setDepartmentSuggestionsVisible] = useState(false);
  const [departmentSuggestions, setDepartmentSuggestions] = useState<string[]>([]);

  const { search: searchPositions, fuzzySearch: fuzzySearchPositions } = useSearchPositions();
  const { positionRules, positionRulesId, company, setPositionRules } = useCrewStore.getState();
  const { search: searchDepartmentRules } = useSearchDepartments();

  const supabase = createClient();

  const initialValues = useMemo(() => {
    const p = position ? searchPositions(position) : null;

    return {
      name: '',
      email: '',
      phone: '',
      position: p?.position ?? '',
      department: p?.departments?.[0] ?? '',
      location: '',
    };
  }, [position, searchPositions]);

  const getPositionSuggestions = (value: string) => {
    if (!value || value.length < 2) return setPositionSuggestions([]);

    return setPositionSuggestions(fuzzySearchPositions(value));
  };

  const getDepartmentSuggestions = (value: string, position?: string) => {
    if (position) {
      const positionDepartments = searchPositions(position)?.departments ?? [];
      return setDepartmentSuggestions(Array.from(new Set([...positionDepartments, ...fuzzySearchDepartments(value)])));
    }

    return setDepartmentSuggestions(Array.from(new Set([...fuzzySearchDepartments(value)])));
  };

  const onSubmit = async (values: FormikValues) => {
    if (company?.id && values.department) {
      // check if the department is custom (not in existing rules or static departments).
      const isCustomDepartment =
        !searchDepartments(values.department.toLowerCase()) && !searchDepartmentRules(values.department.toLowerCase());

      if (isCustomDepartment) {
        try {
          // create a new department rule.
          const newDepartmentRule = createDepartmentRule(values.department.trim(), values.department.trim(), []);

          // add to existing rules.
          const updatedRules = [...positionRules, newDepartmentRule];

          // handle the upsert properly based on whether we have an existing rule set.
          if (positionRulesId) {
            // update existing rule set.
            await supabase.from('crew_rule_set').upsert({
              id: positionRulesId,
              company: company.id,
              rule_set: updatedRules as unknown as Json,
            });
          } else {
            // create new rule set.
            await supabase.from('crew_rule_set').insert({
              company: company.id,
              rule_set: updatedRules as unknown as Json,
            });
          }

          setPositionRules(updatedRules);
        } catch (error) {
          console.error('Failed to create department rule:', error);
        }
      }
    }

    const response = await fetch('/api/crew', {
      method: 'POST',
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone,
        position: values.position,
        department: values.department,
        city: values.city,
        state: values.state,
      }),
    });

    if (!response.ok) {
      toast.error('Failed to add crew');
      setSaving(false);
      return;
    }

    const { data, error } = await response.json();

    if (error) {
      toast.error('Failed to add crew');
      setSaving(false);
      return;
    }

    onSave?.(data);
  };

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
      }}
    >
      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items center gap-2 items-center">Add Crew</div>
          </DialogTitle>
        </DialogHeader>
        <Formik initialValues={initialValues} validateOnBlur={true} validateOnMount={true} onSubmit={onSubmit}>
          {({
            isValidating,
            isValid,
            touched,
            errors,
            values,
            submitForm,
            handleChange,
            handleBlur,
            setFieldValue,
          }) => {
            return (
              <>
                <div className="p-8 flex flex-col gap-5 max-w-[463px]">
                  <Field
                    label="Full Name"
                    name="name"
                    placeholder="e.g. Steve Witmer"
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
                    placeholder="e.g. you@example.com"
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
                    placeholder="e.g. (555) 555-5555"
                    errors={errors}
                    touched={touched}
                    type="tel"
                    icon="phone"
                    values={values}
                    handleChange={handleChange}
                  />

                  <div className="flex gap-2">
                    <Field
                      label="City"
                      name={'city'}
                      placeholder="e.g. Los Angeles"
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
                      placeholder="e.g. California"
                      errors={errors}
                      touched={touched}
                      type="text"
                      // icon="pin"
                      values={values}
                      handleChange={handleChange}
                    />
                  </div>

                  <div className="relative">
                    <Field
                      label="Position"
                      name={'position'}
                      placeholder="e.g. Director, Producer"
                      errors={errors}
                      touched={touched}
                      values={values}
                      disabled={!!position}
                      validate={(value: string) => {
                        if (!value) {
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

                                const found = searchPositions(s);
                                if (found?.departments?.length) {
                                  setFieldValue('department', found?.departments?.[0]);
                                }

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

                  <div className="relative">
                    <Field
                      label="Department"
                      name={'department'}
                      placeholder="e.g. Production, Art"
                      errors={errors}
                      touched={touched}
                      values={values}
                      type={'text'}
                      validate={(value: string) => {
                        if (!value) {
                          return 'Department is required';
                        }
                      }}
                      onBlur={(e) => {
                        setTimeout(() => {
                          setDepartmentSuggestionsVisible(false);
                        }, 500);
                        handleBlur(e);
                      }}
                      onFocus={() => {
                        setDepartmentSuggestionsVisible(true);
                      }}
                      handleChange={(e) => {
                        getDepartmentSuggestions(e.target.value);
                        handleChange(e);
                      }}
                      suggestions={departmentSuggestions}
                      resetSuggestions={() => setDepartmentSuggestions([])}
                    />

                    {departmentSuggestions.length > 0 && departmentSuggestionsVisible && (
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
                </div>

                <DialogFooter>
                  <Button className="px-4 text-sm font-semibold" variant="outline" size="compact" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || saving}
                    onClick={submitForm}
                  >
                    {saving ? <LoadingIndicator dark size="small" /> : 'Save'}
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
