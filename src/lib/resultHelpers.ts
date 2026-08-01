import type { SimulationState } from "@/engine/types";
import { formatKPI, formatCurrencyShort } from "@/lib/format";

export interface CriticalEventView {
  turn: number;
  type: string;
  text: string;
}

export interface DecisionAxis {
  title: string;
  value: string;
  finding: string;
  implication: string;
  tone: "success" | "warning" | "danger" | "info";
}

export function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function buildDecisionAxes(
  first: SimulationState,
  finalState: SimulationState,
  events: CriticalEventView[],
): DecisionAxis[] {
  const startupDelta = finalState.activeStartups - first.activeStartups;
  const trustDelta = Math.round(finalState.socialTrust - first.socialTrust);
  const hhiDelta = Math.round(finalState.hhi - first.hhi);
  const complianceRatio = Number(finalState.compliantProductsRatio ?? 0);
  const hasSystemicEvent = events.some((event) =>
    ["CRASH", "TRUST_DROP", "MONOPOLY", "BIG_TECH_FAILURE"].includes(event.type),
  );

  return [
    {
      title: "Concorrência e concentração",
      value: formatKPI(finalState.hhi, "hhi"),
      finding:
        finalState.hhi > 2500
          ? `O proxy de concentração de capital (HHI) encerrou em faixa alta (${signed(hhiDelta)}), segundo referência indicativa não calibrada para este proxy.`
          : `O proxy de concentração de capital (HHI) encerrou em faixa baixa ou moderada (${signed(hhiDelta)}), segundo referência indicativa não calibrada para este proxy.`,
      implication:
        finalState.hhi > 2500
          ? "A alta do proxy patrimonial sugere atenção à consolidação de capital; nenhuma recomendação regulatória é derivada apenas deste proxy."
          : "A simulação não aponta concentração extrema como principal risco final, segundo o proxy de capital.",
      tone: finalState.hhi > 2500 ? "danger" : finalState.hhi > 1800 ? "warning" : "success",
    },
    {
      title: "Inovação e entrada",
      value: `${finalState.activeStartups} startups`,
      finding:
        startupDelta < 0
          ? `O ecossistema perdeu ${Math.abs(startupDelta)} startup(s) ao longo da simulação.`
          : startupDelta > 0
          ? `O ecossistema ganhou ${startupDelta} startup(s) ao longo da simulação.`
          : `O número de startups manteve-se estável (0 de variação) ao longo da simulação.`,
      implication:
        startupDelta < 0
          ? "A redução é compatível com uma ou mais pressões previstas no modelo, mas a trajetória isolada não identifica a causa."
          : "O número final de entrantes foi igual ou superior ao inicial neste cenário.",
      tone: startupDelta < 0 ? "warning" : "success",
    },
    {
      title: "Confiança social",
      value: `${Math.round(finalState.socialTrust)}%`,
      finding: `Confiança terminou com variação de ${signed(trustDelta)} ponto(s).`,
      implication:
        finalState.socialTrust < 40
          ? "O cenário apresenta queda elevada de confiança e deve ser examinado com atenção aos eventos e parâmetros associados."
          : finalState.socialTrust < 70
            ? "A confiança encerrou em faixa intermediária; a série completa deve ser examinada."
            : "A confiança encerrou em patamar alto; a série completa deve ser examinada.",
      tone: finalState.socialTrust < 40 ? "danger" : finalState.socialTrust < 70 ? "warning" : "success",
    },
    {
      title: "Drenagem de infraestrutura",
      value: formatCurrencyShort(finalState.cloudDrain ?? 0),
      finding: `Dreno acumulado de infraestrutura em nuvem observado: ${formatKPI(finalState.cloudDrain ?? 0, "currency")}.`,
      implication:
        (finalState.cloudDrain ?? 0) > (finalState.avgCapital ?? 0)
          ? "O dreno de nuvem é relevante frente ao capital médio e merece teste de sensibilidade."
          : "O dreno de nuvem aparece administrável frente ao capital médio final.",
      tone: (finalState.cloudDrain ?? 0) > (finalState.avgCapital ?? 0) ? "warning" : "info",
    },
    {
      title: "Risco sistêmico",
      value: hasSystemicEvent ? "Com eventos" : "Sem evento crítico",
      finding:
        events.length > 0
          ? `${events.length} evento(s) crítico(s) foram registrados.`
          : "Nenhum evento crítico foi registrado pelo motor.",
      implication:
        hasSystemicEvent
          ? "A leitura final deve ser tratada como cenário de atenção, não como equilíbrio estável."
          : complianceRatio > 0 && complianceRatio < 0.6
            ? "Mesmo sem evento crítico, a conformidade baixa recomenda cautela."
            : "Não houve sinal sistêmico forte nos eventos registrados.",
      tone: hasSystemicEvent ? "danger" : complianceRatio > 0 && complianceRatio < 0.6 ? "warning" : "success",
    },
  ];
}

export function buildExecutiveSummary(
  first: SimulationState,
  finalState: SimulationState,
  events: CriticalEventView[],
  maxTurns: number,
): { verdict: string; whyItMatters: string; recommendation: string; caution: string } {
  const axes = buildDecisionAxes(first, finalState, events);
  const dangerCount = axes.filter((axis) => axis.tone === "danger").length;
  const warningCount = axes.filter((axis) => axis.tone === "warning").length;

  const verdict =
    dangerCount > 0
      ? "Cenário com múltiplos sinais de atenção"
      : warningCount >= 2
        ? "Cenário com sinais de atenção pontuais"
        : "Cenário com poucos sinais críticos nas métricas selecionadas";

  return {
    verdict,
    whyItMatters:
      `Após ${finalState.turn} turno(s), a simulação combina proxy de concentração de capital (HHI) ${formatKPI(finalState.hhi, "hhi")}, confiança social de ${Math.round(finalState.socialTrust)}% e ${finalState.activeStartups} startup(s) ativas. Esses indicadores resumem as trajetórias produzidas pelo cenário e devem ser comparados com outras parametrizações e com evidência externa.`,
    recommendation:
      dangerCount > 0
        ? "Antes de usar este cenário como uma referência teórica para outras simulações, rode uma comparação com parâmetros menos extremos e examine os eventos críticos."
        : warningCount >= 2
          ? "Use este cenário como hipótese intermediária e compare com uma versão mais conservadora e outra mais pró-inovação."
          : "Use este cenário como linha de base para comparação, mantendo análise de sensibilidade nos parâmetros de auditoria, multas e sandbox.",
    caution:
      "Esta síntese é um apoio decisório baseado em regras e na trajetória simulada. Ela não substitui análise jurídica, econômica ou validação empírica do caso concreto.",
  };
}

export function buildReportText(
  summary: { verdict: string; whyItMatters: string; recommendation: string; caution: string },
  axes: DecisionAxis[],
): string {
  const axisText = axes
    .map((axis) => `${axis.title}: ${axis.finding} ${axis.implication}`)
    .join("\n");

  return [
    `Veredito: ${summary.verdict}`,
    summary.whyItMatters,
    axisText,
    `Recomendação: ${summary.recommendation}`,
    `Cautela: ${summary.caution}`,
  ].join("\n");
}
