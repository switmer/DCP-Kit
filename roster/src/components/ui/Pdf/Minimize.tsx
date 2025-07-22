'use client';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { Icon } from '../Icon';
import { Pdf } from '.';
import { useCallSheetStore } from '@/store/callsheet';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

export const MinimizePdf: React.FC<{
  className?: string;
  sheetSrc: string;
  isLoading: boolean;
  isPdfOutdated?: boolean;
  onRegenerateClick?: () => void;
}> = ({ className, sheetSrc, isLoading, isPdfOutdated, onRegenerateClick }) => {
  const [minimized, setMinimized] = useState(true);
  const { callPush } = useCallSheetStore();

  const { members } = useCallSheetStore();

  const namesToHighlight = members.map((m) => m.name);

  if (!sheetSrc) return <></>;

  return (
    <>
      <div
        className={cn('right-4 bottom-4 fixed z-50 w-[118px] cursor-pointer', className, !minimized && 'hidden')}
        onClick={() => setMinimized(false)}
      >
        <div className="p-2 bg-white bg-opacity-10 rounded-[10px] backdrop-blur-sm">
          <div className="pb-2 text-stone-300 text-xs font-medium flex justify-between">
            Call Sheet
            <div className="w-8 h-4 px-1.5 py-0.5 bg-white bg-opacity-20 rounded justify-center items-center inline-flex">
              <div className="text-center text-white text-[10px] ">PDF</div>
            </div>
          </div>

          <div className="pointer-events-none">
            <Pdf wrapperClassName="p-0" sheetSrc={sheetSrc} ratio={1 / 1.28} rounded={false} />
          </div>
        </div>
        <div
          onClick={() => setMinimized(false)}
          className="absolute mt-2 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 p-2 bg-stone-900 rounded-2xl backdrop-blur-2xl flex-col justify-start items-center inline-flex cursor-pointer"
        >
          <Icon name="expand" className="text-lime-300 w-6 h-6" />
        </div>
        {isPdfOutdated && (
          <div
            className={cn(
              'absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center cursor-pointer',
              isLoading && 'bg-yellow-500/70',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onRegenerateClick && onRegenerateClick();
            }}
          >
            {isLoading ? <LoadingIndicator size="xsmall" /> : <Icon name="refresh" className="w-4 h-4 text-black" />}
          </div>
        )}
      </div>

      <div
        className={cn(
          'right-4 bottom-4 fixed z-50 min-w-[520px] w-[60vw] max-w-[750px] rounded-2xl backdrop-blur-2xl overflow-hidden',
          className,
          minimized && 'hidden',
        )}
      >
        <div className="h-11 p-2.5 justify-between items-center flex">
          <div className="text-white text-base font-normal">Call Sheet PDF</div>
          <div className="flex items-center gap-2">
            {isPdfOutdated && (
              <button
                className={cn(
                  'flex items-center gap-1 px-2 py-1 bg-yellow-500 rounded-md text-black text-xs font-medium',
                  isLoading && 'bg-yellow-500/70',
                )}
                onClick={onRegenerateClick}
                disabled={isLoading}
              >
                {isLoading ? <LoadingIndicator size="xsmall" /> : <Icon name="refresh" className="w-3 h-3" />}
                Regenerate
              </button>
            )}
            <button className="w-6 h-6 cursor-pointer" onClick={() => setMinimized(true)}>
              <Icon name="minimize" className="w-6 h-6 text-lime-300" />
            </button>
          </div>
        </div>

        <Pdf
          wrapperClassName="p-0"
          sheetSrc={sheetSrc}
          controls
          ratio={1 / 1.28}
          rounded={false}
          highlight={namesToHighlight}
        />
        {!!callPush && !callPush.src && (
          <div className="w-[130.243px] h-[45px] rotate-[-8.639deg] shrink-0 flex items-center justify-center absolute top-[20%] left-1/2 translate-x-[-50%] rounded-lg border-[3px] border-solid border-[#EB0202]">
            <div className="text-[#EB0202] text-base font-extrabold text-center uppercase leading-[1.2]">
              Call Pushed
              <br />
              {[
                callPush.hours && `${callPush.hours} HOUR${callPush.hours > 1 ? 'S' : ''}`,
                callPush.minutes && `${callPush.minutes} MINUTE${callPush.minutes > 1 ? 'S' : ''}`,
              ]
                .filter(Boolean)
                .join(' ')}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
