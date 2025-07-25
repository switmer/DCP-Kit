'use client';

import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CompanyPolicy, Note } from '@/types/type';
import { ManageNotes } from './Manage';

export const Notes: React.FC<{
  callSheet: string;
  project: string;
  historical?: boolean;
  sheetNotes: Note[];
  companyPolicies: CompanyPolicy[];
  setRefreshKey?: (cb: (k: number) => number) => void;
}> = ({ callSheet, project, historical, sheetNotes, companyPolicies, setRefreshKey }) => {
  const [open, setOpen] = useState<number | null | boolean>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [policies, setPolicies] = useState<CompanyPolicy[]>([]);

  useEffect(() => {
    setNotes(sheetNotes);
  }, [sheetNotes]);

  useEffect(() => {
    setPolicies(companyPolicies);
  }, [companyPolicies]);

  return (
    <>
      <div
        className={cn(
          'flex gap-3 max-sm:flex max-sm:overflow-x-scroll max-sm:h-[125px] max-sm:items-center hide-scrollbars',
        )}
      >
        {policies.length !== 0 &&
          policies?.map(({ note, id, title }) => {
            return (
              <div
                className="cursor-pointer min-w-[200px] max-w-[240px] flex flex-col gap-1 p-6 border bg-white bg-opacity-[0.02] hover:bg-opacity-[0.04] duration-100 border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:p-1 max-sm:text-center max-sm:h-[93px] max-sm:min-w-[160px] max-sm:backdrop-blur-0 max-sm:[background-color:unset] max-sm:rounded-lg"
                key={id}
                // onClick={() => setOpen(id)}
              >
                <div className="flex items-center gap-3 h-[25px]">
                  <Icon name="briefcase" className="w-4 h-4 text-lime-300" />
                  <div className="flex items-center w-auto h-[17px] bg-stone-900 px-2 text-lime-300 text-opacity-60 text-xs font-bold rounded-full max-sm:text-[12px]">
                    COMPANY POLICY
                  </div>
                </div>

                {title && <div className="text-xl font-medium leading-none text-white text-opacity-80">{title}</div>}

                <p className="text-white font-label text-opacity-60 text-sm max-sm:text-[12px] line-clamp-3 overflow-hidden">
                  {note}
                </p>
              </div>
            );
          })}

        {notes.length !== 0 &&
          notes?.map(({ note, id, title }) => {
            return (
              <div
                className="cursor-pointer min-w-[200px] max-w-[240px] flex flex-col gap-1 p-6 border bg-white bg-opacity-[0.02] hover:bg-opacity-[0.04] duration-100 border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:p-1 max-sm:text-center max-sm:h-[93px] max-sm:min-w-[160px] max-sm:backdrop-blur-0 max-sm:[background-color:unset] max-sm:rounded-lg"
                key={id}
                onClick={() => setOpen(id)}
              >
                {title && <div className="text-xl font-medium leading-none text-white text-opacity-80">{title}</div>}

                <p className="text-white font-label text-opacity-60 text-sm max-sm:text-[12px] line-clamp-3 overflow-hidden">
                  {note}
                </p>
              </div>
            );
          })}

        {notes.length === 0 && (
          <div
            className="group flex flex-col items-center justify-center min-w-[200px] max-w-[200px] h-[125px] p-2 rounded-xl border-[3px] border-white/20 border-dashed cursor-pointer hover:border-zinc-500/55"
            onClick={(e) => {
              // setSelectedLocation(null);
              setOpen(true);
            }}
          >
            <div className="py-2">
              <Icon name="file" className="w-[40px] h-[40px] text-white/10 group-hover:text-white/50" />
            </div>

            <div className="flex gap-3 items-center justify-center w-full pb-2">
              <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                <Icon name="plus" className="w-5 h-5 text-white/60 group-hover:text-white/80" />
              </div>

              <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">Add Notes</div>
            </div>
          </div>
        )}

        {!historical && notes.length !== 0 && (
          <div className="flex flex-col items-center justify-evenly gap-2 py-1 pr-3 max-sm:h-full max-sm:gap-2">
            <div
              onClick={() => {
                // setInitiallyViewing("new");
                setOpen(true);
              }}
              className="flex flex-1 items-center justify-center w-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
            >
              <Icon name="plus" className="w-8 h-8" />
            </div>

            <div
              onClick={() => {
                setOpen(notes[0].id);
              }}
              className="flex flex-1 items-center justify-center w-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
            >
              <Icon name="edit" className="w-5 h-5" />
            </div>

            {/*<Button*/}
            {/*  className="px-2 text-xs text-neutral-300 gap-1 bg-opacity-0 hover:text-accent"*/}
            {/*  variant={"secondary"}*/}
            {/*  onClick={() => setOpen(true)}*/}
            {/*>*/}
            {/*  <Icon name="edit" className="w-4 h-4 fill-none "/>*/}
            {/*  <div className="">Manage Notes</div>*/}
            {/*</Button>*/}
          </div>
        )}
      </div>

      {open && (
        <ManageNotes
          notes={notes}
          callSheet={callSheet}
          project={project}
          open={open}
          setNotes={setNotes}
          onClose={(notes) => {
            if (notes) {
              setNotes(notes);
              if (setRefreshKey) {
                setRefreshKey((k) => k + 1);
              }
            }
            setOpen(null);
          }}
        />
      )}
    </>
  );
};
