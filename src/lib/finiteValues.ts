/**
 * Sanitização central de valores não finitos para exportações.
 *
 * Regra: NaN, Infinity e -Infinity nunca são silenciosamente convertidos em
 * null/"" em dados científicos exportados. A detecção é centralizada aqui e
 * a exportação falha com erro explícito apontando o caminho do valor.
 */

/** Retorna os caminhos (ex.: "history[3].socialTrust") de todos os valores não finitos. */
export function findNonFiniteValues(value: unknown, path = "root", acc: string[] = []): string[] {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) acc.push(path);
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => findNonFiniteValues(item, `${path}[${i}]`, acc));
    return acc;
  }
  if (value !== null && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) =>
      findNonFiniteValues(val, `${path}.${key}`, acc),
    );
  }
  return acc;
}

/** Lança erro listando todos os valores não finitos encontrados. */
export function assertFiniteValues(value: unknown, label = "dados"): void {
  const problems = findNonFiniteValues(value);
  if (problems.length > 0) {
    throw new Error(
      `Exportação de ${label} abortada: ${problems.length} valor(es) não finito(s) encontrado(s): ${problems
        .slice(0, 10)
        .join(", ")}${problems.length > 10 ? ` e mais ${problems.length - 10}` : ""}.`,
    );
  }
}
