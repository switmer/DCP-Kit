import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export const checkCallSheetPdfTimestamp = async (
  supabase: SupabaseClient<Database>,
  callSheetId: string,
): Promise<{ isOutdated: boolean; latestPdfSrc: string | null }> => {
  if (!callSheetId) {
    console.error('No call sheet ID provided to checkCallSheetPdfTimestamp.');
    return { isOutdated: false, latestPdfSrc: null };
  }

  try {
    // get the call sheet record.
    const { data: callSheetData, error: callSheetError } = await supabase
      .from('call_sheet')
      .select('updated_at, src')
      .eq('id', callSheetId)
      .single();

    if (callSheetError || !callSheetData) {
      console.error('Error fetching call sheet:', callSheetError);
      return { isOutdated: false, latestPdfSrc: null };
    }

    // if there's no pdf source, there's nothing to compare.
    if (!callSheetData.src) {
      return { isOutdated: false, latestPdfSrc: null };
    }

    // get the latest generated pdf record for this call sheet.
    const { data: pdfData, error: pdfError } = await supabase
      .from('generated_call_sheet_pdfs')
      .select('call_sheet_updated_at, src')
      .eq('call_sheet_id', callSheetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pdfError || !pdfData) {
      // if there's no pdf record, consider it outdated if the call sheet has a src.
      return { isOutdated: true, latestPdfSrc: callSheetData.src };
    }

    // compare the timestamps.
    const isOutdated = callSheetData.updated_at !== pdfData.call_sheet_updated_at;

    return {
      isOutdated,
      latestPdfSrc: pdfData.src,
    };
  } catch (error) {
    console.error('Error checking call sheet PDF timestamp:', error);
    return { isOutdated: false, latestPdfSrc: null };
  }
};
