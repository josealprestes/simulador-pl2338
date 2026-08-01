import type { SavedSimulation } from "@/lib/simulationPersistence";
import { formatCurrencyShort, formatKPI } from "@/lib/format";

export interface CriterionResult {
  id: string;
  label: string;
  question: string;
  best?: SavedSimulation;
  values: Array<{
    sim: SavedSimulation;
    value: number;
    display: string;
    note: string;
  }>;
}

export function getFinalState(sim: SavedSimulation) {
  return sim.history[sim.history.length - 1];
}

export function getComplianceRatio(sim: SavedSimulation): number {
  const finalState = getFinalState(sim);
  if (!finalState) return 0;
  if (typeof finalState.compliantProductsRatio === "number") return finalState.compliantProductsRatio;
  if (!finalState.totalProducts) return 0;
  return finalState.compliantProducts / finalState.totalProducts;
}

export function getRiskScore(sim: SavedSimulation): number {
  const finalState = getFinalState(sim);
  if (!finalState) return Number.POSITIVE_INFINITY;
  const hhiPressure = Math.max(0, Math.round(finalState.hhi) - 1800) / 100;
  const trustPressure = Math.max(0, 70 - Math.round(finalState.socialTrust));
  const incidentPressure = (finalState.systemicIncidentCount ?? 0) * 15;
  const compliancePressure = Math.max(0, 0.75 - getComplianceRatio(sim)) * 100;
  return hhiPressure + trustPressure + incidentPressure + compliancePressure;
}

export function buildCriterionResults(selectedSims: SavedSimulation[]): CriterionResult[] {
  const criteria = [
    {
      id: "innovation",
      label: "Inovação",
      question: "Quem preserva melhor entrada e oferta?",
      value: (sim: SavedSimulation) => {
        const finalState = getFinalState(sim);
        return (finalState?.activeStartups ?? 0) * 2 + (finalState?.totalProducts ?? 0);
      },
      display: (sim: SavedSimulation) => {
        const finalState = getFinalState(sim);
        return `${finalState?.activeStartups ?? 0} startups, ${finalState?.totalProducts ?? 0} produtos`;
      },
      note: "Mais startups e produtos indicam maior espaço competitivo para inovação.",
      higherIsBetter: true,
    },
    {
      id: "competition",
      label: "Concorrência",
      question: "Quem reduz melhor concentração?",
      value: (sim: SavedSimulation) => Math.round(getFinalState(sim)?.hhi ?? Number.POSITIVE_INFINITY),
      display: (sim: SavedSimulation) => formatKPI(getFinalState(sim)?.hhi ?? 0, "hhi"),
      note: "HHI menor reduz sinal de consolidação competitiva.",
      higherIsBetter: false,
    },
    {
      id: "trust",
      label: "Confiança",
      question: "Quem preserva melhor legitimidade social?",
      value: (sim: SavedSimulation) => Math.round(getFinalState(sim)?.socialTrust ?? 0),
      display: (sim: SavedSimulation) => `${Math.round(getFinalState(sim)?.socialTrust ?? 0)}%`,
      note: "Confiança maior reduz risco de rejeição social e crise de legitimidade.",
      higherIsBetter: true,
    },
    {
      id: "cost",
      label: "Custo regulatório",
      question: "Quem exige menor custo sistêmico?",
      value: (sim: SavedSimulation) => Number(getFinalState(sim)?.cloudDrain ?? 0),
      display: (sim: SavedSimulation) => formatCurrencyShort(Number(getFinalState(sim)?.cloudDrain ?? 0)),
      note: "Dreno menor tende a preservar capital para investimento e adaptação.",
      higherIsBetter: false,
    },
    {
      id: "risk",
      label: "Risco",
      question: "Quem deixa menos pressão sistêmica?",
      value: getRiskScore,
      display: (sim: SavedSimulation) => `${Math.round(getRiskScore(sim))} pts`,
      note: "Combina concentração, confiança, conformidade e incidentes sistêmicos.",
      higherIsBetter: false,
    },
  ];

  return criteria.map((criterion) => {
    const sorted = [...selectedSims].sort((a, b) => {
      const diff = criterion.value(a) - criterion.value(b);
      return criterion.higherIsBetter ? -diff : diff;
    });

    return {
      id: criterion.id,
      label: criterion.label,
      question: criterion.question,
      best: sorted[0],
      values: selectedSims.map((sim) => ({
        sim,
        value: criterion.value(sim),
        display: criterion.display(sim),
        note: criterion.note,
      })),
    };
  });
}

export function buildScenarioTradeoff(sim: SavedSimulation): string {
  const finalState = getFinalState(sim);
  if (!finalState) return "Sem dados suficientes.";

  const strengths: string[] = [];
  const cautions: string[] = [];

  if (finalState.socialTrust >= 70) strengths.push("confiança preservada");
  else cautions.push("confiança sob pressão");

  if (finalState.hhi <= 1800) strengths.push("concentração moderada");
  else if (finalState.hhi > 2500) cautions.push("concentração elevada");

  if (finalState.activeStartups >= 5) strengths.push("base de startups ativa");
  else cautions.push("entrada fragilizada");

  if ((finalState.cloudDrain ?? 0) <= (finalState.avgCapital ?? Number.POSITIVE_INFINITY)) {
    strengths.push("custo administrável");
  } else {
    cautions.push("dreno relevante frente ao capital médio");
  }

  const good = strengths.length > 0 ? strengths.join(", ") : "sem vantagem dominante";
  const risk = cautions.length > 0 ? cautions.join(", ") : "sem cautela crítica aparente";
  return `Ganha em ${good}; exige atenção em ${risk}.`;
}
