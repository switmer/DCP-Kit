'use client';

import { FC, useEffect, useState } from 'react';
import { CallSheet } from '@/components/blocks/CallSheet';
import { HistoricalCallSheet } from '@/components/blocks/CallSheet/HistoricalCallSheet';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { CallSheetType, EntityPointOfContactType, ProjectEntityType, ProjectType } from '@/types/type';

export type SheetWithAdditionalData =
  | (CallSheetType & {
      project: ProjectType & {
        project_entity: ProjectEntityType[] & {
          entity_point_of_contact: EntityPointOfContactType[];
        };
      };
    } & { company: { name: string; id: string } })
  | any;

type Props = {
  src?: string | null;
  shortId: string;
  sheet: SheetWithAdditionalData;
  // project: any;
  forceLive?: boolean;
};

export const RefreshableCallSheet: FC<Props> = (props) => {
  const [callSheetData, setCallSheetData] = useState<any>();
  const [signedUrl, setSignedUrl] = useState<any>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createClient();

  const refreshData = async () => {
    try {
      setIsRefreshing(true);

      //-- fetch updated call sheet data.
      const { data: refreshedCallSheetData, error } = await supabase
        .from('call_sheet')
        .select(
          `
          *,
          company (
            name,
            id
          ),
          project (*)
        `,
        )
        .eq('short_id', props.shortId)
        .single();

      if (!refreshedCallSheetData || error) {
        console.log('Error: ', error);
        toast.error('Something went wrong fetching call sheet data.');

        setIsRefreshing(false);

        return;
      }

      //-- get a fresh signed url.
      const { data: refreshedSrcData } = await supabase.storage
        .from('call-sheets')
        .createSignedUrl(refreshedCallSheetData.src ?? '', 86400);

      //-- update state with fresh data.
      setCallSheetData(refreshedCallSheetData);
      setSignedUrl(refreshedSrcData?.signedUrl || '');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Something went wrong refreshing sheet data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full">
      {/*<div className="mb-4 flex justify-end">*/}
      {/*  <Button*/}
      {/*    onClick={refreshData}*/}
      {/*    disabled={isRefreshing}*/}
      {/*    variant="outline"*/}
      {/*    size="sm"*/}
      {/*  >*/}
      {/*    {isRefreshing ? "Refreshing..." : "Refresh Data"}*/}
      {/*  </Button>*/}
      {/*</div>*/}

      {!callSheetData?.historical ? (
        <CallSheet src={signedUrl ?? props.src} sheet={callSheetData ?? props.sheet} refreshSheet={refreshData} />
      ) : (
        <HistoricalCallSheet src={props.src} sheet={callSheetData} />
      )}
    </div>
  );
};
