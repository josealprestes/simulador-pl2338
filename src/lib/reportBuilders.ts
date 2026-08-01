import type { ExecutionMetadata, FullReportOptions } from "./exportReport";

/**
 * Builders puros de textos/metadados de relatório (§18 da auditoria).
 * Isolam a construção textual das capas (DOCX/LaTeX/HTML) para permitir
 * testes sem renderização nem análise de binários.
 */

/**
 * Fonte narrativa efetiva. A propriedade explícita `aiGenerationSource` é a
 * ÚNICA fonte autoritativa: um texto heurístico preenchido em `analysisText`
 * nunca é rotulado como IA (e vice-versa). Ausente → "heuristic".
 */
export function buildSourceNarrative(options: FullReportOptions): "ai" | "heuristic" {
  return options.aiGenerationSource === "ai" ? "ai" : "heuristic";
}

/** Metadados de execução normalizados (fonte única para capas e rodapés). */
export function buildReportMetadata(options: FullReportOptions): ExecutionMetadata {
  return {
    seed: options.seed,
    executedTurns: options.executedTurns,
    snapshotCount: options.snapshotCount,
    decisionMode: options.decisionMode ?? "heuristic",
    decisionProvider: options.decisionProvider ?? "heuristic",
    strictlyReproducible: options.strictlyReproducible ?? false,
    externalLLMUsed: options.externalLLMUsed ?? false,
    softwareVersion: options.softwareVersion ?? "desconhecida",
    schemaVersion: options.schemaVersion,
    sourceNarrative: buildSourceNarrative(options),
  };
}

export interface DocxCoverText {
  title: string;
  disclaimer: string;
  metadataLines: string[];
}

/** Textos da capa DOCX (título, disclaimer e metadados em linhas). */
export function buildDocxCoverText(options: FullReportOptions): DocxCoverText {
  const m = buildReportMetadata(options);
  const reprodutibilidade = m.strictlyReproducible
    ? "heurístico determinístico por seed"
    : `não estritamente reproduzível (provedor efetivo: ${m.decisionProvider})`;
  return {
    title: "RELATÓRIO INTERPRETATIVO AUTOMATIZADO DA SIMULAÇÃO",
    disclaimer:
      "Documento exploratório gerado automaticamente. Não constitui parecer jurídico, previsão ou recomendação regulatória oficial.",
    metadataLines: [
      `Fonte narrativa: ${m.sourceNarrative === "ai" ? "IA generativa" : "heurística"}`,
      `Provedor de decisão efetivo: ${m.decisionProvider}`,
      `Modo de decisão: ${m.decisionMode}`,
      `Seed: ${m.seed !== undefined ? String(m.seed) : "n/d"}`,
      `Reprodutibilidade: ${reprodutibilidade}`,
      `Turnos executados: ${m.executedTurns !== undefined ? String(m.executedTurns) : "n/d"}`,
      `Snapshots: ${m.snapshotCount !== undefined ? String(m.snapshotCount) : "n/d"}`,
      `Versão do software: ${m.softwareVersion}`,
    ],
  };
}

/**
 * Título padrão da capa: enquadramento exploratório (§11). Nunca "Impactos do
 * PL..." (que sugeriria mensuração causal de efeitos reais).
 */
export const REPORT_TITLE =
  "Cenários regulatórios parametrizados relacionados ao PL 2338/2023";

export function buildReportTitle(): string {
  return REPORT_TITLE;
}

/**
 * Rótulo da tendência de startups na tabela de indicadores (§6). Deriva
 * SOMENTE do delta de startups — nunca "Consolidação" automaticamente
 * (redução de startups pode refletir falências/choque sistêmico).
 */
export function buildStartupTrendLabel(startupDelta: number): string {
  if (startupDelta < 0) return "Redução";
  if (startupDelta > 0) return "Crescimento";
  return "Estabilidade";
}


export function buildCountTrendLabel(delta: number): string {
  if (delta < 0) return "Redução";
  if (delta > 0) return "Crescimento";
  return "Estabilidade";
}

export function buildTrustTrendLabel(delta: number): string {
  if (delta < 0) return "Queda";
  if (delta > 0) return "Alta";
  return "Estabilidade";
}

/** Aviso de privacidade por modo de processamento (§4.3). */
export function buildPrivacyNotice(mode: "local" | "external"): string {
  if (mode === "external") {
    return "Ao usar um provedor externo, os dados necessários à geração do relatório serão enviados ao endpoint configurado. Consulte a política de privacidade e os termos do provedor antes de prosseguir.";
  }
  return "No modo heurístico, o processamento permanece local no navegador.";
}
