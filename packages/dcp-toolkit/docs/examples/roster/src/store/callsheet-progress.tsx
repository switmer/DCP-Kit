import { create } from "zustand";
import { CallSheetType } from "@/types/type";
import { createClient } from "@/lib/supabase/client";
import { useCompanyStore } from "./company";
import { Database } from "@/types/supabase";

type CallSheetStatus = Database["public"]["Enums"]["CallSheetStatus"];

type State = {
  callSheets: CallSheetType[];
  bulkUploadCallSheets: CallSheetType[];
  bulkUploadCallSheetsTotal: number;
};

type Actions = {
  setCallSheets: (value: CallSheetType[]) => void;
  setCallSheetPlaceholders: (n: number) => void;
  setBulkUploadCallSheets: (value: CallSheetType[]) => void;
  setBulkUploadCallSheetsPlaceholders: (n: number) => void;
  fetchCallSheets: () => Promise<void>;
  removeCallSheet: (id: string) => void;
  updateCallSheet: (id: string, updates: Partial<CallSheetType>) => void;
};

export const useCallSheetProgressStore = create<State & Actions>((set) => ({
  callSheets: [],
  bulkUploadCallSheets: [],
  bulkUploadCallSheetsTotal: 0,
  removeCallSheet: (id: string) =>
    set((state) => ({
      callSheets: state.callSheets.filter((c) => c.id !== id),
    })),
  setCallSheets: (value) => set({ callSheets: value }),
  setBulkUploadCallSheets: (value) => set({ bulkUploadCallSheets: value }),
  updateCallSheet: (id, updates) =>
    set((state) => ({
      callSheets: state.callSheets.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  fetchCallSheets: async () => {
    const activeCompany = useCompanyStore.getState().activeCompany;

    if (!activeCompany) return;

    const supabase = createClient();

    const { data } = await supabase
      .from("call_sheet")
      .select("*")
      .eq("company", activeCompany as string)
      .in("status", ["processing", "parsing"]);

    set((state) => {
      const currentSheets = state.callSheets;
      const newSheets = data?.filter((c) => !c.historical) ?? [];

      const updatedSheets = currentSheets
        ?.filter((s) => !!s?.id)
        .map((sheet) => {
          const newSheet = newSheets.find((s) => s.id === sheet.id);
          if (
            ["processing", "ready"].includes(sheet.status as CallSheetStatus) &&
            !newSheet
          ) {
            return {
              ...sheet,
              status: "ready" as CallSheetStatus,
            };
          }
          return newSheet || sheet;
        });

      const sheetsToAdd = newSheets.filter(
        (sheet) => !currentSheets.some((s) => s.id === sheet.id)
      );

      return { callSheets: [...updatedSheets, ...sheetsToAdd] };
    });

    const bulkUploadCallSheets = data?.filter((c) => !!c.historical) ?? [];

    set((state) => ({
      bulkUploadCallSheets,
      bulkUploadCallSheetsTotal: !bulkUploadCallSheets.length
        ? 0
        : state.bulkUploadCallSheetsTotal,
    }));
  },
  setCallSheetPlaceholders: (n) =>
    set((state) => ({
      callSheets: [...state.callSheets, ...Array(n).fill({})],
    })),
  setBulkUploadCallSheetsPlaceholders: (n) =>
    set((state) => ({
      bulkUploadCallSheets: [
        ...state.bulkUploadCallSheets,
        ...Array(n).fill({}),
      ],
      bulkUploadCallSheetsTotal: Math.max(state.bulkUploadCallSheetsTotal, n),
    })),
}));
