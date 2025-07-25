import { toast } from "sonner";
import { SupabaseClient } from "@supabase/supabase-js";
import { CrewingPositionType } from "@/types/type";

export const fetchRequiredPositions = async (
  supabase: SupabaseClient,
  project: string
): Promise<{ data: CrewingPositionType[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("crewing_position")
      .select(
        `
        *,
        crewing_position_crew!crewing_position_crew_crewing_position_fkey(
          *,
          crewing_contact_attempt (
            *
          )
        )
          `
      )
      .eq("project", project!);

    if (!data || !!error) {
      console.error("Error: ", error);
      toast.error("Something went wrong. Please try again.");

      return { data: null, error: error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error };
  }
};
