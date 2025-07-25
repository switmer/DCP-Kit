import { Dialog, DialogContentPortless, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Position } from '@/rules/positions';
import React, { useMemo, useState } from 'react';
import { Search } from '../Search';
import { useCrewStore, useSearchPositions } from '@/store/crew';
import { cn, filterModernRules, filterPositions, groupByDepartments, groupModernRulesByDepartments } from '@/lib/utils';
import { Formik, FormikValues } from 'formik';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Tooltip } from '@/components/ui/Tooltip';
import { ModernRule } from '@/types/rules';

export const AddPosition: React.FC<{
  open: boolean;
  setOpen: (v: boolean) => void;
  id: number;
  onUpdate: () => void;
}> = ({ open, setOpen, id, onUpdate }) => {
  const [selected, setSelected] = useState<ModernRule | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [rateType, setRateType] = useState<'day' | 'hour' | 'week'>('day');
  const supabase = createClient();

  const { company } = useCrewStore();

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <DialogContentPortless
        className="gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="max-w-[inherit]">
          <DialogTitle className="flex justify-between items-center">
            Add Position
            <button
              onClick={() => setOpen(false)}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <SelectPosition setSelected={setSelected} onClose={() => setOpen(false)} />
        ) : (
          <Formik
            initialValues={{
              rate: '',
            }}
            onSubmit={async (values: FormikValues) => {
              setLoading(true);
              if (!company?.id || !id) return;

              const { error } = await supabase.from('role_rate').upsert({
                currency: 'USD',
                rate: !!values?.rate ? values.rate : null,
                role: selected.position?.toLocaleLowerCase(),
                crew_member: id,
                type: rateType,
              });

              const { error: errorPosition } = await supabase.from('position').upsert({
                name: selected.position?.toLocaleLowerCase(),
                department: selected.departments.map((d) => d.toLocaleLowerCase()),
                crew: id,
                known: true,
                company: company?.id,
              });

              setLoading(false);

              if (error || errorPosition) {
                toast.error('Something went wrong');
                return;
              }
              onUpdate();
              setOpen(false);
            }}
            enableReinitialize
          >
            {({
              isValidating,
              isValid,

              touched,
              errors,
              values,
              submitForm,
            }) => {
              return (
                <>
                  <div className="flex flex-col gap-3 p-6">
                    <div className="flex flex-col gap-2">
                      <div className="text-neutral-300 text-sm font-medium leading-tight">Position</div>
                      <div className="flex flex-col gap-[10px] p-3 bg-white bg-opacity-5 rounded-xl">
                        <div className="text-white text-lg font-medium">{selected.position}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-neutral-300 text-sm font-medium leading-tight">Rate</div>
                      <div className="relative">
                        <Input
                          className={cn(
                            'pl-[42px] h-14 pr-[14px] bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-[26px] focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                            !!values?.rate && !errors?.rate && !!touched?.rate && '!border-lime-300',
                            !!errors?.rate && !!touched?.rate && '!border-pink-600',
                          )}
                          name="rate"
                          placeholder="--"
                          autoFocus
                          type="tel"
                          validate={(value: string) => {
                            if (!!value && !/^\d+$/.test(value)) {
                              return 'Rate should be a number';
                            }
                          }}
                        />
                        <div className="text-neutral-300 text-[26px] absolute top-1/2 -translate-y-1/2 left-[14px]">
                          $
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="absolute px-[14px] h-11 right-0 top-1/2 -translate-y-1/2 flex justify-center items-center text-neutral-300 text-base capitalize gap-[2px]">
                            {rateType}
                            <Icon name="chevron-small" className="w-5 h-5 text-zinc-500 rotate-90" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            side="bottom"
                            align="end"
                            className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[212px]"
                          >
                            <DropdownMenuItem
                              onClick={() => setRateType('hour')}
                              className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
                            >
                              Hour
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRateType('day')}
                              className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
                            >
                              Day
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRateType('week')}
                              className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
                            >
                              Week
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      className="px-4 text-sm font-semibold"
                      variant="outline"
                      size="compact"
                      onClick={() => setOpen(false)}
                    >
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
        )}
      </DialogContentPortless>
    </Dialog>
  );
};

export const SelectPosition: React.FC<{
  setSelected: (p: ModernRule) => void;
  onClose: () => void;
}> = ({ setSelected, onClose }) => {
  const [search, setSearch] = useState<string>('');
  const [target, setTarget] = useState<ModernRule | null>(null);
  const { mergedPositionRules } = useCrewStore();

  const groupedAndFiltered = useMemo(() => {
    if (!search) {
      return groupModernRulesByDepartments(mergedPositionRules);
    }

    return groupModernRulesByDepartments(filterModernRules(mergedPositionRules, search?.trim()));
  }, [search, mergedPositionRules]);

  return (
    <>
      <div className="p-5 pb-0 gap-5 flex flex-col max-w-[inherit]">
        <div>
          <Search search={search} setSearch={setSearch} placeholder={'Search positions, departments...'} />
        </div>
        <div className="max-h-[500px] gap-5 pb-5 flex-col overflow-auto">
          <div className="flex flex-col gap-2">
            {Object.entries(groupedAndFiltered).map(([department, positions]) => (
              <div key={department} className="flex flex-col gap-2">
                <div className="font-label py-2 text-white text-opacity-60 text-base font-bold uppercase">
                  {department}
                </div>
                {positions.map((p) => {
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

                      <div className="flex flex-col gap-0 flex-1">
                        {p.position}
                        <Tooltip content={p.aliases.join(', ')}>
                          <span className="text-xs flex font-medium text-opacity-50 w-full max-w-[320px]">
                            <span className="truncate">{p.aliases.join(', ')}</span>
                          </span>
                        </Tooltip>
                      </div>
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
          disabled={!target}
          onClick={() => {
            if (!target) return;
            setSelected(target);
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
};
