import { SupabaseClient } from "@supabase/supabase-js";

export const deleteAllCrewForPosition = async (
  supabase: SupabaseClient,
  positionId: number
): Promise<{ ok: boolean; error: any }> => {
  try {
    const { data: currentCrew, error: fetchError } = await supabase
      .from("crewing_position_crew")
      .select("id")
      .eq("crewing_position", positionId);

    if (fetchError) {
      return { ok: false, error: fetchError };
    }

    if (currentCrew && currentCrew.length > 0) {
      const deletePromises = currentCrew.map((record) =>
        supabase.from("crewing_position_crew").delete().eq("id", record.id)
      );

      await Promise.all(deletePromises);

      return { ok: true, error: null };
    }

    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error };
  }
};
