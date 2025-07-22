import { create } from "zustand";
import Cookies from "js-cookie";

type State = {
  activeCompany: string | null;
};

type Actions = {
  setActiveCompany: (value: string) => void;
};

export const useCompanyStore = create<State & Actions>((set) => ({
  activeCompany:
    typeof window !== "undefined" ? Cookies.get("activeCompany") || null : null,
  setActiveCompany: (value: string) => {
    set({ activeCompany: value });
    Cookies.set("activeCompany", value, { path: "/" });
  },
}));
