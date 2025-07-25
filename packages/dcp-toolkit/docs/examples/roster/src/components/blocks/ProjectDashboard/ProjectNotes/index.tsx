'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { CompanyPolicy, Note } from '@/types/type';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { ManageNotes } from '@/components/blocks/CallSheet/Notes/Manage';
import { ManageProjectNotes } from '@/components/blocks/ProjectDashboard/ProjectNotes/ManageProjectNotes';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = {
  userId: string;
  projectId: string;
  view?: 'dash';
  projectNotesModalOpen: boolean;
  setProjectNotesModalOpen: (open: boolean) => void;
  setNotesEmpty: (bool: boolean) => void;
};

export const ProjectNotes: FC<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState<number | null | boolean>(null);

  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  const [companyPolicies, setCompanyPolicies] = useState<CompanyPolicy[]>([]);

  const supabase = createClient();

  const fetchProjectNotes = useCallback(() => {
    setIsLoading(true);

    supabase
      .from('note')
      .select()
      .eq('project', props.projectId)
      .order('priority', { ascending: true })
      .then(({ data }) => {
        if (!data) return;

        setProjectNotes(data);
      });

    setIsLoading(false);
  }, [props.projectId]);

  const fetchPolicies = useCallback(() => {
    setIsLoading(true);

    supabase
      .from('company_policy')
      .select()
      .eq('company', props.userId)
      .then(({ data }) => {
        if (!data) return;

        setCompanyPolicies(data);
      });

    setIsLoading(false);
  }, [props.userId]);

  useEffect(() => {
    fetchProjectNotes();
    fetchPolicies();
  }, [props.projectId]);

  useEffect(() => {
    setNotesModalOpen(props.projectNotesModalOpen);
  }, [props.projectNotesModalOpen]);

  useEffect(() => {
    if (projectNotes.length === 0) {
      props.setNotesEmpty(true);
    } else {
      props.setNotesEmpty(false);
    }
  }, [projectNotes]);

  return (
    <>
      {projectNotes.length > 0 && (
        <div className="flex flex-col max-sm:mb-20">
          {!props.view ||
            (props.view !== 'dash' && (
              <div className="flex items-center gap-3 pb-2">
                <Icon name="file" className="w-[26px] h-[26px] text-white/70" />
                <div className="text-xl text-white/80">Notes</div>
              </div>
            ))}

          <div className="flex items-center h-[250px] overflow-x-scroll max-sm:max-w-full max-sm:overflow-x-hidden max-sm:h-full">
            <div className="flex h-full gap-3 overflow-x-scroll max-sm:flex-col">
              <div className="flex gap-3 max-sm:flex-col">
                {companyPolicies.length !== 0 &&
                  companyPolicies?.map(({ note, id, title }) => {
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

                        {title && (
                          <div className="text-xl font-medium leading-none text-white text-opacity-80">{title}</div>
                        )}

                        <p className="text-white font-label text-opacity-60 text-sm max-sm:text-[12px]">{note}</p>
                      </div>
                    );
                  })}

                {projectNotes?.map(({ note, id, title }) => {
                  return (
                    <div
                      className="cursor-pointer min-w-[200px] max-w-[240px] max-sm:w-full h-full flex flex-col gap-1 p-6 border bg-white bg-opacity-[0.02] hover:bg-opacity-[0.04] duration-100 border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:p-1 max-sm:text-center max-sm:h-[93px] max-sm:min-w-[160px] max-sm:backdrop-blur-0 max-sm:[background-color:unset] max-sm:rounded-lg"
                      key={id}
                      onClick={() => setNotesModalOpen(id)}
                    >
                      {title && (
                        <div className="text-xl font-medium leading-none text-white text-opacity-80">{title}</div>
                      )}

                      <p className="text-white font-label text-opacity-60 text-sm max-sm:text-[12px] line-clamp-6">
                        {note}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div
                onClick={() => {
                  setNotesModalOpen(true);
                }}
                className="hidden group max-sm:flex items-center justify-center gap-2 w-[120px] min-h-[50px] rounded-xl border border-zinc-700 cursor-pointer hover:bg-white/5"
              >
                <Icon
                  name="plus"
                  className="w-5 h-5 text-white text-opacity-70 duration-150 group-hover:text-opacity-90"
                />
                <div className="text-white/70 group-hover:text-white/90">Add Note</div>
              </div>

              <div className="flex flex-col items-center justify-evenly gap-2 pr-3 h-full max-sm:hidden max-sm:py-3 max-sm:flex-row max-sm:justify-start">
                <div
                  onClick={() => {
                    setNotesModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65 max-sm:flex-none"
                >
                  <Icon name="plus" className="w-8 h-8" />
                </div>

                <div
                  onClick={() => {
                    // setSelectedLocation(null);
                    setNotesModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65 max-sm:flex-none"
                >
                  <Icon name="edit" className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          <Skeleton className={cn('w-[200px] h-[115px] rounded-xl bg-white', projectNotes && 'hidden')} />
        </div>
      )}

      {notesModalOpen && (
        <ManageProjectNotes
          notes={projectNotes}
          project={props.projectId}
          open={notesModalOpen}
          setNotes={setProjectNotes}
          onClose={(notes) => {
            if (notes) {
              setProjectNotes(notes);
            }

            props.setProjectNotesModalOpen(false);
            setNotesModalOpen(null);
          }}
        />
      )}
    </>
  );
};
