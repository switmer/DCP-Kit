import { createClient } from "@/lib/supabase/client";
import { CrewingPositionType } from "@/types/type";
import { toast } from "sonner";
import { create } from "zustand";

type State = {
  project?: string | null;
  requiredPositions: CrewingPositionType[];
  settingCrewFor?: CrewingPositionType | null;
  focusCrewingPosition?: CrewingPositionType | null;
  crewingPositions?: CrewingPositionType[] | null;
};

type Actions = {
  setProject: (value?: string | null) => void;
  setRequiredPositions: (value: CrewingPositionType[]) => void;
  setSettingCrewFor: (value?: CrewingPositionType | null) => void;
  setFocusCrewingPosition: (value?: CrewingPositionType | null) => void;
  setCrewingPositions: (value: CrewingPositionType[]) => void;
  fetchPositions: () => Promise<void>;
};

export const useCrewingStore = create<State & Actions>((set, get) => ({
  project: null,
  requiredPositions: [],
  settingCrewFor: null,
  focusCrewingPosition: null,
  crewingPositions: [],
  setProject: (value) => set({ project: value }),
  setRequiredPositions: (value) => set({ requiredPositions: value }),
  setSettingCrewFor: (value) => set({ settingCrewFor: value }),
  setFocusCrewingPosition: (value?: CrewingPositionType | null) =>
    set({ focusCrewingPosition: value }),
  setCrewingPositions: (value: CrewingPositionType[]) =>
    set({ crewingPositions: value }),
  fetchPositions: async () => {
    const { project } = get();

    if (!project) return;

    const supabase = createClient();

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
        .order("id", { ascending: false })
        .eq("project", project);

      if (error) {
        toast.error("Something went wrong. Please try again.");
        set({ requiredPositions: [] });
      } else {
        set({ requiredPositions: data ?? [] });
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      set({ requiredPositions: [] });
    }
  },
}));
