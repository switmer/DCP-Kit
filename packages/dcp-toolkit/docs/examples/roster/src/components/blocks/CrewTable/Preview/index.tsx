import { AlertDialog } from '@/components/ui/AlertDialog';
import { AvatarFallback } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Icon } from '@/components/ui/Icon';
import useOutsideClick from '@/lib/hooks/useClickOutside';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CompanyCrewMemberType, PositionType } from '@/types/type';
import { Avatar } from '@radix-ui/react-avatar';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RelatedJobs } from '@/components/blocks/CrewTable/Preview/RelatedJobs';
import { ManagePosition } from '../ManagePosition';
import { Details } from './Details';
import { Positions } from './Positions';
import { useCrewStore } from '@/store/crew';
import { AddPosition } from '../ManagePosition/AddPosition';
import { Notes } from '@/components/blocks/CrewTable/Preview/Notes';

export type Project = {
  name: string;
  dates: (Date | string)[];
  role: string;
};

export type ProjectMonthGroup = [string, Project[]];
export type ProjectYearGroup = [string, ProjectMonthGroup];
export type ProjectsByYearAndMonth = ProjectYearGroup[];

export const Preview: React.FC = () => {
  const { selected, setSelected, setRefreshKey: onUpdate, company } = useCrewStore();

  const companyId = company?.id;

  const [currentMember, setCurrentMember] = useState<(CompanyCrewMemberType & { position: PositionType[] }) | null>(
    null,
  );
  const [openAdd, setOpenAdd] = useState<boolean>(false);

  const ref = useOutsideClick(() => {
    setTimeout(() => {
      setSelected(null);
    }, 100);
  });
  const [refreshRates, setRefreshRates] = useState<number>(0);
  const [editPosition, setEditPosition] = useState<null | [PositionType, (name: string, department: string[]) => void]>(
    null,
  );

  const supabase = createClient();

  useEffect(() => {
    fetchCurrentMember();
  }, [selected]);

  const fetchCurrentMember = useCallback(() => {
    setCurrentMember(null);
    if (!selected) return;

    supabase
      .from('company_crew_member')
      .select(
        `
      *,
      position!inner(
        *
      ),
      call_sheet_member (
        project
      )
    `,
        { count: 'exact' },
      )
      .eq('id', selected)
      .then(({ data }) => {
        if (!data || !data.length) {
          setSelected(null);
          return;
        }

        setCurrentMember(data[0]);
      });
  }, [selected, setSelected, supabase]);

  useEffect(() => {
    if (!refreshRates) return;
    onUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshRates]);

  const onChange = (k: keyof CompanyCrewMemberType, v: any) => {
    if (!currentMember) {
      return;
    }

    setCurrentMember(
      (prev) =>
        ({
          ...prev,
          [k]: v,
        }) as CompanyCrewMemberType & { position: PositionType[] },
    );

    /* @ts-ignore */
    const { call_sheet_member, position, ...rest } = currentMember;

    supabase
      .from('company_crew_member')
      .update({
        ...rest,
        [k]: v,
      })
      .eq('id', currentMember.id)
      .then(({ error }) => {
        if (error) {
          toast.error('Something went wrong');
          return;
        }
        onUpdate();
        toast.success(`${currentMember?.name} details updated`);
      });
  };

  const onDelete = useCallback(async () => {
    if (!currentMember?.id) return;

    try {
      await supabase.from('company_crew_member').delete().eq('id', currentMember?.id);

      toast.success(`${currentMember?.name} removed`);
      onUpdate();
    } catch {
      toast.error('Something went wrong');
    }
  }, [currentMember, supabase, onUpdate]);

  return (
    <>
      <div ref={ref}>
        <div
          className={cn(
            'max-w-[430px] backdrop-blur-2xl overflow-y-auto w-full z-50 p-8 bg-crew-preview rounded-3xl gap-6 flex flex-col top-3 right-3 bottom-3 fixed translate-x-[100%] opacity-0 duration-300',
            currentMember && 'translate-x-0 opacity-100',
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger className="w-11 h-12 p-3 opacity-60 rounded-xl border border-white border-opacity-20 justify-center items-center flex absolute top-4 right-4">
              <Icon name="dots" className="w-[18px] h-[18px] text-white" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="bottom"
              align="end"
              className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[212px]"
            >
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  window.open(
                    `https://www.google.com/search?q=${encodeURIComponent(currentMember?.name as string)}`,
                    '_blank',
                  );
                }}
                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
              >
                Search on Google
                <Icon name="google" className="w-5 h-5 opacity-15" />
              </DropdownMenuItem>

              <div className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm flex w-full items-center [&>button]:w-full [&>button]:text-left">
                <AlertDialog
                  onConfirm={onDelete}
                  isDelete
                  title={`Are you sure you want to delete?`}
                  description="This cannot be undone. This will permanently remove this crew member."
                  withPortal
                >
                  Remove person
                </AlertDialog>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="pt-4 flex justify-center">
            <div className="flex flex-col gap-6 justify-center items-center">
              <Avatar className="w-32 h-32 rounded-full">
                <AvatarFallback className="w-32 h-32 flex items-center justify-center bg-black bg-opacity-10 font-medium">
                  <span className="text-[98px] font-medium leading-none">{currentMember?.first_name?.[0]}</span>
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col justify-center items-center gap-3">
                <div className="text-white text-[34px] font-medium leading-[1]">{currentMember?.name}</div>

                {(currentMember?.city || currentMember?.state) && (
                  <div className="flex items-center text-white/70 text-md font-bold gap-1">
                    <Icon name="pin" className="w-5 h-5 text-white/70" />

                    {currentMember.city && currentMember.state && (
                      <>{`${currentMember?.city}, ${currentMember?.state}`}</>
                    )}

                    {currentMember.city && !currentMember.state && currentMember.city}

                    {!currentMember.city && currentMember.state && currentMember.state}
                  </div>
                )}

                {currentMember?.created_at && (
                  <div className="opacity-40 text-white text-xs font-medium">
                    On Roster since {format(currentMember?.created_at, 'MMM yyyy')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {currentMember?.id && companyId && (
            <Positions
              refreshRates={refreshRates}
              companyId={companyId}
              id={currentMember?.id}
              positions={currentMember?.position}
              onUpdate={() => setRefreshRates((k) => k + 1)}
              setEditPosition={setEditPosition}
              openAdd={() => setOpenAdd(true)}
            />
          )}

          <Details member={currentMember} onChange={onChange} />

          <Notes id={currentMember?.id ?? null} />

          <RelatedJobs id={currentMember?.id} />
        </div>

        {currentMember?.id && (
          <>
            <ManagePosition
              id={currentMember?.id}
              position={editPosition}
              onClose={() => {
                setEditPosition(null);
              }}
              onUpdate={() => {
                setRefreshRates((k) => k + 1);
              }}
            />

            {openAdd && (
              <AddPosition
                id={currentMember?.id}
                setOpen={setOpenAdd}
                open={openAdd}
                onUpdate={() => {
                  setRefreshRates((k) => k + 1);
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};
