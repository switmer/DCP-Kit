import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export const updateCallSheetTimestamp = async (
  supabase: SupabaseClient<Database>,
  callSheetId: string,
  callback?: () => void,
): Promise<void> => {
  if (!callSheetId) {
    console.error('No call sheet ID provided to updateCallSheetTimestamp.');
    return;
  }

  try {
    const { error } = await supabase
      .from('call_sheet')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', callSheetId);

    if (error) {
      console.error('Error updating call sheet timestamp:', error);
    } else if (callback) {
      // if a callback was provided and the update was successful, call it.
      callback();
    }
  } catch (error) {
    console.error('Error updating call sheet timestamp:', error);
  }
};
