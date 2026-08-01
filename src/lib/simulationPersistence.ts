import type { SimulationParams, SimulationState } from "@/engine/types";

const STORAGE_KEY = "simulador-pl2338-history";

export interface SavedSimulation {
  id: string;
  name: string;
  playbookId: string;
  timestamp: number;
  params: SimulationParams;
  history: SimulationState[];
  turn: number;
  fullReport?: string;
  aiGenerationSource?: "ai" | "heuristic";
  computationalTime?: number;
}

export function loadSavedSimulations(): SavedSimulation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveSimulation(
  name: string,
  playbookId: string,
  params: SimulationParams,
  history: SimulationState[],
  turn: number,
  fullReport?: string,
  computationalTime?: number,
  aiGenerationSource?: "ai" | "heuristic",
): SavedSimulation {
  const saved: SavedSimulation = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    playbookId,
    timestamp: Date.now(),
    params,
    history,
    turn,
    fullReport,
    computationalTime,
    aiGenerationSource,
  };
  const all = loadSavedSimulations();
  all.push(saved);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    console.warn("localStorage quota exceeded");
  }
  return saved;
}

export function deleteSavedSimulation(id: string): void {
  const all = loadSavedSimulations().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    console.warn("localStorage write failed");
  }
}

export function getSavedSimulation(id: string): SavedSimulation | undefined {
  return loadSavedSimulations().find((s) => s.id === id);
}
