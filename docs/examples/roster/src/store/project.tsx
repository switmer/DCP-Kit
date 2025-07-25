import { create } from "zustand";

type State = {
  project: string | null;
  selectedPositions: {
    position: string;
    quantity: number;
    department: string;
  }[];
};

type Actions = {
  setProject: (value: string | null) => void;
  setSelectedPositions: (
    value: { position: string; quantity: number; department: string }[]
  ) => void;
};

export const useProjectStore = create<State & Actions>((set, get) => ({
  project: null,
  selectedPositions: [],
  setProject: (value) => set({ project: value }),
  setSelectedPositions: (value) => set({ selectedPositions: value }),
}));
