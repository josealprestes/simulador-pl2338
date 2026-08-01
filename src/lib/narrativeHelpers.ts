import type { CriticalEvent, SimulationState } from "@/engine/types";
import { formatKPI } from "@/lib/format";

export interface NarrativeSignal {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "info";
}

export function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function getRecentEvents(events: CriticalEvent[], turn: number): CriticalEvent[] {
  return events
    .filter((event) => event.turn >= Math.max(1, turn - 4))
    .slice(-4)
    .reverse();
}

export function buildNarrativeSignals(history: SimulationState[], events: CriticalEvent[]): NarrativeSignal[] {
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  if (!latest) {
    return [
      {
        label: "Estado",
        value: "Pronto",
        detail: "Execute o primeiro turno para gerar sinais de mercado, confiança e concentração.",
        tone: "info",
      },
    ];
  }

  const trust = Math.round(latest.socialTrust ?? 0);
  const hhi = Math.round(latest.hhi ?? 0);
  const startups = latest.activeStartups ?? 0;
  const products = latest.totalProducts ?? 0;
  const previousTrust = Math.round(previous?.socialTrust ?? trust);
  const previousHhi = Math.round(previous?.hhi ?? hhi);
  const previousStartups = previous?.activeStartups ?? startups;
  const previousProducts = previous?.totalProducts ?? products;
  const recentEvents = getRecentEvents(events, latest.turn);

  const signals: NarrativeSignal[] = [
    {
      label: "Confiança social",
      value: `${trust}%`,
      detail:
        trust < 40
          ? `Zona crítica: ${signed(trust - previousTrust)} ponto(s) desde o turno anterior.`
          : trust < 70
            ? `Zona de atenção: ${signed(trust - previousTrust)} ponto(s) desde o turno anterior.`
            : `Estável em patamar saudável: ${signed(trust - previousTrust)} ponto(s) desde o turno anterior.`,
      tone: trust < 40 ? "danger" : trust < 70 ? "warning" : "success",
    },
    {
      label: "Concentração",
      value: formatKPI(hhi, "hhi"),
      detail:
        hhi > 2500
          ? `Acima do limiar de concentração. Variação: ${signed(hhi - previousHhi)} HHI.`
          : `Abaixo do limiar crítico. Variação: ${signed(hhi - previousHhi)} HHI.`,
      tone: hhi > 2500 ? "danger" : hhi > 1800 ? "warning" : "success",
    },
    {
      label: "Demografia empresarial",
      value: `${startups} startups`,
      detail:
        startups < previousStartups
          ? `Perda de ${previousStartups - startups} startup(s) no último turno.`
          : startups > previousStartups
            ? `Entrada líquida de ${startups - previousStartups} startup(s).`
            : "Sem mudança líquida no número de startups.",
      tone: startups < previousStartups ? "warning" : "info",
    },
    {
      label: "Produtos no mercado",
      value: `${products}`,
      detail:
        products < previousProducts
          ? `Contração de ${previousProducts - products} produto(s) ofertado(s).`
          : products > previousProducts
            ? `Expansão de ${products - previousProducts} produto(s) ofertado(s).`
            : "Oferta total sem variação no último turno.",
      tone: products < previousProducts ? "warning" : "info",
    },
  ];

  if (recentEvents.length > 0) {
    signals.unshift({
      label: "Evento crítico recente",
      value: `T${recentEvents[0].turn}`,
      detail: recentEvents[0].text,
      tone: recentEvents[0].type === "MONOPOLY" || recentEvents[0].type === "CRASH" ? "danger" : "warning",
    });
  }

  return signals.slice(0, 5);
}

export function buildNarrativeSummary(history: SimulationState[], events: CriticalEvent[], maxTurns: number): string {
  const latest = history[history.length - 1];
  if (!latest) {
    return "A simulação ainda não começou. Avance um turno para observar os primeiros efeitos regulatórios.";
  }

  const previous = history[history.length - 2];
  const trust = Math.round(latest.socialTrust ?? 0);
  const hhi = Math.round(latest.hhi ?? 0);
  const trustDelta = previous ? trust - Math.round(previous.socialTrust ?? trust) : 0;
  const hhiDelta = previous ? hhi - Math.round(previous.hhi ?? hhi) : 0;
  const recentEvents = getRecentEvents(events, latest.turn);

  const posture =
    trust < 40 || hhi > 2500
      ? "atenção alta"
      : trust < 70 || hhi > 1800
        ? "monitoramento ativo"
        : "operação estável";

  const eventClause =
    recentEvents.length > 0
      ? ` O evento mais recente no T${recentEvents[0].turn} deve ser lido junto das curvas abaixo.`
      : " Ainda não há evento crítico recente registrado.";

  return `Turno ${latest.turn} de ${maxTurns}: a simulação está em ${posture}. Confiança mudou ${signed(trustDelta)} ponto(s) e HHI mudou ${signed(hhiDelta)} desde o último turno.${eventClause}`;
}
