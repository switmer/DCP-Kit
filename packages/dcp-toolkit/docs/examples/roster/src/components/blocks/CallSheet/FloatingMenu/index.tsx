import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { cn, formatSheetDate } from '@/lib/utils';
import React, { SetStateAction, useMemo, useState } from 'react';
import { CustomSmsDialog } from '../CustomSmsDialog';
import { Database } from '@/types/supabase';
import { Tooltip } from '@/components/ui/Tooltip';
import { CallSheetMemberType } from '@/types/type';
import { AlertDialog } from '@/components/ui/AlertDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

export const FloatingMenu: React.FC<{
  focusedMember?: string | null;
  checked: string[];
  members: CallSheetMemberType[];
  setChecked: (value: SetStateAction<string[]>) => void;
  sendCallCards: (ids: string[]) => Promise<void>;
  activeTab: string;
  toggleCheckedContactInfoVisible: (visible: boolean) => void;
  hasCallSheet: boolean;
  isPdfOutdated: boolean;
}> = ({
  focusedMember,
  checked,
  setChecked,
  sendCallCards,
  members,
  activeTab,
  toggleCheckedContactInfoVisible,
  hasCallSheet,
  isPdfOutdated,
}) => {
  const [messageOpen, setMessageOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    if (activeTab === 'all') return members;
    if (activeTab === 'pending') return members.filter((m) => m.status === 'pending');
    if (activeTab === 'sent') return members.filter((m) => m.status === 'sent-call-card');
    if (activeTab === 'confirmed') return members.filter((m) => m.status === 'confirmed');
    if (activeTab === 'failed') return members.filter((m) => m.status === 'call-card-sms-failed');
    return members;
  }, [members, activeTab]);

  const anyPending = useMemo(() => {
    if (!checked.length) return filteredMembers.some((m) => m.status === 'pending');
    return checked.some((id) => {
      const member = filteredMembers.find((m) => m.id === id);
      return member?.status === 'pending';
    });
  }, [checked, filteredMembers]);

  const toSend = useMemo(() => {
    if (!checked.length) return filteredMembers.filter((m) => m.status === 'pending').map((m) => m.id);

    return checked.filter((id) => {
      const member = filteredMembers.find((m) => m.id === id);
      return member?.status === 'pending';
    });
  }, [checked, filteredMembers]);

  const toSendCustomSms = useMemo(() => {
    if (!checked.length) return filteredMembers.map((m) => m.id);

    return checked;
  }, [checked, filteredMembers]);

  if (focusedMember) return null;

  return (
    <>
      <div
        className={cn(
          'duration-200 pointer-events-none max-w-[590px] w-full h-16 px-6 bg-stone-900 bg-opacity-70 rounded-2xl backdrop-blur-2xl justify-between items-center gap-3.5 flex fixed bottom-6 left-1/2 -translate-x-1/2 max-sm:max-w-[350px] max-sm:gap-2 max-sm:px-3',
          'translate-y-0 opacity-100 pointer-events-auto max-sm:translate-y-[-70px] z-30',
        )}
      >
        <div className="flex flex-1 items-center gap-3">
          {!!checked.length ? (
            <>
              <div className="text-white text-sm font-semibold max-sm:text-xs max-sm:min-w-[70px] max-sm:text-center">
                {checked.length} selected
              </div>

              <Button
                variant={'outline'}
                size={'compact'}
                className="px-3 text-neutral-300 text-xs font-semibold h-10"
                onClick={() => setChecked([])}
              >
                <div className="max-sm:hidden">Clear all</div>
                <div className="hidden max-sm:flex">Clear</div>
              </Button>
            </>
          ) : (
            <div className="text-white text-sm font-semibold max-sm:text-xs max-sm:min-w-[70px] max-sm:text-center">
              Send messages
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          {checked.length > 0 && (
            <DropdownMenu open={moreMenuOpen} onOpenChange={(open) => setMoreMenuOpen(open)}>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="group flex justify-center items-center w-[80px] h-[40px] bg-white/5 opacity-80 rounded-xl max-sm:w-[35px]"
              >
                <div className="flex items-center gap-2 text-neutral-200 group-hover:text-white">
                  <div className="text-[13px] font-bold max-sm:hidden">More</div>
                  <Icon
                    name="chevron"
                    className={cn('w-[10px] h-[10px] rotate-90 transition-all fill-none', moreMenuOpen && '-rotate-90')}
                  />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  hideWhenDetached
                  className="z-[9999] p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
                >
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      toggleCheckedContactInfoVisible(true);
                    }}
                    className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
                  >
                    Show contact info
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      toggleCheckedContactInfoVisible(false);
                    }}
                    className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded"
                  >
                    Hide contact info
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          )}

          <Button
            className="h-10 text-xs text-neutral-300 gap-1 hover:brightness-125 max-sm:px-3"
            variant={'secondary'}
            onClick={() => setMessageOpen(true)}
          >
            <Icon name="send" className="w-5 h-5 text-neutral-300 fill-none max-sm:hidden" />
            <div className="max-sm:hidden">Custom SMS</div>
            <div className="hidden max-sm:flex">Custom</div>
          </Button>

          <Tooltip content={'Send call cards to crew members who have not yet received them.'}>
            <AlertDialog
              onConfirm={async () => {
                setLoading(true);
                await sendCallCards(toSend);
                setChecked([]);
                setLoading(false);
              }}
              title={`Send ${toSend.length} call card${toSend.length === 1 ? '' : 's'}?`}
              description={
                !hasCallSheet
                  ? "You're about to send call cards, but a call sheet PDF doesn't exist. We'll generate one first and then send the call cards."
                  : isPdfOutdated
                    ? "You're about to send call cards, but the current call sheet PDF is outdated. We'll regenerate it first and then send the call cards."
                    : "You're about to send call cards. Make sure the information you're sending is correct."
              }
              actionLabel={`Send ${toSend.length} call card${toSend.length === 1 ? '' : 's'}`}
              withPortal
            >
              <Tooltip content={`Send ${toSend.length} call card${toSend.length === 1 ? '' : 's'}`}>
                <Button
                  className="h-10 text-xs gap-1 min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed max-sm:min-w-full max-sm:px-[12px]"
                  variant={'accent'}
                  disabled={loading || !anyPending}
                >
                  {loading ? (
                    <LoadingIndicator dark size="small" />
                  ) : (
                    <>
                      <Icon name="send" className="w-6 h-6 text-black fill-none max-sm:flex" />
                      <div className="max-sm:hidden">
                        {toSend.length} call card
                        {toSend.length === 1 ? '' : 's'}
                      </div>
                    </>
                  )}
                </Button>
              </Tooltip>
            </AlertDialog>
          </Tooltip>
        </div>
      </div>

      <CustomSmsDialog
        checked={toSendCustomSms}
        members={members}
        open={messageOpen}
        close={() => setMessageOpen(false)}
        onSend={() => {
          setChecked([]);
          setMessageOpen(false);
        }}
      />
    </>
  );
};
