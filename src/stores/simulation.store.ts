import { create } from "zustand";
import type { SimulationParams, SimulationState } from "@/engine/types";
import { Simulation } from "@/engine/Simulation";

export interface SimulationStats {
  startups: number;
  bigTechs: number;
  trust: number;
  avgRunway: number;
  avgBurnRate: number;
  cloudDrain: number;
  hhi: number;
  totalProducts: number;
  compliantProducts: number;
  nonCompliantProducts: number;
  stateFundsUsed: number;
  [key: string]: any;
}

interface SimulationStore {
  selectedPlaybook: string | null;
  currentPlaybookData: Record<string, unknown> | null;
  setupStep: number;
  params: SimulationParams | null;
  initialParams: SimulationParams | null;
  simulation: Simulation | null;
  turn: number;
  history: SimulationState[];
  events: Record<string, unknown>[];
  criticalEvents: Record<string, unknown>[];
  computationalTime: number;
  stats: SimulationStats;
  isAutoPlaying: boolean;
  autoPlaySpeed: number;
  isJumping: boolean;
  isStarting: boolean;
  isGeneratingAI: boolean;
  aiReportText: string;
  aiGenerationSource: "" | "ai" | "heuristic";
  reportHash: string;
  validationResult: Record<string, unknown> | null;
  calibrationLog: string[];
  calibrationYear: number;
  baseline: Record<string, unknown> | null;
  selectedTurn: Record<string, unknown> | null;
  isDrawerOpen: boolean;
  narratives: Record<string, unknown>;
  showExportModal: boolean;
  showSaveModal: boolean;
  wasSkipped: boolean;

  setSelectedPlaybook: (id: string) => void;
  setCurrentPlaybookData: (data: Record<string, unknown>) => void;
  setSetupStep: (step: number) => void;
  setParams: (params: SimulationParams) => void;
  updateParam: (key: string, value: unknown) => void;
  setInitialParams: (params: SimulationParams) => void;
  setSimulation: (sim: Simulation | null) => void;
  runTurn: () => Promise<void>;
  setTurn: (turn: number) => void;
  setHistory: (history: SimulationState[]) => void;
  setEvents: (events: Record<string, unknown>[]) => void;
  setCriticalEvents: (events: Record<string, unknown>[]) => void;
  setComputationalTime: (time: number) => void;
  setStats: (stats: Partial<SimulationStats>) => void;
  setIsAutoPlaying: (v: boolean) => void;
  setAutoPlaySpeed: (speed: number) => void;
  setIsJumping: (v: boolean) => void;
  setIsStarting: (v: boolean) => void;
  setIsGeneratingAI: (v: boolean) => void;
  setAiReportText: (text: string) => void;
  setAiGenerationSource: (source: "" | "ai" | "heuristic") => void;
  setReportHash: (hash: string) => void;
  setValidationResult: (result: Record<string, unknown>) => void;
  addCalibrationLog: (entry: string) => void;
  setCalibrationYear: (year: number) => void;
  setBaseline: (baseline: Record<string, unknown> | null) => void;
  setSelectedTurn: (turn: Record<string, unknown> | null) => void;
  setIsDrawerOpen: (open: boolean) => void;
  setNarratives: (narratives: Record<string, unknown>) => void;
  setShowExportModal: (show: boolean) => void;
  setShowSaveModal: (show: boolean) => void;
  setWasSkipped: (v: boolean) => void;
  jumpToEnd: () => Promise<void>;
  reset: () => void;
}

const defaultStats: SimulationStats = {
  startups: 0,
  bigTechs: 0,
  trust: 100,
  avgRunway: Infinity,
  avgBurnRate: 0,
  cloudDrain: 0,
  hhi: 0,
  totalProducts: 0,
  compliantProducts: 0,
  nonCompliantProducts: 0,
  stateFundsUsed: 0,
};

export const useSimulationStore = create<SimulationStore>((set, get) => {
  let turnRunning = false;
  return {
  selectedPlaybook: null,
  currentPlaybookData: null,
  setupStep: 1,
  simulation: null,
  params: null,
  initialParams: null,
  turn: 0,
  history: [],
  events: [],
  criticalEvents: [],
  computationalTime: 0,
  stats: { ...defaultStats },
  isAutoPlaying: false,
  autoPlaySpeed: 500,
  isJumping: false,
  isStarting: false,
  isGeneratingAI: false,
  aiReportText: "",
  aiGenerationSource: "",
  reportHash: "",
  validationResult: null,
  calibrationLog: [],
  calibrationYear: 2024,
  baseline: null,
  selectedTurn: null,
  isDrawerOpen: false,
  narratives: {},
  showExportModal: false,
  showSaveModal: false,
  wasSkipped: false,

  setSelectedPlaybook: (id) => set({ selectedPlaybook: id }),
  setCurrentPlaybookData: (data) => set({ currentPlaybookData: data }),
  setSetupStep: (step) => set({ setupStep: step }),
  setParams: (params) => set({ params }),
  updateParam: (key, value) =>
    set((s) => ({ params: s.params ? { ...s.params, [key]: value } : null })),
  setInitialParams: (params) => set({ initialParams: params }),
  setSimulation: (sim) => set({ simulation: sim }),
  runTurn: async () => {
    if (turnRunning) return;
    turnRunning = true;
    try {
      const state = get();
      let sim = state.simulation;
      if (!sim) {
        if (!state.params) return;
        sim = new Simulation(state.params, undefined, state.currentPlaybookData);
        set({ simulation: sim });
      }
      if (state.turn >= (state.params?.maxTurns ?? 50)) return;
      await sim.runTurn();
      const lastHistory = sim.history[sim.history.length - 1];
      if (lastHistory) {
        set({
          turn: sim.turn,
          history: [...sim.history],
          computationalTime: sim.computationalTime,
          stats: {
            ...lastHistory,
            startups: lastHistory.activeStartups,
            bigTechs: lastHistory.activeBigTechs,
            trust: Math.round(lastHistory.socialTrust),
            hhi: Math.round(lastHistory.hhi),
            totalProducts: lastHistory.totalProducts,
            compliantProducts: lastHistory.compliantProducts,
            nonCompliantProducts: lastHistory.nonCompliantProducts,
            stateFundsUsed: lastHistory.stateFundsUsed,
            cloudDrain: lastHistory.cloudDrain,
            avgRunway: lastHistory.avgRunway,
            avgBurnRate: lastHistory.avgBurnRate,
          },
        });
      }
    } finally {
      turnRunning = false;
    }
  },
  jumpToEnd: async () => {
    if (turnRunning) return;
    turnRunning = true;
    try {
      const state = get();
      let sim = state.simulation;
      if (!sim) {
        if (!state.params) return;
        sim = new Simulation(state.params, undefined, state.currentPlaybookData);
        set({ simulation: sim });
      }
      const maxTurns = state.params?.maxTurns ?? 50;
      
      set({ isJumping: true });
      
      while (get().turn < maxTurns) {
        await sim.runTurn();
        const currentTurn = get().turn;
        if (currentTurn >= maxTurns) break;
        set({
          turn: sim.turn,
          history: [...sim.history],
          computationalTime: sim.computationalTime,
        });
      }
      
      // Final update to ensure stats are synced
      const lastHistory = sim.history[sim.history.length - 1];
      set({
        turn: sim.turn,
        history: [...sim.history],
        computationalTime: sim.computationalTime,
        stats: lastHistory ? {
          ...lastHistory,
          startups: lastHistory.activeStartups,
          bigTechs: lastHistory.activeBigTechs,
          trust: Math.round(lastHistory.socialTrust),
          hhi: Math.round(lastHistory.hhi),
          totalProducts: lastHistory.totalProducts,
          compliantProducts: lastHistory.compliantProducts,
          nonCompliantProducts: lastHistory.nonCompliantProducts,
          stateFundsUsed: lastHistory.stateFundsUsed,
          cloudDrain: lastHistory.cloudDrain,
          avgRunway: lastHistory.avgRunway,
          avgBurnRate: lastHistory.avgBurnRate,
        } : { ...defaultStats },
        isJumping: false,
      });
    } finally {
      turnRunning = false;
    }
  },
  setTurn: (turn) => set({ turn }),
  setHistory: (history) => set({ history }),
  setEvents: (events) => set({ events }),
  setCriticalEvents: (events) => set({ criticalEvents: events }),
  setComputationalTime: (time) => set({ computationalTime: time }),
  setStats: (stats) => set((s) => ({ stats: { ...s.stats, ...stats } })),
  setIsAutoPlaying: (v) => set({ isAutoPlaying: v }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
  setIsJumping: (v) => set({ isJumping: v }),
  setIsStarting: (v) => set({ isStarting: v }),
  setIsGeneratingAI: (v) => set({ isGeneratingAI: v }),
  setAiReportText: (text) => set({ aiReportText: text }),
  setAiGenerationSource: (source) => set({ aiGenerationSource: source }),
  setReportHash: (hash) => set({ reportHash: hash }),
  setValidationResult: (result) => set({ validationResult: result }),
  addCalibrationLog: (entry) =>
    set((s) => ({ calibrationLog: [...s.calibrationLog, entry] })),
  setCalibrationYear: (year) => set({ calibrationYear: year }),
  setBaseline: (baseline) => set({ baseline }),
  setSelectedTurn: (turn) => set({ selectedTurn: turn }),
  setIsDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setNarratives: (narratives) => set({ narratives }),
  setShowExportModal: (show) => set({ showExportModal: show }),
  setShowSaveModal: (show) => set({ showSaveModal: show }),
  setWasSkipped: (v) => set({ wasSkipped: v }),
  reset: () =>
    set({
      selectedPlaybook: null,
      currentPlaybookData: null,
      setupStep: 1,
      simulation: null,
      params: null,
      initialParams: null,
      turn: 0,
      history: [],
      events: [],
      criticalEvents: [],
      computationalTime: 0,
      stats: { ...defaultStats },
      isAutoPlaying: false,
      autoPlaySpeed: 500,
      isJumping: false,
      isStarting: false,
      isGeneratingAI: false,
      aiReportText: "",
      aiGenerationSource: "",
      reportHash: "",
      validationResult: null,
      calibrationLog: [],
      calibrationYear: 2024,
      baseline: null,
      selectedTurn: null,
      isDrawerOpen: false,
      narratives: {},
      showExportModal: false,
      showSaveModal: false,
      wasSkipped: false,
    }),
  };
});
