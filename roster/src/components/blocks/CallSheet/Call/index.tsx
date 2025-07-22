import { useCallSheetStore } from '@/store/callsheet';
import { Button } from '@/components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Icon } from '@/components/ui/Icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { PopoverClose } from '@radix-ui/react-popover';
import { useState, useRef, useEffect, useMemo } from 'react';
import { addHours, addMinutes, parse, format } from 'date-fns';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';

export const Call: React.FC<{ id: string; call?: string }> = ({ id, call }) => {
  const [hours, setHours] = useState<number | undefined>(undefined);
  const [minutes, setMinutes] = useState<number | undefined>(undefined);
  const [notifyCrew, setNotifyCrew] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { addCallPush, fetchCallPushes, callPush, callPushesLoading } = useCallSheetStore();

  const submit = async () => {
    await addCallPush(id, hours ?? 0, minutes ?? 0, notifyCrew);

    closeButtonRef.current?.click();
  };

  useEffect(() => {
    fetchCallPushes(id);
  }, [id]);

  const resetStates = () => {
    setHours(undefined);
    setMinutes(undefined);
    setNotifyCrew(false);
  };

  const [oldCall, newCall] = useMemo(() => {
    if (!call || !callPush) return [call, call];

    const originalTime = parse(call, 'h:mm a', new Date());

    let newTime = addHours(originalTime, callPush.hours ?? 0);
    newTime = addMinutes(newTime, callPush.minutes ?? 0);

    return [call, format(newTime, 'h:mm a')];
  }, [call, callPush]);

  if (!call)
    return (
      <Popover onOpenChange={(open) => !open && resetStates()}>
        <PopoverTrigger asChild>
          <div
            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-stone-500/20"
            onClick={() => {}}
          >
            <p className="text-white text-[40px] font-thin font-label leading-none">-:--</p>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[450px]" align="start">
          <TimeEdit id={id} call={call} />
        </PopoverContent>
      </Popover>
    );

  if (callPushesLoading)
    return (
      <p className="text-white text-[40px] font-thin font-label leading-none">
        <Skeleton className="h-[40px] w-[215px]" />
      </p>
    );

  return (
    <>
      {callPush ? (
        <div className="flex flex-col gap-1">
          <div className="text-white text-[22px] font-bold leading-none">{newCall}</div>
          <div className="flex items-center gap-2">
            <div className="text-[rgba(255,255,255,0.6)] text-sm line-through font-medium leading-none">{oldCall}</div>
            <div className="h-5 px-1 flex justify-center items-center bg-[rgba(249,44,44,0.14)] leading-none text-[#FF3F3F] text-sm font-medium rounded-[5px]">
              {[callPush.hours && `+${callPush.hours}HR`, callPush.minutes && `${callPush.minutes}M`]
                .filter(Boolean)
                .join(' ')}
            </div>
          </div>
        </div>
      ) : (
        <Popover onOpenChange={(open) => !open && resetStates()}>
          <PopoverTrigger asChild>
            <div
              className="inline-flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-stone-500/20"
              onClick={() => {}}
            >
              <p className="text-white text-[40px] font-thin font-label leading-none">{call}</p>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[450px]" align="start">
            <TimeEdit id={id} call={call} />
          </PopoverContent>
        </Popover>
      )}

      <Popover onOpenChange={(open) => !open && resetStates()}>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            size={'compact'}
            className="text-[#cecfd2] text-xs font-bold px-3 h-10 bg-white bg-opacity-0 hover:bg-opacity-5 duration-100 cursor-pointer"
          >
            Push
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <div className="text-white text-[22px] font-bold mb-4">Call pushed by</div>
          <div className="flex gap-3 w-full">
            <div className="relative flex-1 max-w-[120px]">
              <input
                className="w-full h-[62px] text-white text-[32px] rounded-[16px] bg-stone-950 border-2 border-zinc-700 focus:border-accent px-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                type="number"
                autoFocus
                min="0"
                max="23"
                placeholder="0"
                value={hours}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    setHours(undefined);
                  } else {
                    const value = Math.max(0, Math.min(23, parseInt(inputValue.slice(0, 2)) || 0));
                    setHours(value);
                  }
                }}
              />
              <div className="absolute text-white/70 text-xl leading-tight top-1/2 right-4 -translate-y-1/2">HR</div>
            </div>
            <div className="relative flex-1">
              <input
                className="w-full h-[62px] text-white text-[32px] rounded-[16px] bg-stone-950 border-2 border-zinc-700 focus:border-accent px-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={minutes}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    setMinutes(undefined);
                  } else {
                    const value = Math.max(0, Math.min(59, parseInt(e.target.value.slice(0, 2)) || 0));
                    setMinutes(value);
                  }
                }}
              />
              <div className="absolute text-white/70 text-xl leading-tight top-1/2 right-4 -translate-y-1/2">MINS</div>
            </div>
          </div>
          <label className="flex user-select-none items-center gap-2 pt-5 text-white text-base font-medium cursor-pointer">
            <Switch checked={notifyCrew} onCheckedChange={setNotifyCrew} />
            Notify crew & request confirmation
          </label>
          {notifyCrew && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="[&>svg]:data-[state=open]:rotate-90 mt-5" asChild>
                <button className="flex items-center gap-0 text-white text-opacity-80 text-sm font-medium">
                  Text message preview
                  <Icon name="chevron-small" className="w-4 h-4 relative fill-none" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="w-full justify-start items-end inline-flex mt-2">
                  <div className="px-3 py-[6px] bg-neutral-800 rounded-[18px] justify-start flex-col">
                    <span className="text-white text-base font-normal leading-snug">
                      Hey{' '}
                      <span className="h-5 px-1 inline-flex items-center justify-center rounded-[5px] bg-white bg-opacity-10 text-white text-sm w-fit">
                        First Name
                      </span>
                      , ALL CALLS PUSHED BY {(hours ?? 0) > 0 && `${hours ?? 0} hour${(hours ?? 0) > 1 ? 's' : ''}`}
                      {(hours ?? 0) > 0 && (minutes ?? 0) > 0 && ' and '}
                      {(minutes ?? 0) > 0 && `${minutes ?? 0} minute${(minutes ?? 0) > 1 ? 's' : ''}`}
                      <br />
                      --
                      <br />
                      Click here to confirm update: <br />
                      <span className="text-blue-500 text-base font-normal leading-snug">
                        {location.hostname}/zx84q0w
                      </span>
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          <div className="flex items-center justify-between gap-2 pt-7">
            <PopoverClose asChild>
              <Button className="px-4 h-10" variant={'outline'} size={'small'}>
                Cancel
              </Button>
            </PopoverClose>
            <PopoverClose ref={closeButtonRef} className="hidden" />
            <AlertDialog
              withPortal
              onConfirm={submit}
              title={`Push all calls by ${[
                (hours ?? 0) > 0 && `${hours ?? 0} hour${(hours ?? 0) > 1 ? 's' : ''}`,
                (minutes ?? 0) > 0 && `${minutes ?? 0} minute${(minutes ?? 0) > 1 ? 's' : ''}`,
              ]
                .filter(Boolean)
                .join(' and ')}?`}
              description={`${
                notifyCrew ? 'A text message will be sent to the crew.' : 'The crew will not be notified.'
              }`}
              actionLabel={'Push'}
            >
              <Button
                className="px-4 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                variant={'accent'}
                size={'small'}
                disabled={!hours && !minutes}
              >
                Submit change
              </Button>
            </AlertDialog>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export const TimeEdit: React.FC<{ id: string; call?: string }> = ({ id, call }) => {
  const [hours, setHours] = useState<number | undefined>(undefined);
  const [minutes, setMinutes] = useState<number | undefined>(undefined);
  const [isPM, setIsPM] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const supabase = createClient();

  const submit = async () => {
    if (!hours) return;

    let formattedHours = hours;
    if (isPM && hours < 12) {
      formattedHours += 12;
    } else if (!isPM && hours === 12) {
      formattedHours = 0;
    }

    const formattedTime = format(new Date().setHours(formattedHours, minutes ?? 0), 'h:mm a');

    let { data: sheetRawJson, error: fetchSheetRawJsonError } = await supabase
      .from('call_sheet')
      .select('raw_json')
      .eq('id', id)
      .single();

    if (fetchSheetRawJsonError) {
      toast.error('Something went wrong. Please try again.');
      return;
    }

    if (!sheetRawJson?.raw_json) {
      sheetRawJson = { raw_json: {} };
    }

    //@ts-ignore
    sheetRawJson.raw_json.general_crew_call = formattedTime;

    await supabase.from('call_sheet').update({ raw_json: sheetRawJson.raw_json }).eq('id', id);

    // update call sheet's updated_at timestamp.
    await updateCallSheetTimestamp(supabase, id);

    closeButtonRef.current?.click();
    window.location.reload();
  };

  useEffect(() => {
    if (!call) return;

    const cleanCall = call.replace(/\s/g, '').toUpperCase();
    const match = cleanCall.match(/(\d{1,2}):(\d{2})(AM|PM)/);

    if (match) {
      const [_, rawHours, rawMinutes, period] = match;
      let parsedHours = parseInt(rawHours);

      if (parsedHours === 12) {
        parsedHours = period === 'AM' ? 0 : 12;
      } else if (period === 'PM') {
        parsedHours += 12;
      }

      setHours(parsedHours % 12 || 12);
      setMinutes(parseInt(rawMinutes));
      setIsPM(parsedHours >= 12);
    }
  }, [call]);

  return (
    <>
      <p className="font-label font-medium uppercase text-base text-white mb-4 leading-none max-sm:mb-3">
        Update General Call
      </p>
      <div className="flex gap-3 w-full">
        <div className="relative flex-1 max-w-[120px]">
          <input
            className="w-full h-[62px] text-white text-[32px] rounded-[16px] bg-stone-950 border-2 border-zinc-700 focus:border-accent px-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            type="number"
            autoFocus
            min="0"
            max="12"
            placeholder="0"
            value={hours}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === '') {
                setHours(undefined);
              } else {
                const value = Math.max(0, Math.min(23, parseInt(inputValue.slice(0, 2)) || 0));
                setHours(value);
              }
            }}
          />
          <div className="absolute text-white/70 text-xl leading-tight top-1/2 right-4 -translate-y-1/2">HR</div>
        </div>
        <div className="relative flex-1">
          <input
            className="w-full h-[62px] text-white text-[32px] rounded-[16px] bg-stone-950 border-2 border-zinc-700 focus:border-accent px-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            type="number"
            min="0"
            max="59"
            placeholder="0"
            value={minutes}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === '') {
                setMinutes(undefined);
              } else {
                const value = Math.max(0, Math.min(59, parseInt(e.target.value.slice(0, 2)) || 0));
                setMinutes(value);
              }
            }}
          />
          <div className="absolute text-white/70 text-xl leading-tight top-1/2 right-4 -translate-y-1/2">MINS</div>
        </div>

        <div className="relative flex-1 flex items-center">
          <div className="flex items-center">
            <div
              onClick={() => setIsPM(false)}
              className={cn(
                'flex justify-center items-center w-[45px] h-[28px] bg-[#2a2a2a] text-[12px] text-white/60 font-bold text-center rounded-tl-lg rounded-bl-lg cursor-pointer',
                !isPM && 'bg-lime-300/80 text-black',
              )}
            >
              AM
            </div>
            <div
              onClick={() => setIsPM(true)}
              className={cn(
                'flex justify-center items-center w-[45px] h-[28px] bg-[#2a2a2a] text-[12px] text-white/60 font-bold text-center rounded-tr-lg rounded-br-lg cursor-pointer',
                isPM && 'bg-lime-300/80 text-black',
              )}
            >
              PM
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-7">
        <PopoverClose asChild>
          <Button className="px-4 h-10" variant={'outline'} size={'small'}>
            Cancel
          </Button>
        </PopoverClose>

        <PopoverClose ref={closeButtonRef} className="hidden" />

        <Button
          className="px-4 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
          variant={'accent'}
          size={'small'}
          onClick={submit}
          disabled={!hours && !minutes}
        >
          Save
        </Button>
      </div>
    </>
  );
};
