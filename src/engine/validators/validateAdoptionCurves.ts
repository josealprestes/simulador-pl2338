/**
 * validateAdoptionCurves.ts — #540: Robustness validation of AI adoption curves.
 *
 * Runs BatchRunner-based Monte Carlo across representative playbooks,
 * collects adoption curve snapshots, and analyzes variance, smoothness,
 * and trend consistency. Generates a markdown report.
 */

import { Simulation } from "../Simulation";
import type { SimulationParams, SimulationState, AdoptionCurveSnapshot } from "../types";

// ─── Playbook IDs to validate ────────────────────────────────────────────
export const KEY_PLAYBOOK_IDS = [
  "mazzucato",            // acesso-inovacao
  "schumpeter",           // dinamicas-sociais
  "porter",               // concentracao-poder-mercado
  "pl2338_rigor",         // regulacao-conformidade
  "modelo_nordic",        // internacional
];

// ─── Types ───────────────────────────────────────────────────────────────

export interface AdoptionRunResult {
  iteration: number;
  seed: number;
  finalTurn: number;
  adoptionHistory: AdoptionCurveSnapshot[];
  /** Full simulation state at each turn (for deeper analysis) */
  stateHistory: SimulationState[];
}

export interface AdoptionCurveAnalysis {
  /** Per-turn statistics across all runs */
  perTurn: {
    turn: number;
    meanComp: number;
    meanSubst: number;
    meanGen: number;
    varComp: number;
    varSubst: number;
    varGen: number;
    stdComp: number;
    stdSubst: number;
    stdGen: number;
  }[];
  /** Aggregate statistics */
  aggregate: {
    meanFinalComp: number;
    meanFinalSubst: number;
    meanFinalGen: number;
    maxStdComp: number;
    maxStdSubst: number;
    maxStdGen: number;
    avgStdComp: number;
    avgStdSubst: number;
    avgStdGen: number;
  };
  /** Smoothness: max absolute single-turn delta per run */
  smoothness: {
    maxDeltaComp: number;
    maxDeltaSubst: number;
    maxDeltaGen: number;
    /** Runs with any jump > 0.25 (25% shift) */
    jumpCount: number;
    totalRuns: number;
  };
  /** Trend consistency: direction stability */
  trendConsistency: {
    /** Fraction of runs where final > initial for each type */
    fractionUpComp: number;
    fractionUpSubst: number;
    fractionUpGen: number;
    /** Fraction of runs that end in a "dominant" category (>50%) */
    fractionDominantComp: number;
    fractionDominantSubst: number;
    fractionDominantGen: number;
  };
  /** Validation verdict */
  verdict: {
    stable: boolean;
    issues: string[];
    score: number; // 0-100
  };
}

export interface PlaybookValidationResult {
  playbookId: string;
  iterations: number;
  analysis: AdoptionCurveAnalysis;
}

// ─── Simulation runner ──────────────────────────────────────────────────

/**
 * Run a single simulation with the given parameters and capture full adoption history.
 */
export async function runSimulationWithAdoption(
  params: SimulationParams,
  seed: number,
): Promise<AdoptionRunResult> {
  const simParams: SimulationParams = { ...params, seed };
  const sim = new Simulation(simParams);

  const maxTurns = params.maxTurns ?? 50;

  // Run all turns
  while (sim.turn < maxTurns) {
    await sim.runTurn();
    // Stop early if all companies bankrupt
    const active = sim.companies.filter((c) => !c.bankrupt);
    if (active.length === 0) break;
  }

  const adoptionHistory: AdoptionCurveSnapshot[] = [];
  for (const entry of sim.history) {
    if (entry.adoption) {
      adoptionHistory.push(entry.adoption);
    }
  }

  return {
    iteration: 0,
    seed,
    finalTurn: sim.turn,
    adoptionHistory,
    stateHistory: sim.history,
  };
}

/**
 * Run multiple iterations of the same playbook params with different seeds.
 */
export async function runBatchAdoption(
  baseParams: SimulationParams,
  iterations: number,
  baseSeed: number = 42,
): Promise<AdoptionRunResult[]> {
  const results: AdoptionRunResult[] = [];

  for (let i = 0; i < iterations; i++) {
    const seed = baseSeed + i;
    const result = await runSimulationWithAdoption(baseParams, seed);
    result.iteration = i;
    results.push(result);
  }

  return results;
}

// ─── Analysis functions ─────────────────────────────────────────────────

/**
 * Analyze a set of adoption curve runs.
 */
export function analyzeAdoptionCurves(
  results: AdoptionRunResult[],
): AdoptionCurveAnalysis {
  const totalRuns = results.length;
  if (totalRuns === 0) {
    return createEmptyAnalysis();
  }

  // Find max turns across all runs
  const maxTurns = Math.max(...results.map((r) => r.adoptionHistory.length));
  if (maxTurns === 0) {
    return createEmptyAnalysis();
  }

  const perTurn: AdoptionCurveAnalysis["perTurn"] = [];

  for (let t = 0; t < maxTurns; t++) {
    const compValues: number[] = [];
    const substValues: number[] = [];
    const genValues: number[] = [];

    for (const run of results) {
      if (t < run.adoptionHistory.length) {
        compValues.push(run.adoptionHistory[t].adoptionComplementary);
        substValues.push(run.adoptionHistory[t].adoptionSubstitutive);
        genValues.push(run.adoptionHistory[t].adoptionGenerative);
      }
    }

    perTurn.push({
      turn: t,
      meanComp: mean(compValues),
      meanSubst: mean(substValues),
      meanGen: mean(genValues),
      varComp: variance(compValues),
      varSubst: variance(substValues),
      varGen: variance(genValues),
      stdComp: Math.sqrt(variance(compValues)),
      stdSubst: Math.sqrt(variance(substValues)),
      stdGen: Math.sqrt(variance(genValues)),
    });
  }

  // Aggregate across all turns
  const allStdComp = perTurn.map((t) => t.stdComp);
  const allStdSubst = perTurn.map((t) => t.stdSubst);
  const allStdGen = perTurn.map((t) => t.stdGen);

  // Final state analysis
  const finalCompValues: number[] = [];
  const finalSubstValues: number[] = [];
  const finalGenValues: number[] = [];

  for (const run of results) {
    const last = run.adoptionHistory[run.adoptionHistory.length - 1];
    if (last) {
      finalCompValues.push(last.adoptionComplementary);
      finalSubstValues.push(last.adoptionSubstitutive);
      finalGenValues.push(last.adoptionGenerative);
    }
  }

  // Smoothness: max single-turn delta per run
  let maxDeltaComp = 0;
  let maxDeltaSubst = 0;
  let maxDeltaGen = 0;
  let jumpCount = 0;

  for (const run of results) {
    for (let t = 1; t < run.adoptionHistory.length; t++) {
      const prev = run.adoptionHistory[t - 1];
      const curr = run.adoptionHistory[t];
      const dComp = Math.abs(curr.adoptionComplementary - prev.adoptionComplementary);
      const dSubst = Math.abs(curr.adoptionSubstitutive - prev.adoptionSubstitutive);
      const dGen = Math.abs(curr.adoptionGenerative - prev.adoptionGenerative);

      if (dComp > maxDeltaComp) maxDeltaComp = dComp;
      if (dSubst > maxDeltaSubst) maxDeltaSubst = dSubst;
      if (dGen > maxDeltaGen) maxDeltaGen = dGen;

      if (dComp > 0.25 || dSubst > 0.25 || dGen > 0.25) {
        jumpCount++;
        break; // count each run once
      }
    }
  }

  // Trend consistency
  let upComp = 0, upSubst = 0, upGen = 0;
  let dominantComp = 0, dominantSubst = 0, dominantGen = 0;

  for (const run of results) {
    const first = run.adoptionHistory[0];
    const last = run.adoptionHistory[run.adoptionHistory.length - 1];
    if (first && last) {
      if (last.adoptionComplementary > first.adoptionComplementary) upComp++;
      if (last.adoptionSubstitutive > first.adoptionSubstitutive) upSubst++;
      if (last.adoptionGenerative > first.adoptionGenerative) upGen++;

      if (last.adoptionComplementary > 0.5) dominantComp++;
      if (last.adoptionSubstitutive > 0.5) dominantSubst++;
      if (last.adoptionGenerative > 0.5) dominantGen++;
    }
  }

  // Verdict
  const issues: string[] = [];
  let score = 100;

  const stdThreshold = 0.12;
  const maxStdCompVal = allStdComp.length > 0 ? Math.max(...allStdComp) : 0;
  const maxStdSubstVal = allStdSubst.length > 0 ? Math.max(...allStdSubst) : 0;
  const maxStdGenVal = allStdGen.length > 0 ? Math.max(...allStdGen) : 0;

  if (maxStdCompVal > stdThreshold) {
    issues.push(
      `Complementary adoption std dev reaches ${maxStdCompVal.toFixed(3)} (threshold: ${stdThreshold}) — high cross-run variance.`,
    );
    score -= 15;
  }
  if (maxStdSubstVal > stdThreshold) {
    issues.push(
      `Substitutive adoption std dev reaches ${maxStdSubstVal.toFixed(3)} (threshold: ${stdThreshold}) — high cross-run variance.`,
    );
    score -= 15;
  }
  if (maxStdGenVal > stdThreshold) {
    issues.push(
      `Generative adoption std dev reaches ${maxStdGenVal.toFixed(3)} (threshold: ${stdThreshold}) — high cross-run variance.`,
    );
    score -= 15;
  }

  if (jumpCount > totalRuns * 0.2) {
    issues.push(
      `${jumpCount}/${totalRuns} runs have single-turn adoption shifts > 25% — curves are not smooth.`,
    );
    score -= 20;
  }

  // Check for empty/zero curves (all adoption stays at 0)
  const allZeroRuns = results.filter((r) => {
    const last = r.adoptionHistory[r.adoptionHistory.length - 1];
    return last && last.adoptionComplementary === 0 && last.adoptionSubstitutive === 0 && last.adoptionGenerative === 0;
  }).length;
  if (allZeroRuns > totalRuns * 0.5) {
    issues.push(
      `${allZeroRuns}/${totalRuns} runs have zero adoption at end — market may be stuck.`,
    );
    score -= 10;
  }

  // Check total proportion adds up approximately
  const sumProportion = new Set(results.map((r) => {
    const last = r.adoptionHistory[r.adoptionHistory.length - 1];
    if (!last) return 0;
    return Math.round((last.adoptionComplementary + last.adoptionSubstitutive + last.adoptionGenerative) * 100);
  }));
  // This should be 100 (or 0 if no products) in every run
  for (const run of results) {
    const last = run.adoptionHistory[run.adoptionHistory.length - 1];
    if (last && last.totalProducts > 0) {
      const sum = last.adoptionComplementary + last.adoptionSubstitutive + last.adoptionGenerative;
      if (Math.abs(sum - 1.0) > 0.01) {
        issues.push(
          `Adoption proportions do not sum to 1.0 (got ${sum.toFixed(4)}) — possible logic error.`,
        );
        score -= 15;
        break;
      }
    }
  }

  const stable = issues.length <= 2 && score >= 60;

  return {
    perTurn,
    aggregate: {
      meanFinalComp: mean(finalCompValues),
      meanFinalSubst: mean(finalSubstValues),
      meanFinalGen: mean(finalGenValues),
      maxStdComp: maxStdCompVal,
      maxStdSubst: maxStdSubstVal,
      maxStdGen: maxStdGenVal,
      avgStdComp: mean(allStdComp),
      avgStdSubst: mean(allStdSubst),
      avgStdGen: mean(allStdGen),
    },
    smoothness: {
      maxDeltaComp,
      maxDeltaSubst,
      maxDeltaGen,
      jumpCount,
      totalRuns,
    },
    trendConsistency: {
      fractionUpComp: upComp / totalRuns,
      fractionUpSubst: upSubst / totalRuns,
      fractionUpGen: upGen / totalRuns,
      fractionDominantComp: dominantComp / totalRuns,
      fractionDominantSubst: dominantSubst / totalRuns,
      fractionDominantGen: dominantGen / totalRuns,
    },
    verdict: {
      stable,
      issues,
      score: Math.max(0, score),
    },
  };
}

function createEmptyAnalysis(): AdoptionCurveAnalysis {
  return {
    perTurn: [],
    aggregate: {
      meanFinalComp: 0,
      meanFinalSubst: 0,
      meanFinalGen: 0,
      maxStdComp: 0,
      maxStdSubst: 0,
      maxStdGen: 0,
      avgStdComp: 0,
      avgStdSubst: 0,
      avgStdGen: 0,
    },
    smoothness: { maxDeltaComp: 0, maxDeltaSubst: 0, maxDeltaGen: 0, jumpCount: 0, totalRuns: 0 },
    trendConsistency: {
      fractionUpComp: 0,
      fractionUpSubst: 0,
      fractionUpGen: 0,
      fractionDominantComp: 0,
      fractionDominantSubst: 0,
      fractionDominantGen: 0,
    },
    verdict: { stable: true, issues: [], score: 100 },
  };
}

// ─── Statistics helpers ─────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

// ─── Report generation ──────────────────────────────────────────────────

/**
 * Generate a full markdown report from validation results.
 */
export function generateAdoptionReport(
  results: PlaybookValidationResult[],
): string {
  const lines: string[] = [];
  const dateStr = new Date().toLocaleString("pt-BR");

  lines.push("# Relatório de Validação: Curvas de Adoção de IA");
  lines.push("");
  lines.push(`**Gerado em:** ${dateStr}`);
  lines.push(`**Playbooks analisados:** ${results.length}`);
  lines.push(`**Iterações por playbook:** ${results[0]?.iterations ?? "N/A"}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Resumo Executivo");
  lines.push("");

  const stableCount = results.filter((r) => r.analysis.verdict.stable).length;
  const avgScore = results.length > 0
    ? mean(results.map((r) => r.analysis.verdict.score))
    : 0;

  lines.push(
    `- **Playbooks estáveis:** ${stableCount}/${results.length}`,
  );
  lines.push(
    `- **Pontuação média:** ${avgScore.toFixed(1)}/100`,
  );
  lines.push("");
  lines.push(
    stableCount === results.length
      ? "✅ **Todas as curvas de adoção estão estáveis e economicamente realistas.**"
      : `⚠️ **${results.length - stableCount} playbook(s) apresentam instabilidade.**`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const result of results) {
    const a = result.analysis;
    lines.push(`## Playbook: \`${result.playbookId}\``);
    lines.push("");
    lines.push(`**Pontuação:** ${a.verdict.score}/100`);
    lines.push(`**Status:** ${a.verdict.stable ? "✅ Estável" : "⚠️ Requer atenção"}`);
    lines.push("");
    lines.push("### Estatísticas Agregadas");
    lines.push("");
    lines.push(`- **Adoção Complementar (final):** ${(a.aggregate.meanFinalComp * 100).toFixed(1)}%`);
    lines.push(`- **Adoção Substitutiva (final):** ${(a.aggregate.meanFinalSubst * 100).toFixed(1)}%`);
    lines.push(`- **Adoção Generativa (final):** ${(a.aggregate.meanFinalGen * 100).toFixed(1)}%`);
    lines.push(`- **Máx. desvio padrão (Comp):** ${(a.aggregate.maxStdComp * 100).toFixed(1)}%`);
    lines.push(`- **Máx. desvio padrão (Subst):** ${(a.aggregate.maxStdSubst * 100).toFixed(1)}%`);
    lines.push(`- **Máx. desvio padrão (Gen):** ${(a.aggregate.maxStdGen * 100).toFixed(1)}%`);
    lines.push(`- **Méd. desvio padrão (Comp):** ${(a.aggregate.avgStdComp * 100).toFixed(1)}%`);
    lines.push(`- **Méd. desvio padrão (Subst):** ${(a.aggregate.avgStdSubst * 100).toFixed(1)}%`);
    lines.push(`- **Méd. desvio padrão (Gen):** ${(a.aggregate.avgStdGen * 100).toFixed(1)}%`);
    lines.push("");

    lines.push("### Suavidade das Curvas");
    lines.push("");
    lines.push(`- **Máx. delta Comp (single-turn):** ${(a.smoothness.maxDeltaComp * 100).toFixed(1)}%`);
    lines.push(`- **Máx. delta Subst (single-turn):** ${(a.smoothness.maxDeltaSubst * 100).toFixed(1)}%`);
    lines.push(`- **Máx. delta Gen (single-turn):** ${(a.smoothness.maxDeltaGen * 100).toFixed(1)}%`);
    lines.push(`- **Runs com saltos (>25%):** ${a.smoothness.jumpCount}/${a.smoothness.totalRuns}`);
    lines.push("");

    lines.push("### Consistência de Tendência");
    lines.push("");
    lines.push(`- **Frações com tendência de alta (Comp):** ${(a.trendConsistency.fractionUpComp * 100).toFixed(0)}%`);
    lines.push(`- **Frações com tendência de alta (Subst):** ${(a.trendConsistency.fractionUpSubst * 100).toFixed(0)}%`);
    lines.push(`- **Frações com tendência de alta (Gen):** ${(a.trendConsistency.fractionUpGen * 100).toFixed(0)}%`);
    lines.push(`- **Fração de runs com dominância Comp (>50%):** ${(a.trendConsistency.fractionDominantComp * 100).toFixed(0)}%`);
    lines.push(`- **Fração de runs com dominância Subst (>50%):** ${(a.trendConsistency.fractionDominantSubst * 100).toFixed(0)}%`);
    lines.push(`- **Fração de runs com dominância Gen (>50%):** ${(a.trendConsistency.fractionDominantGen * 100).toFixed(0)}%`);
    lines.push("");

    if (a.verdict.issues.length > 0) {
      lines.push("### Issues Detectadas");
      lines.push("");
      for (const issue of a.verdict.issues) {
        lines.push(`- ⚠️ ${issue}`);
      }
      lines.push("");
    } else {
      lines.push("### Issues Detectadas");
      lines.push("");
      lines.push("Nenhuma issue detectada.");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // Final recommendations
  lines.push("## Recomendações");
  lines.push("");

  const unstableResults = results.filter((r) => !r.analysis.verdict.stable);
  if (unstableResults.length > 0) {
    lines.push("### Playbooks que requerem ajustes:");
    lines.push("");
    for (const r of unstableResults) {
      lines.push(`- **\`${r.playbookId}\`** (score: ${r.analysis.verdict.score}/100)`);
      for (const issue of r.analysis.verdict.issues) {
        lines.push(`  - ${issue}`);
      }
    }
    lines.push("");
  }

  const allIssues = results.flatMap((r) => r.analysis.verdict.issues);
  if (allIssues.some((i) => i.includes("variance") || i.includes("std"))) {
    lines.push(
      "1. **Reduzir variância estocástica:** Se o desvio padrão entre runs for alto (>12%), considerar damping factors no AdoptionCurveEngine ou aumentar o número de empresas para reduzir sensibilidade a eventos discretos.",
    );
  }
  if (allIssues.some((i) => i.includes("jump") || i.includes("smooth"))) {
    lines.push(
      "2. **Suavizar transições:** Se saltos bruscos forem detectados (>25% em um turno), adicionar interpolação ou limites de variação máxima por turno no AdoptionCurveEngine.",
    );
  }
  if (allIssues.some((i) => i.includes("sum to 1"))) {
    lines.push(
      "3. **Corrigir proporções:** As proporções de adopção devem sempre somar 1.0. Verificar lógica de contagem de produtos.",
    );
  }
  if (allIssues.some((i) => i.includes("zero adoption"))) {
    lines.push(
      "4. **Evitar mercado zero:** Se muitas runs terminam sem adoção, verificar parâmetros de inovação e custos de entrada.",
    );
  }

  if (unstableResults.length === 0) {
    lines.push("Nenhuma recomendação de ajuste — todas as curvas estão robustas.");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "*Relatório gerado automaticamente pelo validador de curvas de adoção (validateAdoptionCurves.ts).*",
  );

  return lines.join("\n");
}
