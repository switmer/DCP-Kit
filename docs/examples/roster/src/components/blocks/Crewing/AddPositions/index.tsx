'use client';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Search } from '../../CrewTable/Search';
import { useCrewStore } from '@/store/crew';
import {
  capitalizeString,
  cn,
  filterModernRules,
  filterPositions,
  groupByDepartments,
  groupModernRulesByDepartments,
} from '@/lib/utils';
import { Position } from '@/rules/positions';
import { useSetup } from './useSetup';
import { createClient } from '@/lib/supabase/client';
import { useCrewingStore } from '@/store/crewing';
import { toast } from 'sonner';
import { CrewingPositionType } from '@/types/type';
import { ModernRule } from '@/types/rules';

type ToggleStates = {
  [key: string]: boolean;
};

export const AddPositions: React.FC<{
  open?: boolean;
  onClose: () => void;
  setStage: Dispatch<SetStateAction<'crew' | 'positions' | 'options'>>;
}> = ({ open, onClose, setStage }) => {
  const [search, setSearch] = React.useState('');
  const [numTotalPositions, setNumTotalPositions] = useState<number>(0);
  const [selectAllToggle, setSelectAllToggle] = React.useState<ToggleStates>({});
  const [loading, setLoading] = React.useState(false);
  const { structure, mergedPositionRules } = useCrewStore();
  const [selected, setSelected] = useState('all');

  const { requiredPositions, setRequiredPositions, project, fetchPositions } = useCrewingStore();

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

  const create = async () => {
    const payload = requiredPositions.filter((pos) => !pos.id);

    if (!payload.length) {
      setStage('crew');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.from('crewing_position').insert(payload).select();

    if (!data || !!error) {
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    if (!project) return;

    fetchPositions().then(() => {
      setLoading(false);
      setStage('crew');
    });
  };

  const handleClickSelectAllToggle = (dept: string, isOn: boolean) => {
    const positionsInDept = groupedAndFiltered[dept] || [];

    const updatedPositions = positionsInDept
      .map((position) => {
        const existing = requiredPositions.find((pos) => pos.position === position.position);

        if (isOn) {
          return {
            position: position.overridePosition ?? position.position,
            project: project,
            quantity: 1,
          } as CrewingPositionType;
        }

        return {
          ...existing,
          quantity: 0,
        } as CrewingPositionType;
      })
      .filter((pos) => pos.quantity ?? 0 > 0);

    setSelectAllToggle((prev) => {
      if (selectAllToggle[dept]) {
        selectAllToggle[dept] = isOn;

        return { ...prev };
      }

      return {
        ...prev,
        [dept]: isOn,
      };
    });

    setRequiredPositions([
      ...requiredPositions.filter((pos) => !positionsInDept.some((p) => p.position === pos.position)),
      ...updatedPositions,
    ]);
  };

  useEffect(() => {
    if (!requiredPositions) return;

    let total = 0;

    for (const pos of requiredPositions) {
      if (pos.quantity) total += pos.quantity;
    }

    setNumTotalPositions(total);
  }, [requiredPositions]);

  const handleClickClearPositions = () => {
    const deletePromises = requiredPositions.map((pos) => {
      const q = supabase.from('crewing_position');

      //-- check for related records in crewing_position_crew.
      return supabase
        .from('crewing_position_crew')
        .select('id')
        .eq('crewing_position', pos.id)
        .then(async ({ data: relatedRecords, error }) => {
          if (error) {
            console.error('Error checking related records:', error);
            return { result: { error }, pos };
          } else if (relatedRecords.length > 0) {
            //-- delete related records if any exist.
            try {
              await Promise.all(
                relatedRecords.map((record) => supabase.from('crewing_position_crew').delete().eq('id', record.id)),
              );

              //-- delete the record from crewing_position.
              const { error: deleteError } = await q.delete().eq('id', pos.id);

              if (deleteError) {
                console.error('Error deleting crewing_position record:', deleteError);
                return { result: { error: deleteError }, pos };
              }
            } catch (error) {
              console.error('Error deleting related records:', error);

              return { result: { error }, pos };
            }
          } else {
            //-- if no related records, delete the crewing_position record.
            const { error: deleteError } = await q.delete().eq('id', pos.id);

            if (deleteError) {
              console.error('Error deleting crewing_position record:', deleteError);

              return { result: { error: deleteError }, pos };
            }
          }

          return { result: { error: null }, pos };
        });
    });

    Promise.all(deletePromises)
      .then((promises) => {
        const failures = promises.filter((promise) => promise.result.error);

        if (failures.length > 0) {
          for (const fail of failures) {
            console.error(`Failed to delete ${fail.pos.position} (${fail.pos.id}). Error: ${fail.result.error}`);
          }
          toast.error('Some positions could not be deleted.');
        } else {
          toast.success('All positions successfully deleted.');
          setRequiredPositions([]);
        }
      })
      .catch((error) => {
        console.error('An unexpected error occurred:', error);
        toast.error('Something went wrong.');
      });
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
            <DialogTitle>Adding positions needed</DialogTitle>
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

            <PositionList
              groupedAndFiltered={groupedAndFiltered}
              handleClickSelectAllToggle={handleClickSelectAllToggle}
              selectAllToggle={selectAllToggle}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center sm:justify-between">
          <div className="flex items-center gap-2 text-lime-300">
            {numTotalPositions === 1 && `1 selected position`}
            {numTotalPositions > 1 && `${numTotalPositions} selected positions`}

            {requiredPositions.length > 0 && (
              <div
                onClick={() => handleClickClearPositions()}
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
                setRequiredPositions(requiredPositions.filter((pos) => pos.id));
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
              disabled={loading || !requiredPositions.length}
            >
              Next
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
  handleClickSelectAllToggle: (dept: string, isOn: boolean) => void;
  selectAllToggle: { [key: string]: boolean };
}> = ({ groupedAndFiltered, handleClickSelectAllToggle, selectAllToggle }) => {
  const { requiredPositions, setRequiredPositions, project } = useCrewingStore();

  const supabase = createClient();

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-scroll py-4">
      {Object.entries(groupedAndFiltered).map(([department, positions]) => (
        <div key={department} className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-white text-[22px] font-semibold py-4 leading-none">{department}</div>

            <div className="flex items-center">
              <div className="pr-2 text-xs text-stone-400">All</div>

              <div
                onClick={() => handleClickSelectAllToggle(department, true)}
                className={cn(
                  'flex justify-center items-center w-[35px] h-[20px] bg-[#2a2a2a] text-[11px] font-bold text-center rounded-tl-xl rounded-bl-xl cursor-pointer',
                  selectAllToggle[department] && 'bg-lime-300/80 text-lime-700',
                )}
              >
                ON
              </div>

              <div
                onClick={() => handleClickSelectAllToggle(department, false)}
                className={cn(
                  'flex justify-center items-center w-[35px] h-[20px] bg-[#2a2a2a] text-[11px] font-bold text-center rounded-tr-xl rounded-br-xl cursor-pointer',
                  !selectAllToggle[department] && 'bg-lime-300/40 text-white/90',
                )}
              >
                OFF
              </div>
            </div>
          </div>

          {positions.map((p, i) => {
            const selected = requiredPositions.find((pos) => pos.position === p.position);

            return (
              <div
                onClick={() => {
                  if (!!selected || !project) {
                    return;
                  }

                  setRequiredPositions([
                    ...requiredPositions,
                    {
                      position: p.overridePosition ?? p.position,
                      project,
                      quantity: 1,
                    } as CrewingPositionType,
                  ]);
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
                    quantity={selected.quantity ?? 0}
                    onChange={(quantity: number) => {
                      setRequiredPositions(
                        requiredPositions
                          .map((pos) => {
                            if (pos.position === p.position) {
                              if (!!pos.id) {
                                const q = supabase.from('crewing_position');

                                //-- TODO: check if there's crewing_position_crew relations to crewing_position and delete them

                                if (quantity === 0) {
                                  //-- check for related records in crewing_position_crew.
                                  supabase
                                    .from('crewing_position_crew')
                                    .select('id')
                                    .eq('crewing_position', pos.id)
                                    .then(async ({ data: relatedRecords, error }) => {
                                      if (error) {
                                        console.error('Error checking related records. Error: ', error);
                                      } else if (relatedRecords.length > 0) {
                                        //-- delete related records first if any are found.
                                        try {
                                          await Promise.all(
                                            relatedRecords.map((record) =>
                                              supabase.from('crewing_position_crew').delete().eq('id', record.id),
                                            ),
                                          );

                                          //-- delete the record from crewing_position.
                                          const { error: deleteError } = await q.delete().eq('id', pos.id);

                                          if (deleteError) {
                                            console.error('Error deleting crewing_position record:', deleteError);
                                          }
                                        } catch (error) {
                                          console.error('Error deleting related records:', error);
                                        }
                                      } else {
                                        //-- if no related records exist, directly delete the crewing_position record.
                                        q.delete()
                                          .eq('id', pos.id)
                                          .then(({ error }) => {
                                            if (error) {
                                              console.error('Error deleting crewing_position record:', error);
                                            }
                                          });
                                      }
                                    });
                                } else {
                                  q.update({ quantity })
                                    .eq('id', pos.id)
                                    .then(({ error }) => {
                                      if (error) {
                                        console.error('Error updating crewing position record. Error: ', error);
                                      }
                                    });
                                }
                              }

                              return {
                                ...pos,
                                quantity,
                              };
                            }
                            return pos;
                          })
                          .filter((pos) => (pos?.quantity ?? 0) > 0),
                      );
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
