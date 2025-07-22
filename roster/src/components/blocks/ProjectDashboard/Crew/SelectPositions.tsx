import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { useEffect, useMemo, useState } from 'react';
import { Search } from '../../CrewTable/Search';
import { Button } from '@/components/ui/Button';
import {
  capitalizeString,
  cn,
  filterModernRules,
  filterPositions,
  groupByDepartments,
  groupModernRulesByDepartments,
} from '@/lib/utils';
import { Position } from '@/rules/positions';
import { useCompanyStore } from '@/store/company';
import { searchDepartments } from '@/rules/departments';
import { useProjectStore } from '@/store/project';
import { ModernRule } from '@/types/rules';
import { modernRuleToPosition } from '@/lib/rules/modernRuleToPosition';

export const SelectPositions = ({
  open,
  onClose,
  projectId,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
}) => {
  const [search, setSearch] = useState('');
  const { structure, mergedPositionRules } = useCrewStore();
  const [numTotalPositions, setNumTotalPositions] = useState<number>(0);
  const [selected, setSelected] = useState('all');
  const { setSelectedPositions, selectedPositions } = useProjectStore();

  const supabase = createClient();

  useSetup();

  const selectedDisplayName = useMemo(() => {
    if (selected === 'all') return null;

    return (
      structure[selected][0]?.prettyDepartment ??
      (/^[a-z0-9 ]*$/.test(selected) ? capitalizeString(selected) : selected)
    );
  }, [selected, structure]);

  const groupedAndFiltered = useMemo(() => {
    if (!search) {
      if (selectedDisplayName) {
        return {
          [selectedDisplayName]: groupModernRulesByDepartments(mergedPositionRules)?.[selectedDisplayName] ?? [],
        };
      }

      return groupModernRulesByDepartments(mergedPositionRules);
    }

    if (selectedDisplayName) {
      return {
        [selectedDisplayName]:
          groupModernRulesByDepartments(filterModernRules(mergedPositionRules, search?.trim()))?.[
            selectedDisplayName
          ] ?? [],
      };
    }

    return groupModernRulesByDepartments(filterModernRules(mergedPositionRules, search?.trim()));
  }, [search, selectedDisplayName, mergedPositionRules]);

  useEffect(() => {
    if (!selectedPositions) return;

    let total = 0;

    for (const pos of selectedPositions) {
      if (pos.quantity) total += pos.quantity;
    }

    setNumTotalPositions(total);
  }, [selectedPositions]);

  const create = async () => {
    const positionsToCreate = selectedPositions.flatMap((pos) => {
      return Array(pos.quantity).fill({
        title: pos.position,
        department: pos.department,
        project: projectId,
      });
    });

    const { data, error } = await supabase.from('project_position').insert(positionsToCreate);

    onUpdate();

    setSelectedPositions([]);
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
      }}
    >
      <DialogContent className="max-w-[800px] w-[800px] gap-0">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Add crew positions</DialogTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-6 max-h-[550px] flex flex-col overflow-hidden">
          <div className="pt-4">
            <Search search={search} setSearch={setSearch} placeholder={'Search positions, departments...'} />
          </div>

          <div className="flex gap-6 flex-1 overflow-hidden w-full">
            <DepartmentList structure={structure} selected={selected} setSelected={setSelected} />
            <PositionList groupedAndFiltered={groupedAndFiltered} />
          </div>
        </div>

        <DialogFooter className="flex items-center sm:justify-between">
          <div className="flex items-center gap-2 text-lime-300">
            {numTotalPositions === 1 && `1 selected position`}
            {numTotalPositions > 1 && `${numTotalPositions} selected positions`}

            {selectedPositions.length > 0 && (
              <div
                onClick={() => setSelectedPositions([])}
                className="flex justify-center items-center text-xs text-white/80 w-[45px] h-[18px] bg-white/20 rounded-xl cursor-pointer hover:text-white/100"
              >
                Clear
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={() => {
                setSelectedPositions([]);
                onClose();
              }}
            >
              Cancel
            </Button>

            <Button
              className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              variant="accent"
              size="compact"
              onClick={create}
              disabled={false}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DepartmentList: React.FC<{
  structure: Record<
    string,
    {
      position: string;
      count: number;
      prettyDepartment: string;
    }[]
  >;
  selected: string;
  setSelected: (value: string) => void;
}> = ({ structure, selected, setSelected }) => (
  <div className="w-[240px] flex flex-col gap-1 overflow-scroll py-4">
    <div
      className={cn(
        'duration-100 text-white text-2xl font-normal leading-none p-4 cursor-pointer rounded-2xl bg-white bg-opacity-0 hover:bg-opacity-5',
        selected === 'all' && 'text-lime-300 bg-opacity-5',
      )}
      onClick={() => setSelected('all')}
    >
      All Positions
    </div>

    <div className="text-white px-4 pt-4 pb-1 text-opacity-50 text-sm font-medium font-label uppercase tracking-wide">
      Departments
    </div>

    {Object.keys(structure).map((r) => {
      const item = structure[r];
      return (
        <div
          key={r}
          className={cn(
            'text-white text-2xl font-normal leading-none p-4 cursor-pointer rounded-2xl bg-white bg-opacity-0 hover:bg-opacity-5 duration-100',
            selected === r && 'text-lime-300 bg-opacity-5',
          )}
          onClick={() => setSelected(r)}
        >
          {item[0]?.prettyDepartment ?? (/^[a-z0-9 ]*$/.test(r) ? capitalizeString(r) : r)}
        </div>
      );
    })}
  </div>
);

const PositionList: React.FC<{
  groupedAndFiltered: { [key: string]: ModernRule[] };
}> = ({ groupedAndFiltered }) => {
  const supabase = createClient();
  const { selectedPositions, setSelectedPositions } = useProjectStore();

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-scroll py-4">
      {Object.entries(groupedAndFiltered).map(([department, positions]) => (
        <div key={department} className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-white text-[22px] font-semibold py-4 leading-none">{department}</div>
          </div>

          {positions.map((p, i) => {
            const selected = selectedPositions.find((pos) => pos.position === p.position);

            return (
              <div
                onClick={() => {
                  if (!!selected || !p.position) {
                    return;
                  }

                  setSelectedPositions([...selectedPositions, { position: p.position, quantity: 1, department }]);
                }}
                key={`${p.position}-${i}`}
                className={cn(
                  'select-none px-2 min-h-[56px] py-3 text-opacity-60 text-white text-lg leading-none flex gap-2 items-center cursor-pointer justify-between',
                  !!selected && ' text-opacity-100 cursor-default',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={!selected ? 'plus-circle' : 'checkmark'}
                    className={cn('w-5 h-5 text-white text-opacity-60', selected && 'text-lime-300 text-opacity-100')}
                  />
                  {p.position}
                </div>

                {!!selected && (
                  <Quantity
                    quantity={selected.quantity}
                    onChange={(quantity: number) => {
                      if (quantity <= 0) {
                        setSelectedPositions(selectedPositions.filter((pos) => pos.position !== p.position));
                      } else {
                        setSelectedPositions(
                          selectedPositions.map((pos) => (pos.position === p.position ? { ...pos, quantity } : pos)),
                        );
                      }
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Quantity: React.FC<{
  quantity: number;
  onChange: (quantity: number) => void;
}> = ({ quantity, onChange }) => {
  return (
    <div className="flex gap-2 items-center">
      <div
        className="w-8 h-8 p-2 bg-zinc-900 rounded-lg justify-center items-center gap-2 flex cursor-pointer hover:bg-zinc-700"
        onClick={() => {
          onChange(quantity - 1);
        }}
      >
        <Icon name="minus" className="w-4 h-4 text-white" />
      </div>

      <div className="text-white w-8 h-8 text-xl font-semibold leading-tight justify-center items-center gap-2 flex">
        {quantity}
      </div>

      <div
        className="w-8 h-8 p-2 bg-zinc-900 rounded-lg justify-center items-center gap-2 flex cursor-pointer hover:bg-zinc-700"
        onClick={() => {
          onChange(quantity + 1);
        }}
      >
        <Icon name="plus-alt" className="w-4 h-4 text-white" />
      </div>
    </div>
  );
};

export const useSetup = () => {
  const supabase = createClient();
  const [fetchedRules, setFetchedRules] = useState(false);
  const { search: searchPositions } = useSearchPositions();

  const { setStructure, setPositionRules, setPositionRulesId } = useCrewStore();
  const { activeCompany } = useCompanyStore();

  const fetchPositionRules = async () => {
    if (!activeCompany) return;
    return await supabase
      .from('crew_rule_set')
      .select()
      .eq('company', activeCompany)
      .single()
      .then(({ data }) => {
        if (!data) {
          supabase
            .from('crew_rule_set')
            .insert({ company: activeCompany, rule_set: [] })
            .select()
            .then(({ data: d }) => {
              if (!d?.[0]) return;
              setPositionRules((d?.[0].rule_set as unknown as Position[]) ?? []);
              setPositionRulesId(d?.[0].id);
            });
          setFetchedRules(true);
          return;
        }

        setPositionRules((data.rule_set as unknown as Position[]) ?? []);
        setPositionRulesId(data.id);
        setFetchedRules(true);
      });
  };

  const fetchStructure = async () => {
    if (!activeCompany) return;
    return await supabase.rpc('get_crew_positions', { company_id: activeCompany }).then(({ data }) => {
      const result: Record<
        string,
        { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]
      > = {};
      /* @ts-ignore */
      data?.forEach((d) => {
        const modernRule = searchPositions(d.name);
        const rule = modernRuleToPosition(modernRule);

        if (!rule) {
          if (!d.department?.[0]) return;

          const prettyDepartment = searchDepartments(d.department[0])?.department ?? capitalizeString(d.department[0]);
          const originalDepartment = d.department[0];
          const key = prettyDepartment.toLocaleLowerCase();

          result[key] = [
            ...(result[key] ?? []),
            {
              position: capitalizeString(d.name),
              count: d.crew_count,
              prettyDepartment,
              originalDepartment,
            },
          ];
          return;
        }

        const key = rule.departments?.[0]?.toLocaleLowerCase();
        const originalDepartment = d.department?.[0] ?? rule.departments?.[0] ?? '';
        const existingItem = result?.[key]?.find((d) => d.position === rule.position);

        if (existingItem) {
          existingItem.count += d.crew_count;
          return;
        }

        result[key] = [
          ...(result?.[key] ?? []),
          {
            position: rule.position,
            count: d.crew_count,
            prettyDepartment: rule.departments?.[0],
            originalDepartment,
          },
        ];
      });

      const sortedResult = Object.keys(result)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = result[key];
            return acc;
          },
          {} as Record<
            string,
            { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]
          >,
        );

      setStructure(sortedResult);
    });
  };

  useEffect(() => {
    if (!fetchedRules) return;
    fetchStructure();
  }, [fetchedRules]);

  useEffect(() => {
    if (!activeCompany) return;

    fetchPositionRules();
  }, [activeCompany]);
};
