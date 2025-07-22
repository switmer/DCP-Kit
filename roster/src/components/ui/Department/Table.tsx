import { format, parse } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '../Table';
import { DepartmentRowLoading } from './Row';
import { Checkbox } from '../Checkbox';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { LoadingIndicator } from '../LoadingIndicator';
import { Skeleton } from '../Skeleton';
import { CheckedState } from '@radix-ui/react-checkbox';
import { AlertDialog } from '../AlertDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../Collapsible';
import { AddCallSheetMember } from '@/components/blocks/CallSheet/AddMember';
import { AddEntityContact } from '@/components/blocks/CallSheet/AddEntityContact';

export const DepartmentTable: React.FC<{
  children?: React.ReactNode | React.ReactNode[];
  isHistorical: boolean;
  title: string;
  callTime: string;
  count: number;
  loading?: boolean;
  checked?: boolean | CheckedState;
  setChecked?: (check: boolean) => void;
  sentCount?: number;
  confirmedCount?: number;
  pendingCount?: number;
  checkedCount?: number;
  onSend: (onlyChecked?: boolean) => Promise<void>;
  sheetId?: string;
  projectId?: string;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
  isEntity?: boolean;
  entityId?: string;
  isTalent?: boolean;
  hasCallSheet?: boolean;
  isPdfOutdated?: boolean;
  customPrefix?: React.ReactNode;
}> = ({
  children,
  isHistorical,
  title,
  callTime,
  count,
  loading,
  checked,
  setChecked,
  sentCount,
  onSend,
  confirmedCount,
  pendingCount,
  checkedCount,
  sheetId,
  projectId,
  setRefreshKey,
  isEntity = false,
  entityId,
  isTalent = false,
  hasCallSheet = true,
  isPdfOutdated = false,
  customPrefix,
}) => {
  const [loadingSms, setLoadingSms] = useState(false);
  const time = useMemo(() => {
    try {
      const parsedTime = parse(callTime, 'h:mm a', new Date());

      const formattedTime = format(parsedTime, 'h:mmaaaaa');

      return formattedTime;
    } catch {
      return callTime;
    }
  }, [callTime]);

  return (
    <Collapsible
      defaultOpen
      className="p-[18px] flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:rounded-lg max-sm:[background-color:unset] max-sm:p-[10px]"
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-4 p-2 [&>div>svg]:data-[state=open]:rotate-90">
        <div className="flex items-center gap-3">
          <Icon name="chevron" className="min-w-3 w-3 h-3 duration-100 text-white text-opacity-40" />
          {customPrefix}
          <h3 className="text-[28px] leading-[28px] text-white max-sm:text-[22px]">{title}</h3>
          <span className="flex items-center justify-center h-6 px-3 text-[13px] text-white rounded-xl backdrop-blur-md bg-white bg-opacity-10">
            {count}
          </span>
        </div>
        <span className="flex text-xl max-sm:text-[15px]">{time}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-600 border-opacity-20">
              <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 px-2">
                <div className="flex gap-2 items-center">
                  {!isHistorical && (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Checkbox checked={checked} onCheckedChange={setChecked} />
                    </div>
                  )}

                  {isTalent ? 'Role' : 'Position'}
                </div>
              </TableHead>

              {!isHistorical && (
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 w-[72px] px-2">
                  Status
                </TableHead>
              )}

              <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[230px] px-2">
                Name
              </TableHead>

              <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                Email
              </TableHead>

              <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                Phone
              </TableHead>

              <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 w-[80px] px-2">
                Call
              </TableHead>

              <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 w-[80px] px-2">
                Wrap
              </TableHead>
            </TableRow>
          </TableHeader>

          {loading ? (
            <TableBody>
              {[...new Array(!!count ? count : 3)].map((i) => (
                <DepartmentRowLoading key={i} />
              ))}
            </TableBody>
          ) : (
            <TableBody>{children}</TableBody>
          )}
        </Table>

        <div className="flex items-center gap-4 mt-2">
          {loading ? (
            <>
              <Skeleton className="w-[158px] h-[42px] rounded-xl" />
              <Skeleton className="w-[72px] h-4" />
              <Skeleton className="w-[135px] h-4" />
            </>
          ) : (
            <>
              {!isHistorical && (
                <>
                  {sheetId && projectId && setRefreshKey && (
                    <>
                      {isEntity ? (
                        <AddEntityContact
                          entityId={entityId!}
                          entityName={title}
                          projectId={projectId}
                          sheetId={sheetId}
                          onSave={() => setRefreshKey((k) => k + 1)}
                        />
                      ) : (
                        <AddCallSheetMember
                          sheetId={sheetId}
                          projectId={projectId}
                          onSave={() => setRefreshKey((k) => k + 1)}
                          department={title}
                          callTime={callTime}
                        >
                          <Button
                            variant={'outlineAccent'}
                            size={'compact'}
                            className="px-2 gap-1 justify-start pl-3 pr-4 hover:bg-lime-300/5 duration-150"
                          >
                            <Icon name="plus-alt" className="w-[18px] h-[18px] text-lime-300" />
                            {isTalent ? 'Add Talent' : 'Add Crew'}
                          </Button>
                        </AddCallSheetMember>
                      )}

                      {!!pendingCount && !checkedCount && (
                        <AlertDialog
                          title={`Send ${pendingCount} call card${pendingCount !== 1 ? 's' : ''}`}
                          actionLabel={`Send ${pendingCount} call card${pendingCount !== 1 ? 's' : ''}`}
                          onConfirm={async () => {
                            setLoadingSms(true);
                            try {
                              await onSend();
                              setLoadingSms(false);
                            } catch {
                              setLoadingSms(false);
                            }
                          }}
                          description={
                            !hasCallSheet
                              ? "You're about to send call cards, but a call sheet PDF doesn't exist. We'll generate one first and then send the call cards."
                              : isPdfOutdated
                                ? "You're about to send call cards, but the current call sheet PDF is outdated. We'll regenerate it first and then send the call cards."
                                : "You're about to send call cards. Make sure the information you're sending is correct."
                          }
                        >
                          <Button variant={'outline'} size={'compact'} className="px-2 gap-1 min-w-[158px]">
                            {loadingSms ? (
                              <>
                                <LoadingIndicator size="small" />
                              </>
                            ) : (
                              <>
                                <Icon name="send" className="w-[18px] h-[18px] text-lime-300 max-sm:text-xs" />
                                Send {pendingCount} call card
                                {pendingCount !== 1 && 's'}
                              </>
                            )}
                          </Button>
                        </AlertDialog>
                      )}

                      {!!pendingCount && !!checkedCount && (
                        <AlertDialog
                          title={`Send ${checkedCount} call card${checkedCount !== 1 ? 's' : ''}`}
                          actionLabel={`Send ${checkedCount} call card${checkedCount !== 1 ? 's' : ''}`}
                          onConfirm={async () => {
                            setLoadingSms(true);
                            try {
                              await onSend(true);
                              setLoadingSms(false);
                            } catch {
                              setLoadingSms(false);
                            }
                          }}
                          description={
                            !hasCallSheet
                              ? "You're about to send call cards, but a call sheet PDF doesn't exist. We'll generate one first and then send the call cards."
                              : isPdfOutdated
                                ? "You're about to send call cards, but the current call sheet PDF is outdated. We'll regenerate it first and then send the call cards."
                                : "You're about to send call cards. Make sure the information you're sending is correct."
                          }
                        >
                          <Button
                            variant={'outline'}
                            size={'compact'}
                            className="px-2 gap-1 min-w-[158px] max-sm:text-sm"
                          >
                            {loadingSms ? (
                              <>
                                <LoadingIndicator size="small" />
                              </>
                            ) : (
                              <>
                                <Icon name="send" className="w-[18px] h-[18px] text-lime-300 max-sm:text-xs" />
                                Send {checkedCount} call card
                                {checkedCount !== 1 && 's'}
                              </>
                            )}
                          </Button>
                        </AlertDialog>
                      )}

                      <span className="font-semibold text-sm text-white text-opacity-95 max-sm:text-xs">
                        {sentCount} of {count} sent
                      </span>

                      <span className="font-semibold text-sm text-white text-opacity-95 flex items-center gap-[6px] max-sm:text-xs">
                        <Icon name="checkmark-alternative" className="w-[18px] h-[18px] text-lime-300" />
                        {confirmedCount} of {count} confirmed
                      </span>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
