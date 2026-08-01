import type { Company } from "./types";

/**
 * ValidationModule: Checagem de coerência com fatos estilizados (stylized
 * facts) do ecossistema de IA brasileiro e teorias econômicas estabelecidas.
 * Issue #70.
 *
 * IMPORTANTE (limite metodológico): este módulo NÃO constitui validação
 * empírica nem científica. Ele verifica se os resultados da simulação são
 * coerentes com faixas heurísticas da literatura. Não é calibração, não é
 * previsão e não atesta verossimilhança com dados reais. As frases de achado
 * descrevem COMPATIBILIDADE com hipóteses, nunca causalidade demonstrada.
 *
 * Comparabilidade: critérios dependentes de mecanismos opcionais (lobby,
 * reputação, royalties, open source) ou de condições antecedentes (custo de
 * conformidade alto, startups iniciais, produtos de alto risco) só entram no
 * denominador quando a condição ocorreu; caso contrário são `not_applicable`.
 * O índice agregado (coherenceIndex) é secundário: a matriz `criteria` é a
 * fonte primária de leitura.
 */
export type CriterionStatus = "matched" | "not_matched" | "not_applicable";

export interface CriterionResult {
  id: string;
  status: CriterionStatus;
  weight: number;
  finding: string;
}

export interface ValidationResult {
  /** Índice de compatibilidade 0-100 sobre os critérios aplicáveis
   *  (secundário; não é qualidade do cenário). */
  coherenceIndex: number;
  earnedScore: number;
  applicableScore: number;
  /** Matriz por critério (fonte primária). */
  criteria: CriterionResult[];
  applicableCriteria: string[];
  notApplicableCriteria: string[];
  findings: string[];
  timestamp: string;
}

/** Limiar de custo de conformidade para a hipótese de concentração (§9.2). */
const COMPLIANCE_THRESHOLD = 50000;

export class ValidationModule {
  static evaluate(simulation: Record<string, any>): ValidationResult {
    const findings: string[] = [];
    const criteria: CriterionResult[] = [];
    let earnedScore = 0;
    let applicableScore = 0;
    const MAX_POINTS = 100;

    const history = simulation.history;
    if (history.length === 0) {
      return {
        coherenceIndex: 0,
        earnedScore: 0,
        applicableScore: 0,
        criteria: [],
        applicableCriteria: [],
        notApplicableCriteria: [],
        findings: ["Simulation has no data."],
        timestamp: new Date().toISOString(),
      };
    }

    // População ativa para métricas de mercado (§9.3): mesma base do HHI.
    const activeCompanies = (simulation.companies as Company[]).filter(
      (c) => !c.bankrupt,
    );
    const finalState = history[history.length - 1];
    const initialStartups = simulation.params.initialStartups ?? 0;
    const finalStartups = finalState.activeStartups;
    const mortalityRate =
      initialStartups > 0
        ? (initialStartups - finalStartups) / initialStartups
        : 0;

    // Fato estilizado 1: alta mortalidade de startups.
    // Faixa heurística adotada para exploração do modelo (50-95%): o ABM
    // explora cenários regulatórios extremos; a faixa ampla evita
    // falso-negativo nos extremos do espaço de parâmetros.
    if (initialStartups === 0) {
      criteria.push({
        id: "mortalidade_startups",
        status: "not_applicable",
        weight: 20,
        finding: "Critério não avaliável: o cenário iniciou sem startups.",
      });
      findings.push(
        "ℹ️ Critério não avaliável: o cenário iniciou sem startups (não há taxa artificial de mortalidade).",
      );
    } else {
      applicableScore += 20;
      if (mortalityRate > 0.5 && mortalityRate < 0.95) {
        earnedScore += 20;
        criteria.push({
          id: "mortalidade_startups",
          status: "matched",
          weight: 20,
          finding: "Taxa de mortalidade de startups compatível com ecossistemas de risco.",
        });
        findings.push(
          "✅ Alinhado: Taxa de mortalidade de startups compatível com ecossistemas de risco.",
        );
      } else if (mortalityRate >= 0.95) {
        criteria.push({
          id: "mortalidade_startups",
          status: "not_matched",
          weight: 20,
          finding: "Mortalidade extrema: parâmetros podem estar excessivamente punitivos.",
        });
        findings.push(
          "⚠️ Alerta: Mortalidade extrema. Parâmetros podem estar excessivamente punitivos.",
        );
      } else {
        criteria.push({
          id: "mortalidade_startups",
          status: "not_matched",
          weight: 20,
          finding: "Mortalidade abaixo da faixa estilizada adotada; a trajetória isolada não identifica sua causa.",
        });
        findings.push(
          "ℹ️ Mortalidade abaixo da faixa estilizada adotada; a trajetória isolada não identifica sua causa.",
        );
      }
    }

    // Fato estilizado 2: concentração sob altos custos de conformidade.
    // Só é aplicável quando a condição antecedente (custo alto) ocorreu (§9.2).
    // O HHI de capital é PROXY patrimonial (referência indicativa não calibrada).
    if ((simulation.params.complianceCostHighRisk ?? 0) > COMPLIANCE_THRESHOLD) {
      applicableScore += 20;
      const initialHHI = history[0].hhiCapital ?? history[0].hhi ?? 0;
      const finalHHI = finalState.hhiCapital ?? finalState.hhi ?? 0;
      if (finalHHI > initialHHI) {
        earnedScore += 20;
        criteria.push({
          id: "hhi_capital_compliance",
          status: "matched",
          weight: 20,
          finding: "Aumento do proxy de concentração de capital observado sob altos custos de conformidade (Barreiras de Porter).",
        });
        findings.push(
          "✅ Alinhado: Aumento do proxy de concentração de capital observado sob altos custos de conformidade (Barreiras de Porter).",
        );
      } else {
        criteria.push({
          id: "hhi_capital_compliance",
          status: "not_matched",
          weight: 20,
          finding: "Custo de conformidade alto sem aumento do proxy de concentração de capital.",
        });
      }
    } else {
      criteria.push({
        id: "hhi_capital_compliance",
        status: "not_applicable",
        weight: 20,
        finding: "Critério não avaliável: custo de conformidade abaixo do limiar da hipótese.",
      });
      findings.push(
        "ℹ️ Critério não avaliável: custo de conformidade abaixo do limiar da hipótese de concentração.",
      );
    }

    // Fato estilizado 3: Trust-Innovation Loop
    applicableScore += 10;
    const trust = finalState.socialTrust;
    if (trust < 40 && simulation.turn > 20) {
      criteria.push({
        id: "confianca_inovacao",
        status: "not_matched",
        weight: 10,
        finding: "Confiança baixa: trajetória incompatível com a hipótese de estabilidade da confiança.",
      });
      findings.push(
        "🚨 Confiança baixa: trajetória incompatível com a hipótese de estabilidade da confiança.",
      );
    } else if (trust > 80) {
      earnedScore += 10;
      criteria.push({
        id: "confianca_inovacao",
        status: "matched",
        weight: 10,
        finding: "O resultado é compatível com a hipótese de estabilidade da confiança sob governança ativa.",
      });
      findings.push(
        "✅ Estabilidade Social: o resultado é compatível com a hipótese de estabilidade da confiança sob governança ativa.",
      );
    } else {
      criteria.push({
        id: "confianca_inovacao",
        status: "not_matched",
        weight: 10,
        finding: "Confiança em faixa intermediária no cenário.",
      });
    }

    // Fato estilizado 4: Cloud Drain
    applicableScore += 10;
    const cloudDrain = finalState.cloudDrain || 0;
    const totalCapital = activeCompanies.reduce(
      (acc: number, c: Company) => acc + c.capital,
      0,
    );
    if (cloudDrain > totalCapital * 0.2) {
      criteria.push({
        id: "drenagem_nuvem",
        status: "matched",
        weight: 10,
        finding: "Drenagem de nuvem: proxy em faixa elevada frente ao capital do cenário.",
      });
      findings.push(
        "⚠️ Drenagem de nuvem: proxy em faixa elevada frente ao capital do cenário.",
      );
      earnedScore += 10;
    } else {
      criteria.push({
        id: "drenagem_nuvem",
        status: "not_matched",
        weight: 10,
        finding: "Drenagem de nuvem dentro da faixa observada nos cenários típicos.",
      });
    }

    // Fato estilizado 5: Regulatory Capture (Lobby) - Issue #233
    // A captura NÃO é afirmada por HHI sozinho: exige o conjunto de sinais
    // (eventos de lobby efetivos + concentração alta).
    if (simulation.params.lobbyEnabled) {
      const lobbyEvents = (simulation.criticalEvents || []).filter(
        (e: { type?: string }) => e.type === "LOBBY",
      );
      const finalHHI = finalState.hhiCapital ?? finalState.hhi ?? 0;
      if (lobbyEvents.length > 0 && finalHHI > 3000) {
        applicableScore += 10;
        earnedScore += 10;
        criteria.push({
          id: "captura_regulatoria",
          status: "matched",
          weight: 10,
          finding: "Eventos de lobby registrados com concentração alta — conjunto de sinais compatível com risco de captura regulatória por incumbentes (sem afirmar captura).",
        });
        findings.push(
          "🏛️ Lobby: eventos de lobby registrados com concentração alta — conjunto de sinais compatível com risco de captura regulatória por incumbentes (sem afirmar captura).",
        );
      } else {
        criteria.push({
          id: "captura_regulatoria",
          status: "not_applicable",
          weight: 10,
          finding: lobbyEvents.length === 0
            ? "Lobby ativo sem eventos de lobby registrados: não há base para avaliar captura."
            : "Concentração abaixo do limiar: não há base para avaliar captura.",
        });
        findings.push(
          "ℹ️ Lobby ativo sem o conjunto de sinais completo (eventos + concentração): não há base para avaliar captura.",
        );
      }
    } else {
      criteria.push({
        id: "captura_regulatoria",
        status: "not_applicable",
        weight: 10,
        finding: "Mecanismo de lobby desabilitado no cenário.",
      });
    }

    // Fato estilizado 6: Open Source Democratization - Issue #233
    const osConfig = simulation.params.actors?.openSource;
    if (osConfig && osConfig.releaseCycle > 0) {
      applicableScore += 10;
      if (finalStartups > initialStartups * 0.4) {
        earnedScore += 10;
        criteria.push({
          id: "open_source",
          status: "matched",
          weight: 10,
          finding: "O mecanismo estava ativo e a trajetória observada foi de manutenção de entrantes.",
        });
        findings.push(
          "✅ Open Source: o mecanismo estava ativo e a trajetória observada foi de manutenção de entrantes.",
        );
      } else {
        criteria.push({
          id: "open_source",
          status: "not_matched",
          weight: 10,
          finding: "Mecanismo ativo, porém com retração de entrantes no cenário.",
        });
      }
    } else {
      criteria.push({
        id: "open_source",
        status: "not_applicable",
        weight: 10,
        finding: "Mecanismo de open source desabilitado no cenário.",
      });
    }

    // Fato estilizado 7: Corporate Reputation (Nash Equilibrium)
    if (simulation.params.reputationEnabled) {
      applicableScore += 10;
      const avgRep =
        activeCompanies.reduce(
          (acc: number, c: Company) => acc + c.reputationScore,
          0,
        ) / (activeCompanies.length || 1);
      if (avgRep < 0.4) {
        criteria.push({
          id: "reputacao",
          status: "not_matched",
          weight: 10,
          finding: "O ecossistema opera em baixo nível de confiança mútua no cenário.",
        });
        findings.push(
          "🚨 Crise Reputacional: O ecossistema opera em baixo nível de confiança mútua no cenário.",
        );
      } else {
        earnedScore += 10;
        criteria.push({
          id: "reputacao",
          status: "matched",
          weight: 10,
          finding: "A trajetória observada é compatível com a hipótese de que a reputação importa no cenário modelado.",
        });
        findings.push(
          "✅ Maturidade Reputacional: a trajetória observada é compatível com a hipótese de que a reputação importa no cenário modelado.",
        );
      }
    } else {
      criteria.push({
        id: "reputacao",
        status: "not_applicable",
        weight: 10,
        finding: "Mecanismo de reputação desabilitado no cenário.",
      });
    }

    // Fato estilizado 8: State Investment Socialization (Mazzucato)
    if (simulation.params.stateRoyaltyEnabled) {
      applicableScore += 10;
      const totalStateReturns = finalState.totalStateReturns || 0;
      if (totalStateReturns > 0) {
        earnedScore += 10;
        criteria.push({
          id: "retorno_social",
          status: "matched",
          weight: 10,
          finding: "O mecanismo de royalties estava ativo e houve retorno social registrado no modelo.",
        });
        findings.push(
          "✅ Retorno Social: o mecanismo de royalties estava ativo e houve retorno social registrado no modelo.",
        );
      } else {
        criteria.push({
          id: "retorno_social",
          status: "not_matched",
          weight: 10,
          finding: "Mecanismo ativo sem retorno social registrado no modelo.",
        });
      }
    } else {
      criteria.push({
        id: "retorno_social",
        status: "not_applicable",
        weight: 10,
        finding: "Mecanismo de royalties desabilitado no cenário.",
      });
    }

    // Fato estilizado 9: Concentration of High-Risk Products (HHI High-Risk)
    // Sem produtos de alto risco não existe distribuição a avaliar.
    // A contagem usa a MESMA população ativa do HHI (§9.3).
    const highRiskCount = activeCompanies.reduce(
      (acc: number, c: Company) =>
        acc + (c.products || []).filter((p) => p.riskLevel === "HIGH").length,
      0,
    );
    if (highRiskCount === 0) {
      criteria.push({
        id: "hhi_alto_risco",
        status: "not_applicable",
        weight: 10,
        finding: "Critério não avaliável: não houve produtos de alto risco no cenário modelado.",
      });
      findings.push(
        "ℹ️ Critério não avaliável: não houve produtos de alto risco no cenário modelado.",
      );
    } else {
      applicableScore += 10;
      const finalProductHHI = finalState.hhiHighRiskProducts || 0;
      if (finalProductHHI > 4000) {
        criteria.push({
          id: "hhi_alto_risco",
          status: "not_matched",
          weight: 10,
          finding: "Concentração de alto risco: proxy em faixa muito elevada no cenário.",
        });
        findings.push(
          "🚨 Concentração de alto risco: proxy em faixa muito elevada no cenário.",
        );
      } else if (finalProductHHI > 2500) {
        criteria.push({
          id: "hhi_alto_risco",
          status: "not_matched",
          weight: 10,
          finding: "Concentração de alto risco: proxy em faixa elevada no cenário.",
        });
        findings.push(
          "⚠️ Concentração de alto risco: proxy em faixa elevada no cenário.",
        );
      } else {
        earnedScore += 10;
        criteria.push({
          id: "hhi_alto_risco",
          status: "matched",
          weight: 10,
          finding: "Distribuição de sistemas de alto risco compatível com dispersão entre agentes.",
        });
        findings.push(
          "✅ Diversidade de Risco: distribuição de sistemas de alto risco compatível com dispersão entre agentes.",
        );
      }
    }

    const applicableCriteria = criteria
      .filter((c) => c.status !== "not_applicable")
      .map((c) => c.id);
    const notApplicableCriteria = criteria
      .filter((c) => c.status === "not_applicable")
      .map((c) => c.id);

    // Índice normalizado (secundário): apenas critérios aplicáveis no
    // denominador. Não é indicador de qualidade do cenário.
    const normalizedScore =
      applicableScore > 0 ? (earnedScore / applicableScore) * MAX_POINTS : 0;

    return {
      coherenceIndex: Math.round(Math.min(MAX_POINTS, normalizedScore)),
      earnedScore,
      applicableScore,
      criteria,
      applicableCriteria,
      notApplicableCriteria,
      findings,
      timestamp: new Date().toISOString(),
    };
  }
}
