import { AlertDialog } from '@/components/ui/AlertDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { createClient } from '@/lib/supabase/client';
import { cn, formatSheetDate } from '@/lib/utils';
import { useRouter } from 'next-nprogress-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useCallSheetStore } from '@/store/callsheet';
import { EditProjectDetails } from '@/components/blocks/Crewing/EditProjectDetails';
import { SheetWithAdditionalData } from '@/components/blocks/CallSheet/RefreshableCallSheet';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';
import { checkCallSheetPdfTimestamp } from '@/lib/checkCallSheetPdfTimestamp';

export const CallSheetTitle: React.FC<{
  job_name: string;
  sheet: SheetWithAdditionalData;
  // project: ProjectType;
}> = ({ job_name, sheet }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [v, setV] = useState(job_name);
  const [isEditing, setIsEditing] = useState(false);
  const [width, setWidth] = useState<number | undefined>(0);
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [reparsing, setReparsing] = useState(false);

  const { members } = useCallSheetStore();

  const disableRetryParse = useMemo(() => {
    if (sheet.status !== 'ready') return true;
    return members.some((member) => member.status !== 'pending');
  }, [members, sheet.status]);

  const vRef = useRef<any>();
  const inputRef = useRef<any>();

  const router = useRouter();
  const supabase = createClient();

  const replaceCallSheetInputRef = useRef<HTMLInputElement | null>(null);
  const crewContactListInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    //@ts-ignore
    if (!job_name) return;

    // -- only update if the current value is different to avoid unnecessary re-renders.
    //@ts-ignore
    if (v !== job_name) {
      //@ts-ignore
      setV(v);
    }
  }, [job_name, v]);

  useEffect(() => {
    setWidth(vRef.current?.offsetWidth + 38);
  }, [v]);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isEditing]);

  const save = async () => {
    setIsEditing(false);

    //@ts-ignore
    if (v === job_name || !sheet.project) {
      return;
    }

    const { data, error } = await supabase
      .from('call_sheet')
      .update({
        //-- updates the raw_json job_name (name of shoot day).
        raw_json: {
          ...((sheet?.raw_json ?? {}) as {}),
          job_name: v,
        },
      })
      .eq('id', sheet.id)
      .select();

    if (!data || error) {
      console.error('Error: ', error);
      toast.error('Something went wrong. Please try again.');

      return;
    }

    // update the timestamp and check if the pdf is outdated.
    await updateCallSheetTimestamp(supabase, sheet.id, async () => {
      try {
        // check if the pdf is outdated after the update.
        const { isOutdated } = await checkCallSheetPdfTimestamp(supabase, sheet.id);
      } catch (error) {
        console.error('Error checking PDF timestamp:', error);
      }
    });

    toast.success('Job name updated.');
  };

  const deleteProject = async () => {
    const { error } = await supabase
      .from('project')
      .delete()
      /* @ts-ignore */
      .eq('id', sheet?.project?.id)
      .select();

    if (error) {
      toast.error('Something went wrong.');
      return;
    }

    toast.success('Project deleted.');
  };

  const deleteDay = async () => {
    const { error } = await supabase.from('call_sheet').delete().eq('id', sheet?.id).select();

    if (error) {
      toast.error('Something went wrong.');
      return;
    }

    // const { data: daysData } = await supabase
    //   .from("call_sheet")
    //   .select("short_id, date")
    //   /* @ts-ignore */
    //   .eq("project", sheet?.project?.id);

    // if (!daysData?.length) {
    //   await deleteProject();
    // }

    toast.success('Day deleted.');
  };

  const handleReplaceCallSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sheet.id) return;

    const fileName = `${
      /* @ts-ignore */
      sheet?.company?.id ?? ''
    }/sheet_${new Date().toISOString()}.pdf`;

    try {
      const { data, error } = await supabase.storage.from('call-sheets').upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { error: updateError } = await supabase.from('call_sheet').update({ src: data.path }).eq('id', sheet.id);

      if (updateError) throw updateError;

      toast.success('Call sheet file uploaded successfully.');
      window.location.href = window.location.href; // Refresh the page

      if (replaceCallSheetInputRef.current) {
        replaceCallSheetInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to upload call sheet file. Please try again.');
    }
  };

  const handleUploadCrewContactList = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sheet.project?.id) return;

    const fileName = `${sheet?.project?.id ?? ''}/crew_contact_list_${new Date().toISOString()}.pdf`;

    try {
      const { data, error } = await supabase.storage.from('call-sheets').upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: insertData, error: insertError } = await supabase
        .from('project_contact_list')
        .insert({
          project: sheet.project?.id,
          src: data.path,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Crew contact list uploaded successfully.');

      await axios.post('/api/enrich-sheet', {
        sheet_id: sheet.id,
        project_id: sheet.project?.id,
        contact_list_id: insertData.id,
      });

      if (crewContactListInputRef.current) {
        crewContactListInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to upload crew contact list. Please try again.');
    }
  };

  const retryParse = async () => {
    if (disableRetryParse) return;
    setReparsing(true);
    toast.success('Initiating re-parse...');
    fetch('/sheet/process/reparse', {
      method: 'POST',
      body: JSON.stringify({
        id: sheet.id,
      }),
    })
      .then(() => {
        toast.success('Reparsing call sheet...');
        setReparsing(false);
        window.location.href = window.location.href;
      })
      .catch(() => {
        toast.error('Something went wrong.');
        setReparsing(false);
      });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 max-sm:pb-4">
        <div className="flex items-center gap-4">
          <div
            className="opacity-0 absolute pointer-events-none h-0 text-[38px] font-bold leading-10 border border-white border-opacity-10 rounded-md flex items-center"
            ref={vRef}
          >
            {v}
          </div>

          {!isEditing ? (
            <Tooltip
              side="bottom"
              content="Click to edit the title"
              className="p-3 bg-stone-900 rounded border border-stone-900 text-white text-xs font-bold"
            >
              <h1
                onClick={() => setIsEditing(true)}
                className="min-w-[1ch] text-[38px] font-bold leading-10 hover:bg-white hover:bg-opacity-10 border border-transparent rounded-md flex items-center h-[45px]"
              >
                {!!v ? v : 'Untitled'}
              </h1>
            </Tooltip>
          ) : (
            <div className="relative before:content-[''] before:absolute before:bg-[#3E4035] before:rounded-lg before:z-0 before:top-[-4px] before:left-[-4px] before:bottom-[-4px] before:right-[-4px]">
              <input
                autoFocus
                ref={inputRef}
                onBlur={save}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    save();
                  }
                }}
                type="text"
                value={v}
                style={width ? { width } : {}}
                onChange={(e) => setV(e.target.value)}
                className="text-[38px] relative bg-stone-900 font-bold leading-10 z-10 rounded-md flex items-center h-[45px] border border-lime-300"
              />
            </div>
          )}

          <DropdownMenu open={menuOpen} onOpenChange={(open) => setMenuOpen(open)}>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="w-11 h-11 p-3 opacity-80 rounded-xl border border-white border-opacity-20 justify-center items-center flex"
            >
              <Icon name="dots" className="w-[18px] h-[18px] text-white rotate-90" />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                side="bottom"
                align="start"
                hideWhenDetached
                className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
              >
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setEditDetailsModalOpen(true);
                  }}
                  className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
                >
                  Edit project details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => document.getElementById('replace-call-sheet-input')?.click()}
                  className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded"
                >
                  {sheet?.src ? 'Replace' : 'Upload'} call sheet file
                </DropdownMenuItem>
                <Tooltip
                  content={
                    disableRetryParse ? (
                      <div className="flex flex-col gap-0 max-w-[240px]">
                        <p className="text-sm font-bold">Re-parsing disabled</p>
                        <p className="text-xs">You can only retry parsing before you&apos;ve sent any call cards out</p>
                      </div>
                    ) : undefined
                  }
                  side="right"
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      if (disableRetryParse) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }

                      retryParse();
                    }}
                    className={cn(
                      'h-10 pl-3 pr-2 py-2  rounded',
                      !disableRetryParse ? 'hover:bg-white hover:bg-opacity-5' : '',
                      disableRetryParse &&
                        'text-white/50 focus:bg-opacity-0 focus:bg-transparent focus:text-white/50 cursor-not-allowed',
                    )}
                  >
                    {reparsing ? 'Retrying parse...' : 'Retry parse'}
                  </DropdownMenuItem>
                </Tooltip>

                <DropdownMenuItem
                  onClick={() => document.getElementById('crew-contact-list-input')?.click()}
                  className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded"
                >
                  Upload crew contact list
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm"
                >
                  <AlertDialog
                    withPortal
                    onConfirm={async () => {
                      await deleteDay();

                      router.push(`/project/${sheet.project.id}`);
                    }}
                    isDelete
                    title={`Are you sure you want to delete day: ${formatSheetDate(
                      /* @ts-ignore */
                      sheet?.raw_json?.full_date,
                      'str',
                    )}?`}
                    description={'This cannot be undone. This will permanently remove this day.'}
                  >
                    {'Delete day: '}
                    {
                      formatSheetDate(
                        //@ts-ignore
                        sheet?.raw_json?.full_date ?? sheet?.date,
                        'str',
                      ) as string
                    }
                  </AlertDialog>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                  }}
                  className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm"
                >
                  <AlertDialog
                    withPortal
                    onConfirm={async () => {
                      await deleteProject();

                      router.push('/');
                    }}
                    isDelete
                    title={`Are you sure you want to delete this project?`}
                    description="This cannot be undone. This will permanently remove this project and all call sheets related to it."
                  >
                    Delete project
                  </AlertDialog>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </div>

      {/*{editDetailsModalOpen && (*/}
      {/*  <EditProjectDetails*/}
      {/*    sheet={sheet}*/}
      {/*    // project={project}*/}
      {/*    open={editDetailsModalOpen}*/}
      {/*    setEditDetailsModalOpen={setEditDetailsModalOpen}*/}
      {/*  />*/}
      {/*)}*/}

      {editDetailsModalOpen && (
        <EditProjectDetails
          project={sheet.project}
          isForSheet={true}
          close={() => setEditDetailsModalOpen(false)}
          onUpdate={() => {
            /* TEMP fix */
            router.refresh();
          }}
          refreshCallback={() => {
            router.replace(`/sheet/${sheet.short_id}`);
          }}
          open={editDetailsModalOpen}
        />
      )}

      <input
        id="replace-call-sheet-input"
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleReplaceCallSheet}
        ref={replaceCallSheetInputRef}
      />
      <input
        id="crew-contact-list-input"
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleUploadCrewContactList}
        ref={crewContactListInputRef}
      />
    </>
  );
};
