import { SimulationParams } from "@/engine/types";

export interface ParamSliderDef {
  key: string;
  group: string;
  min: number;
  max: number;
  step: number;
  label?: string;
  unit?: string;
  defaultValue?: number;
}

export const DEFAULT_PARAM_SLIDERS: ParamSliderDef[] = [
  { key: "initialStartups", min: 5, max: 50, step: 1, group: "startups", unit: "integer", defaultValue: 28 },
  { key: "startupInitialCapital", min: 30000, max: 200000, step: 5000, group: "startups", unit: "currency", defaultValue: 115000 },
  { key: "startupInnovationCapacity", min: 5, max: 30, step: 1, group: "startups", unit: "integer", defaultValue: 18 },
  { key: "initialBigTechs", min: 1, max: 6, step: 1, group: "bigtechs", unit: "integer", defaultValue: 4 },
  { key: "bigTechInitialCapital", min: 500000, max: 3000000, step: 100000, group: "bigtechs", unit: "currency", defaultValue: 1800000 },
  { key: "bigTechInnovationCapacity", min: 5, max: 20, step: 1, group: "bigtechs", unit: "integer", defaultValue: 12 },
  { key: "complianceCostHighRisk", min: 0, max: 100000, step: 5000, group: "regulatory", unit: "currency", defaultValue: 50000 },
  { key: "auditProbability", min: 0, max: 0.6, step: 0.01, group: "regulatory", unit: "percent", defaultValue: 0.3 },
  { key: "fineSeverity", min: 0, max: 500000, step: 10000, group: "regulatory", unit: "currency", defaultValue: 250000 },
  { key: "sandboxCapacity", min: 0, max: 20, step: 1, group: "regulatory", unit: "integer", defaultValue: 10 },
  { key: "socialSensibility", min: 1, max: 30, step: 1, group: "economic", unit: "integer", defaultValue: 16 },
  { key: "lgpdIncidentChance", min: 0, max: 0.3, step: 0.01, group: "economic", unit: "percent", defaultValue: 0.15 },
  { key: "trustRevenueFloor", min: 0.1, max: 0.7, step: 0.05, group: "economic", unit: "percent", defaultValue: 0.4 },
];

export const GROUP_LABELS: Record<string, string> = {
  startups: "Startups",
  bigtechs: "Big Techs",
  regulatory: "Regulatório",
  economic: "Econômico",
  general: "Geral",
};

export type PresetId = "conservative" | "base" | "optimistic";

export interface PresetDef {
  name: string;
  description: string;
  params: Partial<SimulationParams>;
}

export const PRESETS: Record<PresetId, PresetDef> = {
  conservative: {
    name: "Conservador",
    description: "Regulação rigorosa, prioriza conformidade e proteção social",
    params: {
      initialStartups: 15, initialBigTechs: 2,
      startupInitialCapital: 80000, bigTechInitialCapital: 2000000,
      startupInnovationCapacity: 12, bigTechInnovationCapacity: 8,
      complianceCostHighRisk: 80000, auditProbability: 0.35,
      fineSeverity: 400000, sandboxCapacity: 3,
      socialSensibility: 20, lgpdIncidentChance: 0.03, trustRevenueFloor: 0.5,
    },
  },
  base: {
    name: "Base",
    description: "Equilíbrio entre inovação e regulação",
    params: {
      initialStartups: 20, initialBigTechs: 2,
      startupInitialCapital: 60000, bigTechInitialCapital: 1200000,
      startupInnovationCapacity: 15, bigTechInnovationCapacity: 10,
      complianceCostHighRisk: 25000, auditProbability: 0.15,
      fineSeverity: 100000, sandboxCapacity: 8,
      socialSensibility: 12, lgpdIncidentChance: 0.06, trustRevenueFloor: 0.4,
    },
  },
  optimistic: {
    name: "Otimista",
    description: "Inovação acelerada, regulação mínima, alto potencial de crescimento",
    params: {
      initialStartups: 30, initialBigTechs: 3,
      startupInitialCapital: 100000, bigTechInitialCapital: 1500000,
      startupInnovationCapacity: 22, bigTechInnovationCapacity: 15,
      complianceCostHighRisk: 10000, auditProbability: 0.08,
      fineSeverity: 50000, sandboxCapacity: 15,
      socialSensibility: 6, lgpdIncidentChance: 0.1, trustRevenueFloor: 0.3,
    },
  },
};
