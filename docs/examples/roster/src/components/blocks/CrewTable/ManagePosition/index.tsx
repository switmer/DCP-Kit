import { useCrewStore, useSearchPositions } from '@/store/crew';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContentPortless, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { createClient } from '@/lib/supabase/client';
import { capitalizeString, cn } from '@/lib/utils';
import { PositionType, RateType } from '@/types/type';
import { Formik, FormikValues } from 'formik';
import React, { use, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { UpdateRule } from './UpdateRule';
import { UpdateUnknownRule } from './UpdateUnknownRule';
import { MergeRule } from './MergeRule';
import { CreateRule } from './CreateRule';

export const ManagePosition: React.FC<{
  position?: null | [PositionType, (name: string, department: string[]) => void];
  id: number;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ position: p, id, onClose, onUpdate }) => {
  const [position, onUpdatePosition] = p ?? [];
  const supabase = createClient();
  const [rate, setRate] = useState<RateType | null | undefined>(null);
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [open, setOpen] = useState(!!position);
  const [openRuleEditor, setOpenRuleEditor] = useState(false);
  const [openMerge, setOpenMerge] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [rateType, setRateType] = useState<'day' | 'hour' | 'week'>('day');

  const { search: searchPositions } = useSearchPositions();
  const { positionRules } = useCrewStore();

  const [positionName, found, existingRule] = useMemo(() => {
    if (!position) return [null, false, null];

    const rule = searchPositions(position?.name as string);

    // Find the actual rule from positionRules that matches this position
    const actualRule = positionRules.find(
      (r) =>
        r.type === 'position' &&
        (r.position === position?.name ||
          r.overridePosition === position?.name ||
          r.aliases.includes(position?.name || '')),
    );

    return [rule?.position ?? capitalizeString(position?.name as string), !!rule, actualRule];
  }, [position, searchPositions, positionRules]);

  useEffect(() => {
    setOpen(!!position?.name);
  }, [position]);

  useEffect(() => {
    if (!position?.name) {
      setRate(null);
      return;
    }
    setRateLoading(true);

    supabase
      .from('role_rate')
      .select()
      .eq('role', position?.name?.toLocaleLowerCase())
      .eq('crew_member', id)
      .then((d) => {
        setRate(d.data?.[0]);
        setRateLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const removePosition = async () => {
    if (!position) return;

    await supabase.from('position').delete().eq('id', position?.id);
    onClose();
    onUpdate();
  };

  useEffect(() => {
    if (!rate || !rate?.type) return;
    setRateType(rate?.type);
  }, [rate]);

  return (
    <>
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
              <DialogTitle>Editing a position</DialogTitle>
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
              rate: rate?.rate ?? '',
            }}
            onSubmit={async (values: FormikValues) => {
              if (!id || !position) {
                return;
              }

              setLoading(true);

              const { error } = await supabase
                .from('role_rate')
                .upsert({
                  id: rate?.id,
                  currency: 'USD',
                  rate: !!values?.rate ? values.rate : null,
                  role: position?.name?.toLocaleLowerCase(),
                  crew_member: id,
                  type: rateType,
                })
                .select();

              setLoading(false);

              if (error) {
                toast.error('Something went wrong');
                return;
              }
              onUpdate();
              onClose();
            }}
            enableReinitialize
          >
            {({ isValidating, isValid, dirty, touched, errors, values, submitForm }) => {
              return (
                <>
                  <div className="flex flex-col gap-3 p-6">
                    <div className="flex flex-col gap-2">
                      <div className="text-neutral-300 text-sm font-medium leading-tight">Position</div>

                      <div className="flex flex-col gap-[10px] p-3 bg-white bg-opacity-5 rounded-xl">
                        <div className="text-white text-lg font-medium">{positionName}</div>

                        <button
                          onClick={() => {
                            setOpen(false);
                            setOpenRuleEditor(true);
                          }}
                          className="cursor-pointer py-1.5 gap-2 flex justify-start items-center text-zinc-300 text-sm font-medium"
                        >
                          Manage position
                          <Icon name="chevron-small" className="w-4 h-4" />
                        </button>
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
                          disabled={rateLoading}
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
                  {!found && (
                    <div className="px-6 py-3 bg-yellow-400 bg-opacity-10 items-center gap-2 flex">
                      <Icon name="alert" className="text-yellow-400 w-4 h-4" />
                      <div className=" text-yellow-400 text-sm font-medium leading-tight">
                        This is an unknown position
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <div className="flex-1">
                      <Button
                        className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed bg-opacity-10 hover:bg-opacity-15 duration-100"
                        variant="outline"
                        size="compact"
                        onClick={removePosition}
                      >
                        Remove
                      </Button>
                    </div>
                    <Button className="px-4 text-sm font-semibold" variant="outline" size="compact" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                      variant="accent"
                      size="compact"
                      disabled={!isValid || isValidating || !dirty || loading}
                      onClick={submitForm}
                    >
                      {!loading ? 'Save' : <LoadingIndicator dark size="small" />}
                    </Button>
                  </DialogFooter>
                </>
              );
            }}
          </Formik>
        </DialogContentPortless>
      </Dialog>
      {position && (
        <>
          {openRuleEditor && (
            <>
              {existingRule ? (
                <UpdateRule
                  position={position}
                  existingRule={existingRule}
                  onUpdate={onUpdate}
                  onUpdatePosition={onUpdatePosition}
                  onClose={() => {
                    setOpenRuleEditor(false);
                    onClose();
                  }}
                  setOpen={setOpenRuleEditor}
                  open={openRuleEditor}
                />
              ) : (
                <UpdateUnknownRule
                  position={position}
                  onClose={() => {
                    setOpenRuleEditor(false);
                    onClose();
                  }}
                  onMerge={() => {
                    setOpenRuleEditor(false);
                    setOpenMerge(true);
                  }}
                  onCreate={() => {
                    setOpenRuleEditor(false);
                    setOpenCreate(true);
                  }}
                  open={openRuleEditor}
                  setOpen={setOpenRuleEditor}
                />
              )}
            </>
          )}

          {openMerge && (
            <MergeRule
              position={position}
              onUpdate={onUpdate}
              onUpdatePosition={onUpdatePosition}
              onClose={() => {
                setOpenMerge(false);
                onClose();
              }}
              open={openMerge}
              setOpen={setOpenMerge}
            />
          )}

          {openCreate && (
            <CreateRule
              open={openCreate}
              position={position}
              onClose={() => {
                setOpenCreate(false);
                onClose();
              }}
              onUpdate={onUpdate}
              onUpdatePosition={onUpdatePosition}
              setOpen={setOpenCreate}
            />
          )}
        </>
      )}
    </>
  );
};
