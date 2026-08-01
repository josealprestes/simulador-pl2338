import { useMemo, useEffect, useState, useCallback } from "react";
import { Simulation } from "@/engine/Simulation";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ActivityLogIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  RocketIcon,
  HomeIcon,
  CheckCircledIcon,
  BarChartIcon,
  BoxIcon,
} from "@radix-ui/react-icons";
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
import { useSimulationStore } from "@/stores/simulation.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { KpiCard } from "@/components/KpiCard";
import { StatusBar } from "@/components/StatusBar";
import { saveSimulation } from "@/lib/simulationPersistence";
import { SimulationControls } from "@/components/SimulationControls";
import { ResultBanner } from "@/components/ResultBanner";
import type { Screen } from "@/stores/navigation.store";
import type { CriticalEvent, SimulationState } from "@/engine/types";
import { formatKPI, formatCurrencyShort } from "@/lib/format";
import { getKpiStatus } from "@/lib/utils";
import { KpiSelector } from "@/components/KpiSelector";
import { PageHeader } from "@/components/PageHeader";
import {
  signed,
  getRecentEvents,
  buildNarrativeSignals,
  buildNarrativeSummary,
  type NarrativeSignal,
} from "@/lib/narrativeHelpers";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#001c25",
  border: "1px solid #13323c",
  borderRadius: "8px",
  fontSize: 12,
};
const CHART_SERIES_CONFIG: Record<string, { color: string; label: string; yAxisId?: string; format?: string }> = {
  hhi: { color: "#22d3ee", label: "HHI", yAxisId: "hhi", format: "hhi" },
  socialTrust: { color: "#00ac4e", label: "Confiança", yAxisId: "trust", format: "percent" },
  activeStartups: { color: "#00acd8", label: "Startups" },
  activeBigTechs: { color: "#ef6c22", label: "Big Techs" },
  totalProducts: { color: "#00ab8a", label: "Total" },
  compliantProducts: { color: "#00ac4e", label: "Conforme" },
  nonCompliantProducts: { color: "#d73626", label: "Não Conforme" },
  avgCapital: { color: "#9867e1", label: "Capital Médio", format: "currency" },
  cloudDrain: { color: "#ef6c22", label: "Dreno Cloud", format: "currency" },
  stateFundsUsed: { color: "#22d3ee", label: "Fundo Estatal", format: "currency" },
  compliantProductsRatio: { color: "#00ac4e", label: "Conformidade", format: "percent" },
  avgRunway: { color: "#9867e1", label: "Runway Médio" },
  fineRevenue: { color: "#d73626", label: "Receita Multas", format: "currency" },
  auditRevenue: { color: "#ef6c22", label: "Receita Auditoria", format: "currency" },
  complianceCostRevenue: { color: "#22d3ee", label: "Custo Conformidade", format: "currency" },
  systemicIncidentCount: { color: "#d73626", label: "Incidentes" },
};

const SERIES_DATAKEY_MAP: Record<string, string> = {
  socialTrust: "trust",
};

const CURRENCY_SERIES = new Set(["avgCapital", "cloudDrain", "stateFundsUsed", "fineRevenue", "auditRevenue", "complianceCostRevenue"]);


const iconMap: Record<string, any> = {
  RocketIcon: RocketIcon,
  HomeIcon: HomeIcon,
  CheckCircledIcon: CheckCircledIcon,
  BarChartIcon: BarChartIcon,
  BoxIcon: BoxIcon,
};

const signalStyles: Record<NarrativeSignal["tone"], string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-error/30 bg-error/10 text-error",
  info: "border-primary/30 bg-primary/10 text-primary",
};

export default function SimulationDashboard() {
  const { t } = useTranslation();
  const {
    turn,
    history,
    stats,
    params,
    computationalTime,
    isAutoPlaying,
    autoPlaySpeed,
    isJumping,
    currentPlaybookData,
    simulation,
    setSimulation,
    setIsAutoPlaying,
    setAutoPlaySpeed,
    runTurn,
    setSetupStep,
  } = useSimulationStore();
  const { setScreen } = useNavigationStore();

  const playbook = currentPlaybookData as any;
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([]);
  const currentEvents = (simulation?.criticalEvents ?? []) as CriticalEvent[];

  useEffect(() => {
    // Standard UI Order: Social/Health -> Incentives/Innovation -> Risks/Regulatory -> Economic/Market
    const defaultOrder = ["trust", "startups", "products", "bigTechs", "hhi"];
    
    if (playbook?.keyMetrics && playbook.keyMetrics.length > 0) {
      const ids = playbook.keyMetrics.map((m: any) => m.id);
      // Sort keys based on standard order if possible, or just use as-is but respect standard fallback
      setSelectedKpiIds(ids.slice(0, 5));
    } else {
      setSelectedKpiIds(defaultOrder);
    }
  }, [playbook]);

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
    [history]
  );

  const maxTurns = params?.maxTurns ?? 50;
  const narrativeSignals = useMemo(
    () => buildNarrativeSignals(history, currentEvents),
    [history, currentEvents]
  );
  const narrativeSummary = useMemo(
    () => buildNarrativeSummary(history, currentEvents, maxTurns),
    [history, currentEvents, maxTurns]
  );
  const recentCriticalEvents = useMemo(
    () => getRecentEvents(currentEvents, turn || 1),
    [currentEvents, turn]
  );

  // Mapping of metric IDs to their current values and default configs
  const allMetrics: Record<string, any> = {
    startups: {
      label: "Startups",
      value: stats.startups,
      type: "number",
      icon: <RocketIcon className="h-4 w-4" />,
      thresholds: playbook?.thresholds?.startups || { min: 0, max: 20, direction: "up", warningThreshold: 0.5 },
      delta: history[history.length - 2] ? (stats.startups - history[history.length - 2].activeStartups) : 0,
      tooltip: "Empresas novas ao mercado. Alta = entrada ativa; queda = barreiras elevadas.",
      unit: "startups",
      priority: 3,
    },
    bigTechs: {
      label: "Big Techs",
      value: stats.bigTechs,
      type: "number",
      icon: <HomeIcon className="h-4 w-4" />,
      thresholds: playbook?.thresholds?.bigTechs || { min: 0, max: 5, direction: "down", warningThreshold: 0.5 },
      delta: history[history.length - 2] ? (stats.bigTechs - history[history.length - 2].activeBigTechs) : 0,
      tooltip: "Incumbentes consolidadas. Queda = saída ou falência.",
      unit: "empresas",
      priority: 4,
    },
    trust: {
      label: "Confiança",
      value: stats.trust,
      type: "percentage",
      icon: <CheckCircledIcon className="h-4 w-4" />,
      thresholds: playbook?.thresholds?.trust || { min: 0, max: 100, direction: "up", warningThreshold: 0.6 },
      delta: history[history.length - 2] ? (stats.trust - Math.round(history[history.length - 2].socialTrust)) : 0,
      tooltip: "Aceitação pública da IA. >70% = estável; <40% = risco sistêmico.",
      priority: 1,
    },
    hhi: {
      label: "HHI",
      value: stats.hhi,
      type: "hhi",
      icon: <BarChartIcon className="h-4 w-4" />,
      thresholds: playbook?.thresholds?.hhi || { min: 0, max: 4000, direction: "down", warningThreshold: 0.6 },
      delta: history[history.length - 2] ? (stats.hhi - Math.round(history[history.length - 2].hhi)) : 0,
      tooltip: "Herfindahl. <1.800 = competitivo; >2.500 = concentrado.",
      priority: 2,
    },
    products: {
      label: "Produtos",
      value: stats.totalProducts,
      type: "number",
      icon: <BoxIcon className="h-4 w-4" />,
      thresholds: playbook?.thresholds?.products || { min: 0, max: 50, direction: "up", warningThreshold: 0.4 },
      delta: history[history.length - 2] ? (stats.totalProducts - history[history.length - 2].totalProducts) : 0,
      tooltip: "Produtos de IA no mercado. Alta = inovação ativa.",
      unit: "produtos",
      priority: 5,
    },
  };

  // Merge with playbook keyMetrics if available
  if (playbook?.keyMetrics) {
    playbook.keyMetrics.forEach((m: any) => {
      if (!allMetrics[m.id]) {
        const val = (stats as any)[m.id] || 0;
        let delta = 0;
        if (history.length > 1) {
          const prev = history[history.length - 2] as any;
          const curr = history[history.length - 1] as any;
          delta = (curr[m.id] || 0) - (prev[m.id] || 0);
        }

        const IconComp = m.icon && iconMap[m.icon] ? iconMap[m.icon] : BoxIcon;

        allMetrics[m.id] = {
          label: m.label,
          value: val,
          type: m.type || "number",
          icon: <IconComp className="h-4 w-4" />,
          thresholds: playbook?.thresholds?.[m.id] || { min: 0, max: 100, direction: "up", warningThreshold: 0.5 },
          delta: delta,
          description: m.description,
          priority: m.priority || 6,
        };
      } else if (m.description) {
        allMetrics[m.id].description = m.description;
        if (m.priority) allMetrics[m.id].priority = m.priority;
      }
    });
  }

  const toggleMetric = (id: string) => {
    setSelectedKpiIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id].slice(0, 5)
    );
  };

  useEffect(() => {
    if (params) setSimulation(new Simulation(params));
    return () => setIsAutoPlaying(false);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      const state = useSimulationStore.getState();
      if (state.turn >= maxTurns) {
        state.setIsAutoPlaying(false);
        useNavigationStore.getState().setScreen("RESULT" as Screen);
        return;
      }
      state.runTurn();
    }, autoPlaySpeed);
    return () => clearInterval(interval);
  }, [isAutoPlaying, autoPlaySpeed, maxTurns, setIsAutoPlaying]);

  const [showCharts, setShowCharts] = useState(true);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title={String(playbook?.name || "Simulação")}
        showHomeButton={true}
        actions={
          <>
            <div className="space-y-1 relative">
              <Button variant="outline" size="sm" aria-describedby={turn === 0 ? "save-simulation-hint" : undefined} onClick={() => {
                const state = useSimulationStore.getState();
                saveSimulation(
                  String(playbook?.name || "Simulação"),
                  String(playbook?.id || ""),
                  params!,
                  history,
                  turn,
                  state.aiReportText || undefined,
                  state.computationalTime,
                  state.aiGenerationSource || undefined,
                );
              }} disabled={turn === 0}>
                {t("simulation.save", "Salvar")}
              </Button>
              {turn === 0 && (
                <p id="save-simulation-hint" className="absolute top-full mt-1 max-w-32 text-[10px] leading-tight text-on-surface-variant">
                  {t("simulation.save_tooltip", "Execute ao menos 1 turno para salvar")}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setScreen("RESULT" as Screen)}>
              {t("simulation.view_summary", "Resumo")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setScreen("SETUP" as Screen);
              setSetupStep(3);
            }}>
              {t("simulation.back_to_setup", "Voltar")}
            </Button>
          </>
        }
      />

      <StatusBar
        turn={turn}
        totalTurns={params?.maxTurns}
        isRunning={isAutoPlaying}
        computationalTime={computationalTime}
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <PageHeader title={t("result.title", "Resumo da Simulação")} showHomeButton={true} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-4xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Leitura operacional
              </div>
              <h2 className="mt-2 text-xl font-semibold text-on-surface">
                O que mudou na simulação
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {narrativeSummary}
              </p>
            </div>
            <div className="shrink-0 border border-outline-variant/40 bg-surface-container-low/40 px-4 py-3 text-sm">
              <div className="text-xs uppercase tracking-widest text-on-surface-variant">Próximo passo</div>
              <p className="mt-1 max-w-xs text-on-surface">
                {turn === 0
                  ? "Execute um turno para formar a linha de base."
                  : turn >= maxTurns
                    ? "Abra o Resumo para ler a síntese decisória final."
                    : "Avance mais alguns turnos e observe se o sinal se confirma."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {narrativeSignals.map((signal) => (
              <div
                key={`${signal.label}-${signal.value}`}
                className={`border p-3 ${signalStyles[signal.tone]}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
                  {signal.label}
                </div>
                <div className="mt-2 text-lg font-bold text-on-surface">
                  {signal.value}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {signal.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant/30 pt-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Eventos e inflexões
            </div>
            {recentCriticalEvents.length > 0 ? (
              <ol className="mt-2 space-y-2 text-sm text-on-surface-variant">
                {recentCriticalEvents.map((event, index) => (
                  <li key={`${event.turn}-${event.type}-${index}`} className="flex gap-2">
                    <span className="font-mono text-primary">T{event.turn}</span>
                    <span>{event.text}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-on-surface-variant">
                Nenhum evento crítico recente. Use os sinais acima como leitura textual das curvas.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">


          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Execução
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Avance turnos, rode automaticamente ou pule para o final.
                </p>
              </div>
              <SimulationControls />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {[...selectedKpiIds]
              .sort((a, b) => (allMetrics[a]?.priority || 99) - (allMetrics[b]?.priority || 99))
              .map((id) => {
                const m = allMetrics[id];
                if (!m) return null;
                return (
                  <KpiCard
                    key={id}
                    label={m.label}
                    value={formatKPI(m.value, m.type)}
                    status={getKpiStatus(m.value, m.thresholds)}
                    icon={m.icon}
                    delta={m.delta}
                    description={m.description}
                    tooltip={m.tooltip}
                    unit={m.unit}
                  />
                );
              })}
          </div>
        </div>

        <div className="w-full lg:w-64">
          <KpiSelector
            availableMetrics={Object.entries(allMetrics).map(([id, m]) => ({
              id,
              label: m.label,
              type: m.type,
              priority: m.priority,
            }))}
            selectedMetricIds={selectedKpiIds}
            onToggleMetric={toggleMetric}
            maxSelection={5}
          />
        </div>
      </div>
      
      {turn >= maxTurns && (
        <ResultBanner variant={stats.trust > 70 ? "success" : stats.trust > 40 ? "warning" : "danger"} />
      )}


      {chartData.length > 0 && (
        <>
          <div className="border-b border-outline-variant pb-2 mb-4">
            <button
              type="button"
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-2 text-sm font-semibold text-on-surface mb-0 hover:text-primary transition-colors"
            >
              {showCharts ? <EyeOpenIcon width={16} height={16} /> : <EyeClosedIcon width={16} height={16} />}
              {t("charts.evolution_title", "Evolução Temporal")}
            </button>
          </div>
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(playbook?.charts && playbook.charts.length > 0
                ? playbook.charts
                : [
                    { id: "concentration", title: t("charts.concentration_title", "Concentração (HHI) e Confiança"), description: "HHI mede concentração de mercado. 0 = concorrência perfeita, 10.000 = monopólio.", series: ["hhi", "socialTrust"] },
                    { id: "demographics", title: t("charts.demographics_title", "Demografia Empresarial"), description: "Big Techs: empresas com capital inicial alto. Startups: empresas novas entrantes.", series: ["activeStartups", "activeBigTechs"] },
                    { id: "products", title: t("charts.products_title", "Produtos"), description: "Produtos: quantidade total ofertada no mercado simulado.", series: ["totalProducts", "compliantProducts", "nonCompliantProducts"] },
                    { id: "capital", title: t("charts.capital_title", "Capital e Dreno"), description: "Capital: soma do capital das empresas ativas. Dreno: capital que sai do sistema (impostos, multas).", series: ["avgCapital", "cloudDrain", "stateFundsUsed"] },
                    { id: "adoption", title: t("charts.adoption_title", "Curvas de Adoção de IA"), description: "", series: ["adoptionComplementary", "adoptionSubstitutive", "adoptionGenerative"] },
                    { id: "substitution", title: t("charts.substitution_title", "Taxa de Substituição"), description: "", series: ["substitutionRate"] },
                    { id: "market", title: t("charts.market_title", "Criação de Mercado"), description: "", series: ["diversityIndex", "innovatingCompanies", "avgProductsPerCompany"] },
                  ]
              ).map((chart: any) => {
                const series = chart.series as string[];
                const hasDualAxis = series.includes("hhi") && series.includes("socialTrust");
                const hasCurrency = series.some((k: string) => CURRENCY_SERIES.has(k));

                const tooltipFormatter = hasDualAxis
                  ? (val: any, name: any) => [name === "HHI" ? formatKPI(val, "hhi") : val + "%", name]
                  : hasCurrency
                    ? (val: any) => [formatKPI(val, "currency"), undefined]
                    : undefined;

                return (
                  <Card key={chart.id}>
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-on-surface mb-0">
                        {chart.title}
                      </h3>
                      {chart.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {chart.description}
                        </p>
                      )}
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                          <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                          {hasDualAxis ? (
                            <>
                              <YAxis yAxisId="hhi" orientation="left" stroke="#22d3ee" fontSize={11} tickFormatter={(val) => formatKPI(val, "hhi")} label={{ value: "HHI", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#22d3ee" } }} />
                              <YAxis yAxisId="trust" orientation="right" stroke="#00ac4e" fontSize={11} domain={[0, 100]} label={{ value: "%", angle: 90, position: "insideRight", style: { fontSize: 10, fill: "#00ac4e" } }} />
                            </>
                          ) : (
                            <YAxis stroke="#748389" fontSize={11} tickFormatter={hasCurrency ? (val) => formatCurrencyShort(val) : undefined} />
                          )}
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={tooltipFormatter} />
                          <Legend />
                          {series.map((key: string) => {
                            const cfg = CHART_SERIES_CONFIG[key] || { color: "#748389", label: key };
                            const dataKey = (SERIES_DATAKEY_MAP[key] || key) as string;
                            return (
                              <Line
                                key={key}
                                yAxisId={cfg.yAxisId || undefined}
                                type="monotone"
                                dataKey={dataKey}
                                stroke={cfg.color}
                                name={cfg.label}
                                dot={false}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
      {turn === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-on-surface-variant">
              <Trans i18nKey="simulation.ready_message" components={{ strong: <strong className="font-bold text-on-surface" /> }}>
                Simulação pronta. Pressione +1 para avançar ou Auto Play para execução contínua.
              </Trans>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
