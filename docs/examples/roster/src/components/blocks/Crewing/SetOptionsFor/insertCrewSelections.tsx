import { toast } from "sonner";
import { fetchRequiredPositions } from "@/components/blocks/Crewing/SetOptionsFor/fetchRequiredPositions";
import { SupabaseClient } from "@supabase/supabase-js";
import { CrewingPositionType } from "@/types/type";

export const insertCrewSelections = async (
  supabase: SupabaseClient,
  project: string,
  crewSelections: {
    crewing_position: number;
    crew: number;
    priority: number;
  }[]
): Promise<{
  ok: boolean;
  newRequiredPositions?: CrewingPositionType[];
  error: any[];
}> => {
  try {
    const insertPromises = crewSelections.map((c) =>
      supabase.from("crewing_position_crew").insert(c)
    );
    const results = await Promise.all(insertPromises);
    const failedInserts = results.filter(({ error }) => error);

    if (failedInserts.length > 0) {
      return { ok: false, error: failedInserts };
    }

    const { data: newRequiredPositions, error: fetchReqPosError } =
      await fetchRequiredPositions(supabase, project as string);

    if (!newRequiredPositions || fetchReqPosError) {
      return { ok: false, error: [fetchReqPosError] };
    }

    return { ok: true, newRequiredPositions, error: [] };
  } catch (error) {
    return { ok: false, error: [error] };
  }
};
