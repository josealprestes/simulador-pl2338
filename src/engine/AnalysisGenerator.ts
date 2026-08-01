import type { SimulationState, CriticalEvent } from "./types";
import { getAIProviderConfig } from "@/lib/aiConfigStorage";

export interface AnalysisResult {
  summary: string;
  marketAnalysis: string;
  trustAnalysis: string;
  adoptionAnalysis: string;
  riskAssessment: string;
  recommendations: string;
  fullReport?: string; // Full markdown report (800-1200 words)
  source: "ai" | "heuristic"; // Fonte real do parecer, para rótulo 1:1
}

/** Extract a markdown section by heading text (## level). */
function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
  const m = markdown.match(re);
  return m ? m[1].trim() : "";
}

export class AnalysisGenerator {
  static async generate(
    history: SimulationState[],
    criticalEvents: CriticalEvent[],
    playbook?: Record<string, unknown> | null,
  ): Promise<AnalysisResult> {
    const config = getAIProviderConfig();
    if (config) {
      try {
        const result = await this.generateWithLLM(history, criticalEvents, config, playbook);
        return { ...result, source: "ai" as const };
      } catch {
        // Fallback to heuristic
      }
    }
    return this.generateHeuristic(history, criticalEvents, playbook, config?.model || "Heurística");
  }

  private static buildSimulationDataBlock(
    history: SimulationState[],
    criticalEvents: CriticalEvent[],
    playbook?: Record<string, unknown> | null,
  ): string {
    const first = history[0] || {};
    const last = history[history.length - 1] || {};
    const executedTurns = history.length > 0 ? history[history.length - 1].turn : 0;

    const keyParams = [
      `Startups iniciais: ${first.activeStartups ?? 0}`,
      `Big Techs iniciais: ${first.activeBigTechs ?? 0}`,
      `Capital médio inicial: R$ ${(first.avgCapital ?? 0).toFixed(0)}`,
      `HHI inicial: ${(first.hhi ?? 0).toFixed(2)}`,
      `Confiança inicial: ${((first.socialTrust ?? 0)).toFixed(0)}%`,
      `Produtos iniciais: ${first.totalProducts ?? 0}`,
    ].join("; ");

    const finalMetrics = [
      `Startups finais: ${last.activeStartups ?? 0}`,
      `Big Techs finais: ${last.activeBigTechs ?? 0}`,
      `Proxy de concentração de capital (HHI) final: ${(last.hhi ?? 0).toFixed(2)}`,
      `Confiança final: ${((last.socialTrust ?? 0)).toFixed(0)}%`,
      `Produtos totais: ${last.totalProducts ?? 0}`,
      `Produtos conformes: ${last.compliantProducts ?? 0}`,
      `Produtos não conformes: ${last.nonCompliantProducts ?? 0}`,
      `Capital médio final: R$ ${(last.avgCapital ?? 0).toFixed(0)}`,
      `Dreno cloud: ${(last.cloudDrain ?? 0).toFixed(0)}`,
      `Fundos estatais usados: ${(last.stateFundsUsed ?? 0).toFixed(0)}`,
      `Incidentes sistêmicos: ${last.systemicIncidentCount ?? 0}`,
    ].join("; ");

    const eventsList = criticalEvents.length > 0
      ? criticalEvents.map((e) => `[T${e.turn}] ${e.type}: ${e.text}`).join("; ")
      : "Nenhum evento crítico registrado.";

    // Identify inflection points from history
    const inflections: string[] = [];
    if (history.length > 2) {
      let prevHHI = first.hhi ?? 0;
      let prevTrust = first.socialTrust ?? 0;
      for (let i = 1; i < history.length; i++) {
        const currentHHI = history[i].hhi ?? 0;
        const currentTrust = history[i].socialTrust ?? 0;
        const hhiDiff = Math.abs(currentHHI - prevHHI);
        const trustDiff = Math.abs(currentTrust - prevTrust);
        if (hhiDiff > 200) {
          inflections.push(`Turno ${history[i].turn}: HHI variou ${currentHHI > prevHHI ? "+" : ""}${(currentHHI - prevHHI).toFixed(0)} pontos`);
        }
        if (trustDiff > 10) {
          inflections.push(`Turno ${history[i].turn}: Confiança variou ${currentTrust > prevTrust ? "+" : ""}${(currentTrust - prevTrust).toFixed(0)} pontos`);
        }
        prevHHI = currentHHI;
        prevTrust = currentTrust;
      }
    }
    const inflectionText = inflections.length > 0
      ? inflections.slice(0, 10).join("; ")
      : "Sem variações significativas detectadas.";

    const author = String(playbook?.author || "Não especificado");
    const work = String(playbook?.work || "Não especificado");
    const name = String(playbook?.name || "Simulação");

    return [
      `- Cenário: ${name}`,
      `- Base teórica: ${author} — ${work}`,
      `- Turnos executados: ${executedTurns}`,
      `- Parâmetros iniciais: ${keyParams}`,
      `- Métricas finais: ${finalMetrics}`,
      `- Eventos críticos: ${eventsList}`,
      `- Mudanças ao longo do tempo: ${inflectionText}`,
    ].join("\n");
  }

  private static async generateWithLLM(
    history: SimulationState[],
    criticalEvents: CriticalEvent[],
    config: { endpoint: string; apiKey: string; model: string },
    playbook?: Record<string, unknown> | null,
  ): Promise<AnalysisResult> {
    const dataBlock = this.buildSimulationDataBlock(history, criticalEvents, playbook);
    const scenarioName = String(playbook?.name || "Simulação");

    const systemPrompt =
      "Você é um analista regulatório especializado em inteligência artificial e política pública no Brasil.";

    const userPrompt = `Analise os dados da simulação abaixo e gere um RELATÓRIO INTERPRETATIVO AUTOMATIZADO DA SIMULAÇÃO em português brasileiro, com extensão estrita de 1000 a 1200 palavras, seguindo EXATAMENTE esta estrutura:

# Relatório: ${scenarioName}

## Resumo Executivo (100-150 palavras)
- Visão geral do cenário simulado
- Resultado principal

## Contexto Teórico (150-200 palavras)
- Base teórica do playbook
- Premissas de modelagem

## Análise dos Resultados (300-400 palavras)
- Evolução dos KPIs ao longo dos turnos
- Pontos de inflexão
- Comparação com baseline

## Sinais Identificados (200-250 palavras)
- Concentração de mercado (HHI)
- Confiança social
- Dinâmica de adoção
- Inovação e criação de mercado

## Possíveis Riscos (150-200 palavras)
- Riscos identificados
- Possíveis riscos e contexto regulatório

## Observações Finais (50-100 palavras)
- Síntese

DADOS DA SIMULAÇÃO:
${dataBlock}

IMPORTANTE:
- O relatório deve ter estritamente entre 1000 e 1200 palavras, confrontando o cenário com a base legal (PL 2338) e bibliografia do playbook.
- Use linguagem técnica acessível
- Cite os autores e teorias relevantes ao playbook
- Seja específico com os dados numéricos da simulação
- Formato Markdown válido`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`LLM error: ${res.status}`);

      const data = await res.json();
      const fullReport: string = data.choices?.[0]?.message?.content || "";

      if (!fullReport) throw new Error("Empty LLM response");

      // Extract sections from the structured report
      const executiveSummary = extractSection(fullReport, "Resumo Executivo");
      const riskSection = extractSection(fullReport, "Possíveis Riscos");
      const recommendations = riskSection.split(/\n[-*]\s*/).filter(Boolean).slice(1).join(" ") || riskSection;

      // Extract sub-sections for backward compatibility
      const marketAnalysis = extractSection(fullReport, "Análise dos Resultados");
      const trustAnalysis = extractSection(fullReport, "Sinais Identificados");

      return {
        summary: executiveSummary || fullReport.slice(0, 500).trim(),
        marketAnalysis: marketAnalysis.slice(0, 500).trim(),
        trustAnalysis: trustAnalysis.slice(0, 500).trim(),
        adoptionAnalysis: "",
        riskAssessment: riskSection.slice(0, 500).trim(),
        recommendations: recommendations.slice(0, 500).trim(),
        fullReport,
        source: "ai" as const,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  static generateHeuristic(
    history: SimulationState[],
    criticalEvents: CriticalEvent[],
    playbook?: Record<string, unknown> | null,
    modelName?: string,
  ): AnalysisResult {
    if (history.length < 2) {
      const msg = "Dados insuficientes para gerar análise. Execute ao menos 2 turnos.";
      return {
        summary: msg,
        marketAnalysis: "",
        trustAnalysis: "",
        adoptionAnalysis: "",
        riskAssessment: "",
        recommendations: "",
        fullReport: `# Relatório: Análise Insuficiente\n\n## Resumo Executivo\n${msg}`,
        source: "heuristic" as const,
      };
    }

    const first = history[0] || {};
    const last = history[history.length - 1] || {};
    const executedTurns = history.length > 0 ? history[history.length - 1].turn : 0;

    const startupDelta = (last.activeStartups ?? 0) - (first.activeStartups ?? 0);
    const startupDrop = (first.activeStartups ?? 0) > 0
      ? (((first.activeStartups ?? 0) - (last.activeStartups ?? 0)) / (first.activeStartups ?? 0)) * 100
      : 0;
    const trustDelta = (last.socialTrust ?? 0) - (first.socialTrust ?? 0);
    const trustDrop = (first.socialTrust ?? 0) - (last.socialTrust ?? 0);
    const hhiChange = (last.hhi ?? 0) - (first.hhi ?? 0);

    const hasMonopoly = criticalEvents.some((e) => e.type === "MONOPOLY");
    const hasCrash = criticalEvents.some((e) => e.type === "CRASH");
    const hasTrustDrop = criticalEvents.some((e) => e.type === "TRUST_DROP");
    const hasInnovationSpike = criticalEvents.some((e) => e.type === "INNOVATION_SPIKE");
    const hasLobby = criticalEvents.some((e) => e.type === "LOBBY");
    const hasNegligence = criticalEvents.some((e) => e.type === "NEGLIGENCE");

    const adoptionFinal = last.adoption;
    const adoptionInitial = first.adoption;

    const scenarioName = String(playbook?.name || "Simulação");
    const author = String(playbook?.author || "Não especificado");
    const work = String(playbook?.work || "Não especificado");
    const scenarioSummary = String(playbook?.scenarioSummary || "Cenário de simulação regulatória do PL 2338/2023.");
    const theoreticalBasis = String(playbook?.theoreticalBasis || scenarioSummary.slice(0, 500));

    // --- Build risk factors and recommendations ---
    const riskFactors: string[] = [];
    if ((last.hhi ?? 0) > 2500) riskFactors.push("concentração de mercado");
    if ((last.socialTrust ?? 0) < 40) riskFactors.push("confiança social crítica");
    if (startupDrop > 50) riskFactors.push("mortalidade elevada de startups");
    if ((last.systemicIncidentCount ?? 0) > 3) riskFactors.push("incidentes sistêmicos");
    if (adoptionFinal && (adoptionFinal.substitutionRate ?? 0) > 0.6) riskFactors.push("dominância substitutiva de IA");
    if (hasCrash) riskFactors.push("ocorrência de onda de falências");
    if (hasMonopoly) riskFactors.push("formação de monopólio");
    if (hasTrustDrop) riskFactors.push("queda acentuada de confiança social");

    const recommendationsList: string[] = [];
    if ((last.hhi ?? 0) > 2500) {
      recommendationsList.push("Executar cenários adicionais com custos de conformidade e mecanismos de entrada alternativos, comparando a sensibilidade do proxy de concentração.");
    }
    if ((last.socialTrust ?? 0) < 50) {
      recommendationsList.push("Examinar em simulações adicionais a sensibilidade da confiança a incidentes, transparência e mecanismos de participação.");
    }
    if (startupDrop > 30) {
      recommendationsList.push("Comparar parametrizações de custos para pequenas empresas e diferentes intensidades de sandbox regulatório.");
    }
    if (adoptionFinal && (adoptionFinal.substitutionRate ?? 0) > 0.4) {
      recommendationsList.push("Executar análises de sensibilidade sobre adoção substitutiva e seus efeitos internos sobre confiança e emprego modelado.");
    }
    if (hasNegligence) {
      recommendationsList.push("Comparar cenários com probabilidades de auditoria e custos de conformidade distintos após eventos de negligência.");
    }
    if (hasLobby) {
      recommendationsList.push("Examinar a trajetória dos eventos de lobby e sua associação interna com auditoria e concentração, sem inferir causalidade externa.");
    }
    if (recommendationsList.length === 0) {
      recommendationsList.push("Executar novas sementes e análises de sensibilidade antes de formular qualquer conclusão externa ao modelo.");
    }

    // --- Adoption analysis text ---
    let adoptionText: string;
    if (adoptionInitial && adoptionFinal) {
      const compShift = (adoptionFinal.adoptionComplementary ?? 0) - (adoptionInitial.adoptionComplementary ?? 0);
      const substShift = (adoptionFinal.adoptionSubstitutive ?? 0) - (adoptionInitial.adoptionSubstitutive ?? 0);
      const genShift = (adoptionFinal.adoptionGenerative ?? 0) - (adoptionInitial.adoptionGenerative ?? 0);
      adoptionText = `ao longo dos ${executedTurns} turnos executados, a adoção de IA Complementar passou de ${((adoptionInitial.adoptionComplementary ?? 0) * 100).toFixed(0)}% para ${((adoptionFinal.adoptionComplementary ?? 0) * 100).toFixed(0)}% (${compShift >= 0 ? "+" : ""}${(compShift * 100).toFixed(0)} pontos percentuais). A IA Substitutiva variou de ${((adoptionInitial.adoptionSubstitutive ?? 0) * 100).toFixed(0)}% para ${((adoptionFinal.adoptionSubstitutive ?? 0) * 100).toFixed(0)}% (${substShift >= 0 ? "+" : ""}${(substShift * 100).toFixed(0)} pp). A IA Generativa passou de ${((adoptionInitial.adoptionGenerative ?? 0) * 100).toFixed(0)}% para ${((adoptionFinal.adoptionGenerative ?? 0) * 100).toFixed(0)}% (${genShift >= 0 ? "+" : ""}${(genShift * 100).toFixed(0)} pp). A taxa de substituição final atingiu ${((adoptionFinal.substitutionRate ?? 0) * 100).toFixed(0)}%, e a velocidade de adoção foi de ${(adoptionFinal.adoptionVelocity ?? 0).toFixed(4)} por turno.`;
      if ((adoptionFinal.substitutionRate ?? 0) > 0.5) {
        adoptionText += " A dominância da IA Substitutiva representa um risco significativo de erosão de confiança e deslocamento de mão de obra.";
      }
    } else {
      adoptionText = "dados de curva de adoção não disponíveis para esta simulação.";
    }

    // --- Build the full report ---
    const fullReport = `# Relatório: ${scenarioName}

## Resumo Executivo
A simulação regulatória foi executada ao longo de ${executedTurns} turnos executados, modelando o cenário "${scenarioName}" fundamentado na teoria de ${author} (${work}). O objetivo desta análise é explorar as trajetórias emergentes da aplicação dos dispositivos do PL 2338/2023 sobre o ecossistema brasileiro de Inteligência Artificial no modelo. O resultado principal descreve um ecossistema que evoluiu de ${first.activeStartups ?? 0} para ${last.activeStartups ?? 0} startups ativas, com o Índice Herfindahl-Hirschman (HHI) variando de ${(first.hhi ?? 0).toFixed(0)} para ${(last.hhi ?? 0).toFixed(0)} pontos e a confiança social de ${((first.socialTrust ?? 0)).toFixed(0)}% para ${((last.socialTrust ?? 0)).toFixed(0)}%. ${criticalEvents.length > 0 ? `Foram registrados ${criticalEvents.length} evento(s) crítico(s) que alteraram a trajetória da simulação.` : "Nenhum evento crítico disruptivo foi registrado."} Esta síntese fornece uma visão inicial descritiva do cenário modelado, sem declarar viabilidade normativa ou eficácia jurídica.

## Contexto Teórico
${theoreticalBasis}

A modelagem deste cenário parte das premissas centrais da tese de ${author}, conforme apresentada em ${work}. O PL 2338/2023 fornece o arcabouço legal que fundamenta os parâmetros simulados, incluindo mecanismos de sandbox regulatório (Art. 54), custos de conformidade diferenciados para sistemas de alto risco (Art. 17) e instrumentos de governança algorítmica (Art. 25). A simulação investiga a "Análise Econômica do Direito" aplicada à IA, onde o regulador busca o equilíbrio entre a mitigação de riscos existenciais e a preservação do dinamismo inovador.

A teoria de ${author} sugere que agentes econômicos respondem a incentivos regulatórios de forma não linear. Em sistemas complexos, a introdução de uma norma pode gerar externalidades positivas (como o aumento da confiança social e segurança jurídica) ou negativas (como o "regulatory capture" ou o asfixiamento de novos entrantes por custos fixos de conformidade). Este relatório audita precisamente essa tensão dialética.

## Análise dos Resultados
Ao longo dos ${executedTurns} turnos executados, que representam a evolução temporal do mercado sob a égide do PL 2338, os indicadores apresentaram comportamentos que demandam interpretação detalhada:

**Dinamismo Empresarial (Startups):** a base de startups passou de ${first.activeStartups ?? 0} para ${last.activeStartups ?? 0} unidades, representando uma variação de ${startupDelta >= 0 ? "+" : ""}${startupDelta} empresas (${startupDrop >= 0 ? "redução de " + startupDrop.toFixed(0) + "%" : "crescimento de " + Math.abs(startupDrop).toFixed(0) + "%"}). ${startupDrop > 50 ? "a redução é compatível com pressões previstas no modelo (carga regulatória ou competição de incumbentes), mas a trajetória isolada não identifica a causa." : startupDrop > 25 ? "a redução moderada é compatível com pressão seletiva no cenário modelado." : "a preservação ou crescimento da base é compatível com os mecanismos de fomento e sandbox habilitados no cenário."}

**Estrutura de Mercado (Big Techs):** as big techs encerraram com ${last.activeBigTechs ?? 0} empresas ativas. A estabilidade ou variação neste grupo descreve a trajetória das incumbentes no cenário modelado.

**Concentração de Mercado (proxy de capital):** o índice Herfindahl-Hirschman sobre o capital das empresas ativas (HHI de capital), que funciona como proxy de concentração e não mede diretamente poder de mercado, variou de ${(first.hhi ?? 0).toFixed(0)} para ${(last.hhi ?? 0).toFixed(0)} pontos. ${(last.hhi ?? 0) > 2500 ? "o patamar final acima de 2.500 pontos (referência indicativa não calibrada para este proxy) é compatível com concentração patrimonial elevada no cenário." : (last.hhi ?? 0) > 1500 ? "a faixa intermediária do proxy é compatível com concentração patrimonial moderada no cenário." : "o proxy de capital em faixa baixa é compatível com um cenário menos concentrado."}

**Confiança Social e Legitimidade:** a confiança social, pilar de sustentação da adoção tecnológica, passou de ${((first.socialTrust ?? 0)).toFixed(0)}% para ${((last.socialTrust ?? 0)).toFixed(0)}%. ${(last.socialTrust ?? 0) < 40 ? "o nível baixo de confiança é compatível com trajetórias de queda após incidentes; a série completa deve ser examinada." : "a manutenção de níveis altos de confiança é compatível com o cenário modelado e com os direitos garantidos aos titulares (Arts. 4º a 6º do PL 2338)."}

**Conformidade e Produtos:** o mercado acumulou ${last.totalProducts ?? 0} produtos. A taxa de conformidade de ${(((last.compliantProducts ?? 0) / Math.max(last.totalProducts ?? 0, 1)) * 100).toFixed(0)}% descreve o estado final de conformidade no cenário modelado.

## Sinais Identificados
A leitura dos sinais internos resume padrões emergentes observados nas métricas do modelo:

**Concentração e Poder de Mercado:** ${(last.hhi ?? 0) > 2500 ? "identificou-se um possível risco sistêmico de concentração (com base no proxy de capital). Quando os custos de conformidade (Art. 25) são elevados e fixos, as Big Techs conseguem diluí-los em escala, enquanto as startups exaurem seu capital inicial em processos de auditoria." : "o proxy de capital permaneceu em faixa inferior no cenário; esse resultado deve ser comparado com outras parametrizações."} A variação de ${hhiChange.toFixed(0)} pontos ${hhiChange > 500 ? "pode representar uma mudança estrutural profunda na topologia do mercado" : "indica estabilidade nas relações de força econômica"}.

**Confiança e Proteção de Direitos:** o PL 2338 foca na proteção de direitos fundamentais. A confiança de ${((last.socialTrust ?? 0)).toFixed(0)}% indica como a população percebe o risco de viés algorítmico e danos à privacidade. ${hasTrustDrop ? "o evento de queda brusca de confiança registrado na simulação serve como alerta para a fragilidade do contrato social tecnológico." : "a trajetória de confiança permaneceu sem queda crítica no cenário; isso não demonstra efeito causal da regulação."}

**Dinâmica de Adoção de IA:** ${adoptionText} A trajetória de adoção observada decorre das regras e parâmetros internos do cenário e não permite inferência direta sobre a economia brasileira.

**Inovação e Criação de Mercado:** ${last.marketCreation ? "o índice de diversidade de mercado (" + (last.marketCreation.diversityIndex ?? 0).toFixed(2) + ") acompanhou " + (last.marketCreation.innovatingCompanies ?? 0) + " empresas inovadoras no cenário modelado." : "a criação de novos nichos de mercado foi moderada."} A métrica descreve apenas a diversidade produzida pelas premissas do modelo.

## Possíveis Riscos
Com base na auditoria da simulação, identificam-se os seguintes pontos de atenção para formuladores de políticas:

**Riscos identificados:**
${riskFactors.length > 0 ? riskFactors.map((f) => "- **" + f.charAt(0).toUpperCase() + f.slice(1) + "**: risco detectado conforme os limites de segurança do modelo ABM.").join("\n") : "- Nenhum fator de risco crítico identificado sob as premissas atuais."}

**Sinais para análise adicional:**
${recommendationsList.map((r) => "- " + r).join("\n")}
- **Dreno de infraestrutura**: examinar o dreno de capital para infraestruturas estrangeiras (${(last.cloudDrain ?? 0).toFixed(0)}) em análises de sensibilidade.
- **Open Source**: avaliar em cenários adicionais o efeito de alternativas que reduzam a dependência de APIs proprietárias.

## Conclusão
A simulação do cenário "${scenarioName}" sob os parâmetros do PL 2338/2023 produziu trajetórias compatíveis com as premissas modeladas. Nos ${executedTurns} turnos executados, a confiança social apresentou a trajetória registrada nas métricas do modelo. 

O proxy de concentração de capital (HHI, ${(last.hhi ?? 0).toFixed(0)}) e a sobrevivência de startups (${last.activeStartups ?? 0}) podem servir como pontos de atenção em análises subsequentes, devendo ser comparados com outras parametrizações e com evidência externa. A trajetória observada é compatível com ${startupDrop > 30 ? "redução de entrantes acompanhada pelos demais indicadores do cenário" : "manutenção relativa de agentes sob os parâmetros do cenário"} no cenário modelado, sem que isto implique causalidade comprovada da legislação. O simulador é uma ferramenta de exploração de trajetórias possíveis, não de previsão empírica.
---

*Relatório emitido via ${modelName || "Heurística"} em ${new Date().toLocaleString("pt-BR")}.*

*Este é um relatório interpretativo automatizado produzido por regras heurísticas determinísticas aplicadas aos resultados da simulação. Não constitui previsão, validação empírica, parecer jurídico ou recomendação para tomada de decisão.*`;

    // --- Build individual fields from the report ---
    const executiveSummaryText = extractSection(fullReport, "Resumo Executivo");
    const riskSectionText = extractSection(fullReport, "Possíveis Riscos");
    const recommendationsFromSection = riskSectionText
      .split(/\n[-*]\s*/)
      .filter(Boolean)
      .slice(1)
      .join(" ")
      .trim() || recommendationsList.join(" ");
    const marketAnalysisText = extractSection(fullReport, "Análise dos Resultados");
    const trustAnalysisText = extractSection(fullReport, "Sinais Identificados");

    return {
      summary: executiveSummaryText || `Simulação com ${executedTurns} turnos executados. HHI: ${(last.hhi ?? 0).toFixed(0)}. Confiança: ${((last.socialTrust ?? 0)).toFixed(0)}%. Startups: ${last.activeStartups ?? 0}.`,
      marketAnalysis: marketAnalysisText.trim(),
      trustAnalysis: trustAnalysisText.trim(),
      adoptionAnalysis: adoptionText.trim(),
      riskAssessment: `Proxy de concentração de capital (HHI) final: ${(last.hhi ?? 0).toFixed(2)}. Confiança: ${((last.socialTrust ?? 0)).toFixed(0)}%. Riscos: ${riskFactors.length > 0 ? riskFactors.join(", ") : "nenhum crítico"}.`,
      recommendations: recommendationsFromSection || recommendationsList.join(" "),
      fullReport,
      source: "heuristic" as const,
    };
  }
}
