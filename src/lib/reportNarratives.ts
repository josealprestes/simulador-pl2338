/**
 * Helpers centrais de narrativa de relatório.
 *
 * Regras (auditoria de integridade):
 * 1. toda conclusão deriva dos dados, nunca de texto fixo;
 * 2. nenhuma causalidade é atribuída ao PL com base apenas na simulação;
 * 3. linguagem condicional: "sugere", "é compatível com", "o modelo produziu";
 * 4. nunca usar "demonstrou" ou "comprovou";
 * 5. "proxy de concentração de capital" em vez de HHI nu;
 * 6. ausência de dados aparece como "não informado"/"n/d", nunca inventada;
 * 7. proteção de divisão por zero em todos os cálculos.
 */

/** Tolerância relativa para classificar como estabilidade aproximada. */
const STABILITY_TOLERANCE = 0.05;

/** Rótulos da UI/exportação para o HHI de capital (não calibrado). */
export const HHI_CAPITAL_LABEL = "proxy de concentração de capital (HHI)";

/**
 * Descreve a trajetória do proxy de concentração de capital.
 * A classificação é puramente descritiva: aumento, diminuição ou estabilidade
 * aproximada, sem qualificar como poder de mercado.
 */
export function describeCapitalConcentration(
  initialHhi: number | undefined,
  finalHhi: number | undefined,
): string {
  if (initialHhi === undefined || finalHhi === undefined) {
    return "O proxy de concentração de capital (HHI) não informado para esta simulação.";
  }
  const hhiDelta = finalHhi - initialHhi;
  const reference = Math.max(Math.abs(initialHhi), Math.abs(finalHhi), 1);
  if (Math.abs(hhiDelta) / reference < STABILITY_TOLERANCE) {
    return "O proxy de concentração de capital (HHI) permaneceu aproximadamente estável no cenário modelado.";
  }
  return hhiDelta > 0
    ? "O proxy de concentração de capital (HHI) aumentou no cenário modelado."
    : "O proxy de concentração de capital (HHI) diminuiu no cenário modelado.";
}

/** Variação percentual segura (sem divisão por zero). */
export function safePercentChange(
  initial: number | undefined,
  final: number | undefined,
): number | null {
  if (initial === undefined || final === undefined) return null;
  if (initial === 0) return null;
  return ((final - initial) / Math.abs(initial)) * 100;
}

/**
 * Descreve a trajetória da confiança social usando TODA a série, não apenas
 * o último turno. Nunca afirma que permaneceu acima de um limiar sem verificar.
 */
export function describeTrustTrajectory(
  history: Array<{ socialTrust?: number }>,
  threshold = 50,
): string {
  if (!history || history.length === 0) {
    return "A confiança social não informada para esta simulação.";
  }
  const values = history.map((h) => h.socialTrust ?? 0);
  const minTrust = Math.min(...values);
  const maxTrust = Math.max(...values);
  const finalTrust = values[values.length - 1];
  const stayedAbove = minTrust >= threshold;
  const stayedBelow = maxTrust < threshold;
  if (stayedAbove) {
    return `A confiança social permaneceu em toda a série acima do limiar de ${threshold}% (mínimo de ${Math.round(minTrust)}%, final de ${Math.round(finalTrust)}%) no cenário modelado.`;
  }
  if (stayedBelow) {
    return `A confiança social permaneceu em toda a série abaixo do limiar de ${threshold}% (máximo de ${Math.round(maxTrust)}%, final de ${Math.round(finalTrust)}%) no cenário modelado.`;
  }
  return `A confiança social oscilou em torno do limiar de ${threshold}% no cenário modelado (mínimo de ${Math.round(minTrust)}%, máximo de ${Math.round(maxTrust)}%, final de ${Math.round(finalTrust)}%).`;
}

/** Descreve a trajetória de startups ativas (entrada vs sobrevivência). */
export function describeStartupTrajectory(
  initialStartups: number | undefined,
  finalStartups: number | undefined,
): string {
  if (initialStartups === undefined || finalStartups === undefined) {
    return "A trajetória de startups ativas não informada para esta simulação.";
  }
  const delta = finalStartups - initialStartups;
  if (delta === 0) {
    return `O modelo produziu ${finalStartups} startups ativas no final, mesma quantidade do início, no cenário modelado.`;
  }
  const pct = safePercentChange(initialStartups, finalStartups);
  const dir = delta > 0 ? "aumento" : "redução";
  const pctText = pct === null ? "" : ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)`;
  return `O modelo produziu ${dir} de startups ativas de ${initialStartups} para ${finalStartups}${pctText} no cenário modelado.`;
}

/**
 * Descreve a reprodutibilidade com base nos metadados EFETIVOS do provedor.
 * Nunca afirma reprodutibilidade integral quando o provedor é externo.
 */
export function describeReproducibility(metadata: {
  strictlyReproducible?: boolean;
  decisionProvider?: string;
  decisionMode?: string;
}): string {
  if (metadata.strictlyReproducible === true) {
    return `O modo de decisão ${metadata.decisionProvider ?? "heurístico"} é determinístico por seed nesta execução.`;
  }
  if (metadata.decisionProvider === "external-http") {
    return "Esta execução usou um provedor externo de decisão e não é estritamente reproduzível por seed.";
  }
  return "Esta execução não declara reprodutibilidade estrita por seed.";
}

/** Classificação indicativa de concentração (NÃO calibrada para o proxy de capital). */
export function concentrationBand(hhiCapital: number | undefined): string {
  if (hhiCapital === undefined) return "não informado";
  if (hhiCapital >= 2500) {
    return "faixa alta segundo referência indicativa não calibrada para o proxy de capital";
  }
  if (hhiCapital >= 1500) {
    return "faixa moderada segundo referência indicativa não calibrada para o proxy de capital";
  }
  return "faixa baixa segundo referência indicativa não calibrada para o proxy de capital";
}
