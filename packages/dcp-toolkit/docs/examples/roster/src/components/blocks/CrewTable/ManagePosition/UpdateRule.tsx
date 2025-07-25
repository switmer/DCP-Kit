import { Button } from '@/components/ui/Button';
import { Dialog, DialogContentPortless, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { PositionType } from '@/types/type';
import { useMemo, useState, useEffect, FC, SetStateAction } from 'react';
import { useCrewStore } from '@/store/crew';
import { capitalizeString } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Json } from '@/types/supabase';
import { ModernRule } from '@/types/rules';
import { createPositionRule, createDepartmentRule } from '@/lib/rules/createRules';
import { Input } from '@/components/ui/Input';
import { TagInput } from '@/components/ui/TagInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

export const UpdateRule: FC<{
  position: PositionType;
  existingRule: ModernRule;
  onClose: () => void;
  onUpdate: () => void;
  open?: boolean;
  onUpdatePosition?: (name: string, department: string[]) => void;
  setOpen: (open: boolean) => void;
}> = ({ position, existingRule, onClose, onUpdate, open, onUpdatePosition, setOpen }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<'position' | 'department'>(existingRule.type);
  const [customName, setCustomName] = useState<string>('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const { positionRules, positionRulesId, company } = useCrewStore();
  const supabase = createClient();

  const cleanedPosition = useMemo(() => {
    return {
      name: capitalizeString(position?.name ?? ''),
      department: position?.department ?? [],
    };
  }, [position]);

  // initialize form with existing rule data.
  useEffect(() => {
    if (existingRule) {
      setRuleType(existingRule.type);
      setAliases([...existingRule.aliases]);
      setDepartments([...existingRule.departments]);

      if (existingRule.type === 'position') {
        setCustomName(existingRule.overridePosition || existingRule.position || '');
      } else {
        setCustomName(existingRule.overrideDepartment || '');
      }
    }
  }, [existingRule]);

  const updateRule = async () => {
    if (!company?.id || !customName.trim()) {
      return;
    }
    setLoading(true);

    let rule_set = [...positionRules];
    let updatedRule: ModernRule;

    if (ruleType === 'position') {
      updatedRule = createPositionRule(
        existingRule.position || cleanedPosition.name,
        customName.trim(),
        departments.length ? departments : cleanedPosition.department,
        aliases,
      );
    } else {
      // for department rules, use the original department from existing rule.
      const originalDepartment = existingRule.departments[0] || cleanedPosition.department[0] || cleanedPosition.name;

      updatedRule = createDepartmentRule(originalDepartment, customName.trim(), aliases);
    }

    // find and update the existing rule.
    const existingIndex = rule_set.findIndex((r) => {
      if (existingRule.type === 'position') {
        return r.type === 'position' && r.position === existingRule.position;
      } else {
        return r.type === 'department' && r.departments.some((dept) => existingRule.departments.includes(dept));
      }
    });

    if (existingIndex !== -1) {
      rule_set[existingIndex] = updatedRule;
    } else {
      rule_set.push(updatedRule);
    }

    if (positionRulesId) {
      await supabase.from('crew_rule_set').upsert({
        id: positionRulesId,
        company: company.id,
        rule_set: rule_set as unknown as Json,
      });
    } else {
      await supabase.from('crew_rule_set').insert({
        company: company.id,
        rule_set: rule_set as unknown as Json,
      });
    }

    if (ruleType === 'position') {
      onUpdatePosition?.(customName.trim(), departments.length ? departments : cleanedPosition.department);
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
            <DialogTitle>Update Rule for {cleanedPosition.name}</DialogTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>
        <div className="p-5 gap-5 flex flex-col">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-white">Rule Type</label>
            <Select value={ruleType} onValueChange={(value: 'position' | 'department') => setRuleType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="position">Position Rule</SelectItem>
                <SelectItem value="department">Department Rule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-white">
              {ruleType === 'position' ? 'Custom Position Name' : 'Custom Department Name'}
            </label>

            <Input
              value={customName}
              onChange={(e: { target: { value: SetStateAction<string> } }) => setCustomName(e.target.value)}
              placeholder={ruleType === 'position' ? 'Enter position name...' : 'Enter department name...'}
            />
          </div>

          {ruleType === 'position' && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white">Departments</label>
              <TagInput value={departments} onChange={setDepartments} placeholder="Enter departments..." />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-white">Aliases</label>
            <TagInput value={aliases} onChange={setAliases} placeholder="Enter aliases..." />
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
            onClick={updateRule}
            disabled={!customName.trim() || loading}
          >
            Update Rule
          </Button>
        </DialogFooter>
      </DialogContentPortless>
    </Dialog>
  );
};
