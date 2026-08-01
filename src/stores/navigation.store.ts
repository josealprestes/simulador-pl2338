import { create } from "zustand";

export type Screen =
  | "HOME"
  | "SETUP"
  | "SIMULATION"
  | "REPORT"
  | "RESULT"
  | "ANALYSIS"
  | "COMPARISON"
  | "METHODOLOGY"
  | "HISTORY"
  | "AI_CONFIG";

interface NavigationStore {
  screen: Screen;
  setScreen: (screen: Screen) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  screen: "HOME",
  setScreen: (screen) => set({ screen }),
}));
