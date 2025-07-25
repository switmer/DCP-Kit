'use client';

import { FC, useState, useCallback, useEffect, useMemo } from 'react';
import { Editable } from '@/components/ui/Editable';
import { createClient } from '@/lib/supabase/client';
import { useCrewStore } from '@/store/crew';
import { createDepartmentRule } from '@/lib/rules/createRules';
import { Json } from '@/types/supabase';
import { toast } from 'sonner';
import { useCompanyStore } from '@/store/company';
import { ModernRule } from '@/types/rules';

type Props = {
  initialDepartments: string[];
};

export const EditableDepartmentList: FC<Props> = ({ initialDepartments }) => {
  const { positionRulesId, setPositionRules, setPositionRulesId } = useCrewStore();
  const { activeCompany } = useCompanyStore();
  const supabase = createClient();

  const [departmentRules, setDepartmentRules] = useState<ModernRule[]>([]);
  const [loading, setLoading] = useState(true);

  // fetch department rules.
  useEffect(() => {
    if (!activeCompany) return;

    const fetchDepartmentRules = async () => {
      try {
        const { data, error } = await supabase
          .from('crew_rule_set')
          .select('id, rule_set')
          .eq('company', activeCompany)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching department rules:', error);
          setLoading(false);
          return;
        }

        if (data) {
          const rules = (data.rule_set as unknown as ModernRule[]) || [];
          setDepartmentRules(rules);
          setPositionRules(rules);
          setPositionRulesId(data.id);
        } else {
          // create a new record if nothing exists yet.
          const { data: newData, error: insertError } = await supabase
            .from('crew_rule_set')
            .insert({ company: activeCompany, rule_set: [] })
            .select('id, rule_set')
            .single();

          if (insertError) {
            console.error('Error creating department rules:', insertError);
          } else if (newData) {
            setDepartmentRules([]);
            setPositionRules([]);
            setPositionRulesId(newData.id);
          }
        }
      } catch (error) {
        console.error('Error fetching department rules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentRules();
  }, [activeCompany, supabase, setPositionRules, setPositionRulesId]);

  // apply department overrides if they exist, otherwise return the default.
  const departments = useMemo(() => {
    if (!departmentRules || departmentRules.length === 0) {
      return initialDepartments;
    }

    return initialDepartments.map((department) => {
      const departmentRule = departmentRules.find(
        (rule) => rule.type === 'department' && rule.departments.includes(department),
      );

      return departmentRule?.overrideDepartment || department;
    });
  }, [initialDepartments, departmentRules]);

  const updateDepartmentRule = useCallback(
    async (originalDepartment: string, newDepartmentName: string) => {
      if (!activeCompany || !newDepartmentName.trim() || !positionRulesId) {
        return;
      }

      try {
        let rule_set = [...departmentRules];

        // check if a rule for this department already exists.
        const existingRuleIndex = rule_set.findIndex(
          (rule) => rule.type === 'department' && rule.departments.includes(originalDepartment),
        );

        const newRule = createDepartmentRule(originalDepartment, newDepartmentName.trim());

        if (existingRuleIndex !== -1) {
          rule_set[existingRuleIndex] = newRule;
        } else {
          rule_set.push(newRule);
        }

        const { error } = await supabase.from('crew_rule_set').upsert({
          id: positionRulesId,
          company: activeCompany,
          rule_set: rule_set as unknown as Json,
        });

        if (error) {
          throw error;
        }

        setDepartmentRules(rule_set);
        setPositionRules(rule_set);

        toast.success(`Department rule updated: "${originalDepartment}" → "${newDepartmentName}"`);
      } catch (error) {
        console.error('Error updating department rule:', error);
        toast.error('Failed to update department rule');
      }
    },
    [activeCompany, departmentRules, positionRulesId, setPositionRules, supabase],
  );

  const handleDepartmentChange = useCallback(
    (newValue: string, displayedDepartment: string) => {
      const index = departments.findIndex((dept) => dept === displayedDepartment);

      if (index === -1) {
        console.error('Department not found:', displayedDepartment);
        return;
      }

      const originalDepartment = initialDepartments[index];

      updateDepartmentRule(originalDepartment, newValue);
    },
    [departments, initialDepartments, updateDepartmentRule],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">Loading department rules...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {departments.map((department, index) => {
        return (
          <div
            key={`${initialDepartments[index]}-${index}`}
            className="flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 rounded-2xl py-4 px-4"
          >
            <div className="text-2xl text-white font-normal max-sm:text-xl flex items-center gap-2">
              <Editable
                className="text-2xl max-sm:text-xl min-w-fit"
                value={department}
                onChange={(newValue) => {
                  handleDepartmentChange(newValue, department);
                }}
                // placeholder="Enter department name..."
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
