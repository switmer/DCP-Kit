import { Button } from '@/components/ui/Button';
import { Dialog, DialogContentPortless, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { searchDepartments } from '@/rules/departments';
import { PositionType } from '@/types/type';
import { useMemo, useState } from 'react';

import { useCrewStore, useSearchPositions } from '@/store/crew';

import {
  capitalizeString,
  cn,
  filterModernRules,
  filterPositions,
  groupByDepartments,
  groupModernRulesByDepartments,
} from '@/lib/utils';
import { Search } from '../Search';
import { Icon } from '@/components/ui/Icon';
import { Json } from '@/types/supabase';
import { ModernRule } from '@/types/rules';

export const MergeRule: React.FC<{
  position: PositionType;
  onClose: () => void;
  onUpdate: () => void;
  open?: boolean;
  onUpdatePosition?: (name: string, department: string[]) => void;
  setOpen: (open: boolean) => void;
}> = ({ position, onClose, onUpdate, open, onUpdatePosition, setOpen }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [target, setTarget] = useState<ModernRule | null>(null);
  const { mergedPositionRules } = useCrewStore();
  const supabase = createClient();

  const { positionRules, positionRulesId, company } = useCrewStore();
  const { setPositionRules } = useCrewStore.getState();

  const cleanedPosition = useMemo(() => {
    return {
      name: capitalizeString(position?.name ?? ''),
      department: position?.department?.map((d) => searchDepartments(d)?.department ?? capitalizeString(d)) ?? [],
    };
  }, [position]);

  // filter only position rules for merging.
  const positionOnlyRules = useMemo(() => {
    return mergedPositionRules.filter((rule) => rule.type === 'position');
  }, [mergedPositionRules]);

  const groupedAndFiltered = useMemo(() => {
    if (!search) {
      return groupModernRulesByDepartments(positionOnlyRules);
    }

    return groupModernRulesByDepartments(filterModernRules(positionOnlyRules, search?.trim()));
  }, [search, positionOnlyRules]);

  const upsertRule = async () => {
    if (!company?.id || !target || target.type !== 'position') {
      return;
    }
    setLoading(true);
    let rule_set = [...positionRules];

    // create updated rule with merged aliases.
    const ruleToAdd: ModernRule = {
      ...target,
      type: 'position',
      overridePosition: target.overridePosition || target.position || '',
      aliases: [...target.aliases, cleanedPosition.name],
    };

    // check if we should update existing rule or add new one.
    const shouldUpdateRuleSet = positionRules.some(
      (r) =>
        r.type === 'position' &&
        (r.position === ruleToAdd?.overridePosition ||
          r.position === ruleToAdd?.position ||
          r.overridePosition === ruleToAdd?.overridePosition),
    );

    if (shouldUpdateRuleSet) {
      rule_set = positionRules.map((r) => {
        if (
          r.type === 'position' &&
          (r.position === ruleToAdd?.position || r.overridePosition === ruleToAdd?.overridePosition)
        ) {
          return ruleToAdd;
        }
        return r;
      });
    } else {
      rule_set.push(ruleToAdd);
    }

    const updates: Record<string, any> = {
      company: company?.id,
      rule_set: rule_set as unknown as Json,
    };

    if (positionRulesId) {
      updates.id = positionRulesId;
    }

    await supabase.from('crew_rule_set').upsert(updates);

    setPositionRules(rule_set);

    onUpdatePosition?.(ruleToAdd.overridePosition || ruleToAdd.position || '', ruleToAdd.departments);
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
            <DialogTitle>Merge {cleanedPosition.name} with...</DialogTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>
        <div className="p-5 gap-5 flex flex-col">
          <div>
            <Search search={search} setSearch={setSearch} placeholder={'Search positions, departments...'} />
          </div>
          <div className="max-h-[500px] gap-5 flex flex-col overflow-auto">
            <div className="flex flex-col gap-2">
              {Object.entries(groupedAndFiltered).map(([department, positions]) => (
                <div key={department} className="flex flex-col gap-2">
                  <div className="font-label py-2 text-white text-opacity-60 text-base font-bold uppercase">
                    {department}
                  </div>
                  {positions.map((p) => {
                    const displayName = p.overridePosition || p.position || '';
                    return (
                      <div
                        onClick={() => setTarget(p)}
                        className={cn(
                          'cursor-pointer p-3 flex gap-2 font-medium text-white text-base bg-opacity-5 rounded-[18px] ',
                          target?.position !== p.position ? 'bg-white' : 'bg-accent bg-opacity-10',
                        )}
                        key={p.position}
                      >
                        <div className="w-6 h-6 flex items-center justify-center">
                          {target?.position === p.position ? (
                            <Icon className={cn('w-5 h-5')} name="check" />
                          ) : (
                            <div
                              className={cn(
                                'flex items-center justify-center w-4 h-4 rounded-full border ',
                                'border-zinc-600',
                              )}
                            ></div>
                          )}
                        </div>
                        {displayName}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
            onClick={upsertRule}
            disabled={!target || loading}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContentPortless>
    </Dialog>
  );
};
