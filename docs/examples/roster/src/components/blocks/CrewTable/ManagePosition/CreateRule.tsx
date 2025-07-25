import { Button } from '@/components/ui/Button';
import { Dialog, DialogContentPortless, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { createClient } from '@/lib/supabase/client';
import { fuzzySearchDepartments } from '@/rules/departments';
import { Formik } from 'formik';
import { useMemo, useState } from 'react';
import { Field } from '../AddCrew/Field';
import { useCrewStore } from '@/store/crew';
import { Icon } from '@/components/ui/Icon';
import { Json } from '@/types/supabase';
import { PositionType } from '@/types/type';
import { capitalizeString } from '@/lib/utils';
import { createDepartmentRule, createPositionRule } from '@/lib/rules/createRules';
import { ModernRule } from '@/types/rules';

export const CreateRule: React.FC<{
  onUpdate: () => void;
  position?: PositionType | null;
  onClose: () => void;
  onUpdatePosition?: (name: string, department: string[]) => void;
  open?: boolean;
  setOpen: (open: boolean) => void;
}> = ({ onUpdate, onClose, open, position, onUpdatePosition, setOpen }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<'position' | 'department'>('position');
  const [departmentSuggestions, setDepartmentSuggestions] = useState<any[]>([]);
  const [conflict, setConflict] = useState<boolean>(false);

  const { positionRules, positionRulesId, company, mergedPositionRules } = useCrewStore();
  const supabase = createClient();

  const cleanedPosition = useMemo(() => {
    return {
      name: capitalizeString(position?.name ?? ''),
      department: position?.department ?? [],
    };
  }, [position]);

  const checkConflict = (value: string) => {
    if (!value.trim()) {
      setConflict(false);
      return;
    }

    // Check if this position name conflicts with existing rules
    const hasConflict = mergedPositionRules.some(
      (rule) =>
        rule.type === 'position' &&
        (rule.position?.toLowerCase() === value.toLowerCase() ||
          rule.overridePosition?.toLowerCase() === value.toLowerCase() ||
          rule.aliases.some((alias) => alias.toLowerCase() === value.toLowerCase())),
    );

    setConflict(hasConflict);
  };

  const getDepartmentSuggestions = (query: string) => {
    if (!query.trim()) {
      setDepartmentSuggestions([]);
      return;
    }

    const suggestions = fuzzySearchDepartments(query).slice(0, 5);
    setDepartmentSuggestions(suggestions);
  };

  const createRule = async (values: { name: string; department: string[]; aliases?: string[] }) => {
    if (!company?.id || !values.name.trim()) {
      return;
    }

    setLoading(true);

    let rule_set = [...positionRules];
    let newRule: ModernRule;

    const aliases = values.aliases || [];

    if (ruleType === 'position') {
      newRule = createPositionRule(
        cleanedPosition.name,
        values.name.trim(),
        values.department.length ? values.department : cleanedPosition.department,
        aliases,
      );
    } else {
      // For department rules, we use the first department as the original
      const originalDepartment = cleanedPosition.department[0] || cleanedPosition.name;
      newRule = createDepartmentRule(originalDepartment, values.name.trim(), aliases);
    }

    // Check if rule already exists and update, otherwise add new
    const existingIndex = rule_set.findIndex((r) => {
      if (ruleType === 'position') {
        return (
          r.type === 'position' && (r.position === cleanedPosition.name || r.overridePosition === values.name.trim())
        );
      } else {
        return r.type === 'department' && r.departments.includes(cleanedPosition.department[0] || cleanedPosition.name);
      }
    });

    if (existingIndex !== -1) {
      rule_set[existingIndex] = newRule;
    } else {
      rule_set.push(newRule);
    }

    if (positionRulesId) {
      // Update existing rule set
      await supabase.from('crew_rule_set').upsert({
        id: positionRulesId,
        company: company.id,
        rule_set: rule_set as unknown as Json,
      });
    } else {
      // Create new rule set
      await supabase.from('crew_rule_set').insert({
        company: company.id,
        rule_set: rule_set as unknown as Json,
      });
    }

    if (ruleType === 'position') {
      onUpdatePosition?.(values.name.trim(), values.department.length ? values.department : cleanedPosition.department);
    }

    setLoading(false);
    onUpdate();
    onClose();
  };

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
        setOpen(o);
      }}
    >
      <DialogContentPortless
        className="gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex flex-col gap-[2px]">Create new position rule</div>
            </DialogTitle>

            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <Formik
          initialValues={{
            name: '',
            department: cleanedPosition.department,
            aliases: [] as string[],
          }}
          onSubmit={createRule}
        >
          {({ isValidating, isValid, touched, errors, values, submitForm, handleChange }) => {
            return (
              <>
                <div className="flex flex-col gap-4 p-6">
                  <div className="group relative">
                    <Field
                      label="Position Name"
                      name={'name'}
                      placeholder="e.g. Director, Producer"
                      errors={errors}
                      touched={touched}
                      values={values}
                      validate={(value: string) => {
                        if (!value) {
                          return 'Position name is required';
                        }
                      }}
                      handleChange={(e) => {
                        checkConflict(e.target.value);
                        handleChange(e);
                      }}
                    />
                  </div>
                  <div className="group relative">
                    <Field
                      label="Department"
                      name={'department'}
                      placeholder="e.g. Production, Art"
                      errors={errors}
                      touched={touched}
                      values={values}
                      type="tag"
                      handleChange={(e) => {
                        getDepartmentSuggestions(e.target.value);
                      }}
                      suggestions={departmentSuggestions}
                      resetSuggestions={() => setDepartmentSuggestions([])}
                      validate={(value) => {
                        if (!value?.length) {
                          return 'Department is required';
                        }
                      }}
                    />
                  </div>
                  <div className="group relative">
                    <Field
                      label="Aliases (Optional)"
                      name={'aliases'}
                      placeholder="e.g. Dir, Producer, Prod"
                      errors={errors}
                      touched={touched}
                      values={values}
                      type="tag"
                      handleChange={() => {}}
                    />
                  </div>
                </div>
                {conflict && (
                  <div className="px-6 py-3 bg-yellow-400 bg-opacity-10 items-center gap-2 flex">
                    <Icon name="alert" className="text-yellow-400 w-4 h-4" />
                    <div className="text-yellow-400 text-sm font-medium leading-tight">
                      This rule might conflict with existing rules
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button className="px-4 text-sm font-semibold" variant="outline" size="compact" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || loading}
                    onClick={submitForm}
                  >
                    {!loading ? 'Create' : <LoadingIndicator dark size="small" />}
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </Formik>
      </DialogContentPortless>
    </Dialog>
  );
};
