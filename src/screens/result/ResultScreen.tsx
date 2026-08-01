import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useSimulationStore } from "@/stores/simulation.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { AnalysisGenerator } from "@/engine/AnalysisGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { formatKPI, formatCurrencyShort } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ReaderIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import type { Screen } from "@/stores/navigation.store";
import type { AnalysisResult } from "@/engine/AnalysisGenerator";
import type { SimulationState } from "@/engine/types";
import { PageHeader } from "@/components/PageHeader";
import { MarkdownReport } from "@/components/MarkdownReport";
import {
  signed,
  buildDecisionAxes,
  buildExecutiveSummary,
  buildReportText,
  type DecisionAxis,
  type CriticalEventView,
} from "@/lib/resultHelpers";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#001c25",
  border: "1px solid #13323c",
  borderRadius: "8px",
  fontSize: 12,
};

const axisToneStyles: Record<DecisionAxis["tone"], string> = {
  success: "border-success/30 bg-success/10",
  warning: "border-warning/30 bg-warning/10",
  danger: "border-error/30 bg-error/10",
  info: "border-primary/30 bg-primary/10",
};

export default function ResultScreen() {
  const { t, i18n } = useTranslation();
  const { turn, history, params, computationalTime, simulation, wasSkipped, aiReportText, aiGenerationSource } = useSimulationStore();
  const { setScreen } = useNavigationStore();
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingLatex, setExportingLatex] = useState(false);

  const finalState = history[history.length - 1];
  const maxTurns = params?.maxTurns ?? 50;
  const ui = (pt: string, en: string) => i18n.language.startsWith("en") ? en : pt;
  const playbook = useSimulationStore.getState().currentPlaybookData as Record<string, unknown> | null;

  const chartData = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        ...(h.adoption ?? {}),
        ...(h.marketCreation ?? {}),
        trust: Math.round(h.socialTrust),
        displayRunway: Number(h.avgRunway) === Infinity ? 50 : Math.min(50, Number(h.avgRunway)),
        compliancePct: (Number(h.compliantProductsRatio) || 0) * 100,
      })),
    [history],
  );

  const criticalEvents = (simulation?.criticalEvents ?? []) as Array<{
    turn: number;
    type: string;
    text: string;
  }>;
  const firstState = history[0];
  const decisionAxes = finalState && firstState
    ? buildDecisionAxes(firstState, finalState, criticalEvents)
    : [];
  const executiveSummary = finalState && firstState
    ? buildExecutiveSummary(firstState, finalState, criticalEvents, maxTurns)
    : null;
  const fallbackReportText = executiveSummary
    ? buildReportText(executiveSummary, decisionAxes)
    : "";

  const handleGenerateAI = useCallback(async () => {
    setGeneratingAi(true);
    try {
      const result = await AnalysisGenerator.generate(history, (simulation?.criticalEvents as any[]) ?? [], playbook);
      setAiAnalysis(result);
      setShowAi(true);
      // Persiste o parecer e a fonte real no store (consumo 1:1 pela tela e relatório)
      if (result.fullReport) {
        useSimulationStore.getState().setAiReportText(result.fullReport);
      }
      useSimulationStore.getState().setAiGenerationSource(result.source);
    } catch (err) {
      console.error("AI report generation error:", err);
    } finally {
      setGeneratingAi(false);
    }
  }, [history, simulation, playbook]);

  // ── Geração automática do parecer ao final da simulação ──
  // O parecer (IA se configurada, senão heurística completa) é gerado uma
  // única vez ao término, persistido no store, e consumido 1:1 pela tela de
  // resultados e pelos relatórios (PDF/LaTeX).
  useEffect(() => {
    if (!finalState) return;
    const finished = wasSkipped || turn >= maxTurns;
    if (!finished) return;
    if (aiAnalysis || aiReportText || generatingAi) return;
    void handleGenerateAI();
  }, [finalState, wasSkipped, turn, maxTurns, aiAnalysis, aiReportText, generatingAi, handleGenerateAI]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${m}:${s}`;
  };

  /** Monta o parecer para exportação: sempre o texto 1:1 gerado (IA ou heurística). */
  const buildReportPayload = () => {
    let reportFull = aiAnalysis?.fullReport || aiReportText || undefined;
    // Fonte real: do resultado gerado nesta sessão ou persistida no store/histórico
    const source: "ai" | "heuristic" =
      aiAnalysis?.source ?? (aiGenerationSource === "ai" ? "ai" : "heuristic");

    // Caso extremo (sem parecer persistido): gera o heurístico completo, nunca o resumo raso
    if (!reportFull) {
      const heuristic = AnalysisGenerator.generateHeuristic(
        history,
        (simulation?.criticalEvents ?? []) as Array<{ turn: number; type: string; text: string }>,
        playbook,
        "Heurística",
      );
      reportFull = heuristic.fullReport;
    }
    return { reportFull, source, aiText: reportFull || fallbackReportText };
  };

  const handleExportFullReport = async () => {
    setExporting(true);
    try {
      const { exportFullReportPDF } = await import("@/lib/exportReport");
      const { reportFull, source, aiText } = buildReportPayload();

      await exportFullReportPDF({
        history,
        playbookName: String(playbook?.name || "Simulação"),
        analysisText: aiText,
        fullReport: reportFull,
        criticalEvents,
        params: params ?? undefined,
        decisionAxes,
        executiveSummary: executiveSummary ?? undefined,
        aiGenerationSource: source,
        computationalTime,
        // Metadados do provedor EFETIVO de decisão (reprodutibilidade real).
        strictlyReproducible: simulation?.decisionMetadata.strictlyReproducible,
        seed: simulation?.seed,
        executedTurns: simulation?.turn,
        snapshotCount: simulation?.history.length,
        externalLLMUsed: simulation?.decisionMetadata.externalLLMUsed,
        decisionProvider: simulation?.decisionMetadata.provider,
        decisionMode: simulation?.decisionMetadata.mode,
      });
    } catch (err) {
      console.error("Export result report error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportLatex = async () => {
    setExportingLatex(true);
    try {
      const { generateLatexReport } = await import("@/lib/reportLatex");
      const { saveAs } = await import("file-saver");
      const { reportFull, source, aiText } = buildReportPayload();

      const tex = generateLatexReport({
        history,
        playbookName: String(playbook?.name || "Simulação"),
        analysisText: aiText,
        fullReport: reportFull,
        criticalEvents,
        params: params ?? undefined,
        decisionAxes,
        executiveSummary: executiveSummary ?? undefined,
        aiGenerationSource: source,
        computationalTime,
        // Metadados do provedor EFETIVO de decisão (reprodutibilidade real).
        strictlyReproducible: simulation?.decisionMetadata.strictlyReproducible,
        seed: simulation?.seed,
        executedTurns: simulation?.turn,
        snapshotCount: simulation?.history.length,
        externalLLMUsed: simulation?.decisionMetadata.externalLLMUsed,
        decisionProvider: simulation?.decisionMetadata.provider,
        decisionMode: simulation?.decisionMetadata.mode,
      });
      const blob = new Blob([tex], { type: "application/x-tex;charset=utf-8" });
      saveAs(blob, `relatorio-${String(playbook?.name || "simulacao").replace(/\s+/g, "-").toLowerCase()}.tex`);
    } catch (err) {
      console.error("Export LaTeX report error:", err);
    } finally {
      setExportingLatex(false);
    }
  };

  return (
    <div role="main" aria-labelledby="result-title" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title={String(playbook?.name || t("result.title", "Resumo da Simulação"))}
        subtitle={`${turn} ${t("result.turns_label", "turnos simulados")} | ${formatDuration(computationalTime)}`}
        showHomeButton={true}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportFullReport}
              disabled={!finalState || exporting}
              aria-label={t("result.export_pdf_full", "PDF Completo")}
            >
              {exporting ? t("common.loading", "Carregando...") : t("result.export_pdf_full", "PDF Completo")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLatex}
              disabled={!finalState || exportingLatex}
              aria-label={t("result.export_latex", "Exportar LaTeX")}
            >
              {exportingLatex ? t("common.loading", "Carregando...") : t("result.export_latex", "Exportar LaTeX")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScreen("SIMULATION" as Screen)} disabled={exporting}>
              {t("result.back_simulation", "Voltar à Simulação")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScreen("HOME" as Screen)} disabled={exporting}>
              <Cross2Icon width={16} height={16} />
              {t("result.close", "Fechar")}
            </Button>
          </>
        }
      />

      {finalState && (
        <>
          {wasSkipped && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-on-surface text-sm">
                {ui("Esta simulação foi executada diretamente ao final. Os turnos intermediários não foram visualizados.", "This simulation was executed directly to completion. Intermediate turns were not displayed.")}
              </p>
              <Button variant="outline" size="sm" onClick={() => setScreen("SIMULATION" as Screen)}>
                {t("result.back_simulation", "Voltar à Simulação")}
              </Button>
            </div>
          )}

          {executiveSummary && (
            <Card>
              <CardContent className="space-y-5 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-4xl">
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                      {ui("Síntese decisória", "Decision summary")}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-on-surface">
                      {executiveSummary.verdict}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                      {executiveSummary.whyItMatters}
                    </p>
                  </div>
                  <aside className="border border-outline-variant/40 bg-surface-container-low/40 p-4 text-sm lg:max-w-sm">
                    <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                      {ui("Próxima decisão", "Next step")}
                    </div>
                    <p className="mt-2 leading-relaxed text-on-surface">
                      {executiveSummary.recommendation}
                    </p>
                  </aside>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {decisionAxes.map((axis) => (
                    <div key={axis.title} className={`border p-4 ${axisToneStyles[axis.tone]}`}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                        {axis.title}
                      </div>
                      <div className="mt-2 text-lg font-bold text-on-surface">{axis.value}</div>
                      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                        {axis.finding}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-on-surface">
                        {axis.implication}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-outline-variant/30 pt-3 text-sm leading-relaxed text-on-surface-variant">
                  <strong className="text-on-surface">{ui("Cautela:", "Caution:")}</strong> {executiveSummary.caution}
                </div>
              </CardContent>
            </Card>
          )}

          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label={t("result.kpi_section", "Principais indicadores de desempenho")}>
            {/* Standard UI Order: Social/Health -> Incentives/Innovation -> Risks/Regulatory -> Economic/Market */}
            <KpiCard label={ui("Confiança", "Trust")} value={formatKPI(finalState.socialTrust, "percentage")} status={finalState.socialTrust > 70 ? "success" : finalState.socialTrust > 40 ? "warning" : "danger"} tooltip="Confiança: índice 0-100%" />
            <KpiCard label="Startups" value={finalState.activeStartups} unit={ui("startups", "startups")} status={finalState.activeStartups > 5 ? "success" : "warning"} tooltip="Startups: empresas novas entrantes" />
            <KpiCard label={ui("Produtos", "Products")} value={finalState.totalProducts} unit={ui("produtos", "products")} tooltip="Produtos: total ofertados" />
            <KpiCard label="Big Techs" value={finalState.activeBigTechs} unit={ui("empresas", "companies")} tooltip="Big Techs: empresas estabelecidas" />
            <KpiCard label={ui("Concentração (capital)", "Capital concentration")} value={formatKPI(finalState.hhiCapital ?? finalState.hhi, "hhi")} status={(finalState.hhiCapital ?? finalState.hhi) > 2500 ? "danger" : (finalState.hhiCapital ?? finalState.hhi) > 1500 ? "warning" : "success"} tooltip="Proxy de concentração de capital (HHI): 0-10.000. Base: capital das empresas ativas." />
            <KpiCard label={ui("Capital Médio", "Average capital")} value={formatKPI(finalState.avgCapital, "currency")} tooltip="Capital Médio: capital por empresa" />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card id="chart-concentration-trust">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-on-surface mb-0">
                  {ui("Concentração e Confiança", "Concentration and trust")}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Proxy de concentração de capital (HHI): distribuição do capital entre as empresas ativas. 0 = concorrência perfeita, 10.000 = monopólio. Este proxy não mede diretamente poder de mercado.
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                    <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                    <YAxis stroke="#748389" fontSize={11} tickFormatter={(val) => formatKPI(val, "hhi")} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val: any, name: any) => [name === "HHI (capital)" ? formatKPI(val, "hhi") : val, name]} />
                    <Legend />
                    <Line type="monotone" dataKey="hhi" stroke="#22d3ee" name="HHI (capital)" dot={false} />
                    <Line type="monotone" dataKey="trust" stroke="#00ac4e" name="Confiança" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card id="chart-adoption-curves">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-on-surface mb-2">
                  {ui("Curvas de Adoção", "Adoption curves")}
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                    <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                    <YAxis stroke="#748389" fontSize={11} domain={[0, 1]} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    <Line type="monotone" dataKey="adoptionComplementary" stroke="#00acd8" name="Complementar" dot={false} />
                    <Line type="monotone" dataKey="adoptionSubstitutive" stroke="#ef6c22" name="Substitutiva" dot={false} />
                    <Line type="monotone" dataKey="adoptionGenerative" stroke="#9867e1" name="Generativa" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card id="chart-demographics">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-on-surface mb-0">
                  {ui("Demografia Empresarial", "Business demography")}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Big Techs: empresas com capital inicial alto. Startups: empresas novas entrantes.
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                    <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                    <YAxis stroke="#748389" fontSize={11} label={{ value: "unidades", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#748389" } }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    <Line type="monotone" dataKey="activeStartups" stroke="#00acd8" name="Startups" dot={false} />
                    <Line type="monotone" dataKey="activeBigTechs" stroke="#ef6c22" name="Big Techs" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card id="chart-products">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-on-surface mb-0">
                  Produtos
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Produtos: quantidade total ofertada no mercado simulado.
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                    <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                    <YAxis stroke="#748389" fontSize={11} label={{ value: "unidades", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#748389" } }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    <Line type="monotone" dataKey="totalProducts" stroke="#00ab8a" name="Total" dot={false} />
                    <Line type="monotone" dataKey="compliantProducts" stroke="#00ac4e" name="Conforme" dot={false} />
                    <Line type="monotone" dataKey="nonCompliantProducts" stroke="#d73626" name="Não Conforme" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card id="chart-capital-flow">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-on-surface mb-0">
                  {ui("Capital e Dreno", "Capital and drain")}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Capital: soma do capital das empresas ativas. Dreno: capital que sai do sistema (impostos, multas).
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                    <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                    <YAxis stroke="#748389" fontSize={11} tickFormatter={(val) => formatCurrencyShort(val)} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val: any) => formatKPI(val, "currency")} />
                    <Legend />
                    <Line type="monotone" dataKey="avgCapital" stroke="#9867e1" name="Capital Médio" dot={false} />
                    <Line type="monotone" dataKey="cloudDrain" stroke="#ef6c22" name="Dreno Cloud" dot={false} />
                    <Line type="monotone" dataKey="stateFundsUsed" stroke="#22d3ee" name="Fundo Estatal" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-base font-semibold text-on-surface mb-2">
                {t("result.events_title", "Eventos Críticos")}
              </h3>
              {criticalEvents.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  {t("result.no_events", "Nenhum evento crítico registrado.")}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {criticalEvents.map((event, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold shrink-0">[T{event.turn}]</span>
                      <span className="text-on-surface-variant">{event.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-on-surface">
                  {t("result.ai_analysis_title", "Relatório Interpretativo Automatizado")}
                </h3>
                <Button size="sm" variant="outline" onClick={handleGenerateAI} disabled={showAi || generatingAi}>
                  <ReaderIcon width={16} height={16} />
                  {generatingAi
                    ? t("result.generating", "Gerando...")
                    : showAi
                    ? t("result.generated", "Gerado")
                    : t("result.generate", "Gerar Análise")}
                </Button>
              </div>
              {showAi && aiAnalysis && (
                <div className="space-y-3 text-sm text-on-surface">
                  {aiAnalysis.fullReport ? (
                    <MarkdownReport content={aiAnalysis.fullReport} />
                  ) : (
                    <>
                      <p><strong className="text-primary">{t("result.summary", "Resumo")}:</strong> {aiAnalysis.summary}</p>
                      {aiAnalysis.marketAnalysis && <p><strong className="text-primary">{t("result.market", "Mercado")}:</strong> {aiAnalysis.marketAnalysis}</p>}
                      {aiAnalysis.trustAnalysis && <p><strong className="text-primary">{t("result.trust", "Confiança")}:</strong> {aiAnalysis.trustAnalysis}</p>}
                      {aiAnalysis.adoptionAnalysis && <p><strong className="text-primary">{t("result.adoption", "Adoção")}:</strong> {aiAnalysis.adoptionAnalysis}</p>}
                      {aiAnalysis.riskAssessment && <p><strong className="text-primary">{t("result.risk", "Risco")}:</strong> {aiAnalysis.riskAssessment}</p>}
                      {aiAnalysis.recommendations && <p><strong className="text-primary">{t("result.recommendations", "Recomendações")}:</strong> {aiAnalysis.recommendations}</p>}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
