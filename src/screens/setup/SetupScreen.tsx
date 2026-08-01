import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircledIcon, 
  PlayIcon, 
  ReaderIcon
} from "@radix-ui/react-icons";
import { useSimulationStore } from "@/stores/simulation.store";
import { useNavigationStore } from "@/stores/navigation.store";
import type { Screen } from "@/stores/navigation.store";
import type { SimulationParams } from "@/engine/types";
import { PageHeader } from "@/components/PageHeader";
import {
  DEFAULT_PARAM_SLIDERS,
  GROUP_LABELS,
  PRESETS,
  type PresetDef,
  type ParamSliderDef,
  type PresetId,
} from "@/data/playbookData";

const PRESET_GUIDANCE: Record<PresetId, { tradeoff: string; bestFor: string }> = {
  conservative: {
    tradeoff: "Mais proteção e fiscalização, com maior pressão sobre capital e entrada de startups.",
    bestFor: "Testar risco de excesso regulatório, custos de compliance e sanções severas.",
  },
  base: {
    tradeoff: "Equilíbrio entre proteção, inovação e capacidade de adaptação do mercado.",
    bestFor: "Usar como ponto de partida comparável antes de calibrar um cenário específico.",
  },
  optimistic: {
    tradeoff: "Mais espaço para inovação, com maior exposição a incidentes e queda de confiança.",
    bestFor: "Explorar crescimento acelerado, sandbox amplo e menor custo regulatório inicial.",
  },
};

function getParamImpact(key: string, group: string): string {
  if (key === "complianceCostHighRisk") return "Aumentar tende a elevar barreiras de entrada e reduzir fôlego de startups.";
  if (key === "auditProbability") return "Aumentar tende a elevar conformidade, mas também aumenta pressão operacional.";
  if (key === "fineSeverity") return "Aumentar reforça dissuasão, mas pode produzir falhas abruptas após incidentes.";
  if (key === "sandboxCapacity") return "Aumentar tende a reduzir incerteza regulatória e abrir espaço para experimentação.";
  if (key === "lgpdIncidentChance") return "Aumentar simula ambiente mais sujeito a incidentes e perda de confiança.";
  if (key === "trustRevenueFloor") return "Aumentar torna a receita mais dependente de confiança social alta.";
  if (group === "startups") return "Ajusta condições de entrada, sobrevivência e capacidade inovadora das startups.";
  if (group === "bigtechs") return "Ajusta poder inicial e capacidade competitiva das empresas incumbentes.";
  if (group === "regulatory") return "Altera a intensidade regulatória aplicada ao cenário.";
  if (group === "economic") return "Altera sensibilidade econômica e social da simulação.";
  return "Ajusta uma premissa específica deste playbook.";
}

function getScenarioBrief(playbook: any): string {
  const raw = playbook?.executiveSummary || playbook?.scenarioSummary || "";
  return String(raw) || "Cenário de simulação regulatória com parâmetros calibráveis para análise de impacto econômico, institucional e social.";
}

function getWorkType(work: string): string {
  if (/\bPL\s+\d/.test(work)) return "Proposição";
  if (/Lei n\.|NBR|ISO|Regulamento|Diretrizes|Guia|Código/.test(work)) return "Norma";
  return "Obra";
}

function TechnicalSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  if (!text) return null;
  const formattedText = text.trim() ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  return (
    <div className="border border-outline-variant/40 bg-surface-container-low/30 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <ReaderIcon width={16} height={16} className="text-primary" />
        {title}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
        {formattedText}
      </p>
    </div>
  );
}

function PresetChoice({
  id,
  preset,
  active,
  onSelect,
}: {
  id: PresetId;
  preset: PresetDef;
  active: boolean;
  onSelect: (id: PresetId) => void;
}) {
  const guidance = PRESET_GUIDANCE[id];
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`min-h-[150px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? "border-primary bg-primary/10 text-on-surface"
          : "border-outline-variant bg-surface-container-low/30 text-on-surface-variant hover:border-outline hover:bg-surface-container"
      }`}
      aria-pressed={active}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-base font-semibold text-on-surface">{preset.name}</span>
          <span className="mt-1 block text-xs leading-relaxed">{preset.description}</span>
        </span>
        {active && <CheckCircledIcon width={18} height={18} className="shrink-0 text-primary" />}
      </span>
      <span className="mt-3 block text-xs leading-relaxed text-on-surface-variant">
        <strong className="text-on-surface">Tradeoff:</strong> {guidance.tradeoff}
      </span>
      <span className="mt-2 block text-xs leading-relaxed text-on-surface-variant/80">
        {guidance.bestFor}
      </span>
    </button>
  );
}


export default function SetupScreen() {
  const { t } = useTranslation();
  const {
    currentPlaybookData,
    setupStep,
    setSetupStep,
    params,
    setParams,
    isStarting,
  } = useSimulationStore();
  const { setScreen } = useNavigationStore();

  const playbook = currentPlaybookData as any;

  const paramSliders: ParamSliderDef[] = useMemo(() => {
    if (playbook?.calibrationControls && playbook.calibrationControls.length > 0) {
      return playbook.calibrationControls.map((c: any): ParamSliderDef => ({
        key: c.key,
        min: c.min ?? 0,
        max: c.max ?? 100,
        step: c.step ?? 1,
        group: c.group ?? "regulatory",
        label: c.label,
      }));
    }
    return DEFAULT_PARAM_SLIDERS;
  }, [playbook]);

  const groups = useMemo(() => {
    const uniqueGroups = Array.from(new Set(paramSliders.map((s) => s.group)));
    // Order them according to GROUP_LABELS if possible
    const orderedGroups = ["startups", "bigtechs", "regulatory", "economic", "general"];
    return orderedGroups.filter(g => uniqueGroups.includes(g)).concat(uniqueGroups.filter(g => !orderedGroups.includes(g)));
  }, [paramSliders]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setupStep]);

  const steps = [
    { id: 1, label: t("setup.steps.information", "Informações") },
    { id: 2, label: t("setup.steps.parameters", "Parâmetros") },
    { id: 3, label: t("setup.steps.review", "Revisão") },
  ];

  const [activePreset, setActivePreset] = useState<PresetId | null>("base");

  function handleStart() {
    setScreen("SIMULATION" as Screen);
  }

  function applyPreset(id: PresetId) {
    setActivePreset(id);
    const preset = PRESETS[id];
    if (params) setParams({ ...params, ...preset.params });
  }

  function handleParamChange(key: keyof SimulationParams, value: number) {
    if (!params) return;
    setActivePreset(null);
    setParams({ ...params, [key]: value });
  }

  function isPresetValue(key: keyof SimulationParams): boolean {
    if (!activePreset || !params) return false;
    const presetVal = PRESETS[activePreset].params[key];
    return presetVal !== undefined && params[key] === presetVal;
  }

  function formatSliderValue(key: keyof SimulationParams, value: number, unit?: string): string {
    if (unit === "currency") return `R$ ${value.toLocaleString("pt-BR")}`;
    if (unit === "percent") return `${(value * 100).toFixed(0)}%`;
    if (unit === "months") return `${value} meses`;
    if (unit === "number") return String(value);
    if (unit === "integer") return String(value);
    // Fallback
    if (key === "auditProbability" || key === "lgpdIncidentChance" || key === "trustRevenueFloor") {
      return `${(value * 100).toFixed(0)}%`;
    }
    if (["startupInitialCapital", "bigTechInitialCapital", "complianceCostHighRisk", "fineSeverity"].includes(key as string)) {
      return `R$ ${value.toLocaleString("pt-BR")}`;
    }
    return String(value);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader title={t("setup.title", "Configuração")} showHomeButton={true} />
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((s) => {
          const state = setupStep === s.id ? "active" : s.id < setupStep ? "done" : "pending";
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={s.id < setupStep ? 0 : -1}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                s.id < setupStep ? "opacity-100" : state === "active" ? "opacity-100" : "opacity-100"
              }`}
              onClick={() => s.id < setupStep && setSetupStep(s.id)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && s.id < setupStep) {
                  e.preventDefault();
                  setSetupStep(s.id);
                }
              }}
            >
              <div
                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-full text-xs sm:text-sm font-bold transition-colors ${
                  state === "active"
                    ? "bg-primary text-primary-on"
                    : state === "done"
                    ? "bg-success text-white"
                    : "bg-surface-container text-on-surface-variant border border-outline/30"
                }`}
              >
                {state === "done" ? <CheckCircledIcon width={14} height={14} /> : s.id}
              </div>
              <span className={`text-xs sm:text-sm font-medium transition-colors ${
                state === "active" ? "text-on-surface" : state === "done" ? "text-on-surface" : "text-on-surface-variant"
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Information */}
      {setupStep === 1 && playbook && (
        <>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {String(playbook.category || t("setup.review_scenario", "Cenário"))}
                  </div>
                  <h2 className="mt-2 text-primary">
                    {String(playbook.name)}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-on-surface">
                    {getScenarioBrief(playbook)}
                  </p>
                </div>

                {playbook.modelingAssumption && (
                  <aside className="border border-outline-variant/40 bg-surface-container-low/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      {t("setup.expected_impact_hint", "Impacto Esperado")}
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {playbook.modelingAssumption}
                    </p>
                  </aside>
                )}

                <aside className="border border-outline-variant/40 bg-surface-container-low/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    {t("setup.decision_frame", "Enquadramento")}
                  </div>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-on-surface-variant">{getWorkType(playbook.work)}</dt>
                      <dd className="font-medium text-on-surface">{String(playbook.work)}</dd>
                    </div>
                    {playbook.author && !/(legisla|direito|análise|analise|economia|governança|governanca|integridade|accountability|ibgc|unesco)/i.test(String(playbook.author)) && (
                      <div>
                        <dt className="text-xs text-on-surface-variant">Autoria</dt>
                        <dd className="font-medium text-on-surface">{String(playbook.author)}</dd>
                      </div>
                    )}
                    {playbook.confidenceLevel && (
                      <div>
                        <dt className="text-xs text-on-surface-variant">{t("common.confidence_level", "Confiança na calibração")}</dt>
                        <dd className="font-medium text-on-surface">{playbook.confidenceLevel === "high" ? "Alta" : playbook.confidenceLevel === "medium" ? "Média" : playbook.confidenceLevel === "low" ? "Baixa" : String(playbook.confidenceLevel)}</dd>
                      </div>
                    )}
                    {playbook.turnMeaning && (
                      <div>
                        <dt className="text-xs text-on-surface-variant">{t("setup.review_duration", "Duração")}</dt>
                        <dd className="font-medium text-on-surface">{playbook.maxTurns} {String(playbook.turnMeaning).toLowerCase()}</dd>
                      </div>
                    )}
                  </dl>
                </aside>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-on-surface">
                    {t("setup.technical_details", "Detalhes metodológicos")}
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {t("setup.technical_details_desc", "Bases conceituais e premissas que sustentam este cenário de simulação.")}
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6">
                  <div className="space-y-3">
                    <TechnicalSection
                      title={t("setup.theoretical_basis", "Base Teórica")}
                      text={String(playbook.theoreticalBasis || "")}
                    />
                    <TechnicalSection
                      title={t("setup.legal_basis", "Base Legal")}
                      text={String(playbook.legalDevices || "")}
                    />
                    <TechnicalSection
                      title={t("setup.modeling_assumption", "Premissas do Modelo")}
                      text={String(playbook.modelingAssumption || "")}
                    />
                    <TechnicalSection
                      title={t("setup.interpretive_caution", "Cautela interpretativa")}
                      text={String(playbook.interpretiveCaution || "")}
                    />
                  </div>

                  {playbook.references && playbook.references.length > 0 && (
                    <div className="border border-outline-variant/40 bg-surface-container-low/40 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-on-surface mb-2">Referências utilizadas na modelagem</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-on-surface-variant">
                        {playbook.references.map((ref: any, idx: number) => {
                          const text = ref.text || String(ref);
                          const url = ref.url;
                          const separator = " disponivel em: ";
                          const sepIndex = text.indexOf(separator);

                          let citation = text;
                          let linkUrl = url;
                          let linkLabel = "";

                          if (sepIndex !== -1) {
                            citation = text.substring(0, sepIndex);
                            linkLabel = text.substring(sepIndex + separator.length).replace(/\.$/, "");
                            linkUrl = linkUrl || linkLabel;
                          }

                          return (
                            <li key={idx} className="leading-relaxed">
                              <span>{citation}</span>
                              {linkUrl && (
                                <>
                                  {sepIndex !== -1 ? ". " : ". "}
                                  <span className="text-on-surface-variant">disponivel em: </span>
                                  <a
                                    href={linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:no-underline text-xs"
                                  >
                                    {linkLabel || linkUrl}
                                  </a>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="sticky bottom-0 z-10 flex justify-end gap-3 bg-background/95 backdrop-blur border-t border-outline-variant/30 py-3 mt-4">
            <Button variant="default" onClick={() => setScreen("HOME" as Screen)}>
              {t("setup.back_to_scenarios", "Voltar aos cenários")}
            </Button>
            <Button onClick={() => setSetupStep(2)}>
              {t("setup.continue_to_parameters", "Prosseguir para Parâmetros")}
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Parameters */}
      {setupStep === 2 && params && (
        <>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
                <div>
                  <h2 className="text-on-surface">
                    {t("setup.steps.parameters", "Parâmetros")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {t("setup.parameters_intro", "Escolha um preset como hipótese inicial. Depois ajuste apenas os parâmetros que mudam a pergunta de política pública que você quer testar.")}
                  </p>
                </div>
                <div className="border border-outline-variant/40 bg-surface-container-low/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    {t("setup.parameter_effects", "Como ler esta etapa")}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {t("setup.parameter_effects_desc", "Custos, auditorias, multas e sandbox alteram incentivos dos agentes. Valores extremos são úteis para teste de estresse, não como previsão determinística.")}
                  </p>
                </div>
              </div>

              {/* Preset selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.entries(PRESETS) as [PresetId, typeof PRESETS[PresetId]][]).map(([id, preset]) => (
                  <PresetChoice
                    key={id}
                    id={id}
                    preset={preset}
                    active={activePreset === id}
                    onSelect={applyPreset}
                  />
                ))}
                {activePreset === null && (
                  <div className="flex items-center border border-warning/50 bg-warning/10 px-4 py-3 text-sm font-medium text-warning md:col-span-3">
                    {t("setup.custom_preset", "Personalizado")}
                  </div>
                )}
              </div>

              {/* Sliders grouped */}
              {groups.map((group) => {
                const groupSliders = paramSliders.filter((s) => s.group === group);
                if (groupSliders.length === 0) return null;
                return (
                  <div key={group}>
                    <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full bg-primary" />
                      {t(`setup.group.${group}`, GROUP_LABELS[group] || group)}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      {groupSliders.map(({ key, min, max, step, label }) => {
                        const raw = params[key as keyof typeof params];
                        const value = raw !== undefined && raw !== null ? Number(raw) : min;
                        const modified = activePreset !== null && !isPresetValue(key);
                        return (
                          <div key={key} className="space-y-3 p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-base font-medium text-on-surface">
                                    {label || t(`params.${key}`, key)}
                                  </label>
                                </div>
                                <span className="text-sm font-medium font-mono text-primary">
                                  {formatSliderValue(key, value, paramSliders.find(s => s.key === key)?.unit)}
                                </span>
                              </div>
                              <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 h-[3rem]">
                                {t(`params.${key}_desc`, "")}
                              </p>
                              <p className="text-xs leading-relaxed text-on-surface-variant/80">
                                <strong className="text-on-surface">{t("setup.expected_effect", "Efeito esperado")}:</strong>{" "}
                                {getParamImpact(key, group)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={value}
                                  onChange={(e) => handleParamChange(key, Number(e.target.value))}
                                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                                    bg-outline-variant accent-primary
                                    [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:w-3.5
                                    [&::-webkit-slider-thumb]:h-3.5
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:bg-primary
                                    [&::-webkit-slider-thumb]:border-2
                                    [&::-webkit-slider-thumb]:border-surface
                                    [&::-webkit-slider-thumb]:shadow-sm"
                                />
                                <input
                                  type="number"
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={value}
                                  onChange={(e) => handleParamChange(key, Number(e.target.value))}
                                  className={`w-20 px-2 py-1 rounded-md border text-xs font-mono bg-surface text-on-surface text-right
                                    ${modified ? "border-warning/50" : "border-outline-variant"}`}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant/70">
                                <span>{formatSliderValue(key, min)}</span>
                                <span>{formatSliderValue(key, max)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <div className="sticky bottom-0 z-10 flex justify-end gap-3 bg-background/95 backdrop-blur border-t border-outline-variant/30 py-3 mt-4">
            <Button variant="outline" onClick={() => setSetupStep(1)}>
              {t("common.back", "Voltar")}
            </Button>
            <Button onClick={() => setSetupStep(3)}>
              {t("setup.review_and_start", "Revisar e Iniciar")}
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Review */}
      {setupStep === 3 && params && (
        <>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-on-surface">
                    {t("setup.confirmation_title", "Confirmação do Cenário")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-on-surface">
                      {String(playbook?.name || t("setup.unnamed_scenario", "Cenário"))}
                    </p>
                    {activePreset ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {PRESETS[activePreset].name}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                        {t("setup.custom_preset", "Personalizado")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className="text-on-surface-variant text-xs">{t("setup.review_duration", "Duração")}</span>
                  <p className="font-bold text-on-surface font-mono">{params.maxTurns} {t("setup.turns", "turnos")}</p>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-on-surface-variant leading-relaxed italic border-l-2 border-outline-variant pl-3">
                {(() => {
                  const raw = playbook?.scenarioSummary || playbook?.executiveSummary || "";
                  const summary = String(raw).slice(0, 140);
                  return summary || t("setup.default_summary", "Simulação de mercado de IA com parâmetros configuráveis para análise de impacto regulatório e econômico.");
                })()}
              </p>

              {/* Parameters grouped */}
              {groups.map((group) => {
                const groupSliders = paramSliders.filter((s) => s.group === group);
                if (groupSliders.length === 0) return null;
                return (
                  <div key={group}>
                    <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                      {t(`setup.group.${group}`, GROUP_LABELS[group] || group)}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      {groupSliders.map(({ key, label }) => {
                        const raw = params[key as keyof typeof params];
                        const value = raw !== undefined && raw !== null ? Number(raw) : 0;
                        return (
                          <div key={key}>
                            <span className="text-on-surface-variant text-xs">{label || t(`params.${key}`, key)}</span>
                            <p className="font-medium text-on-surface font-mono text-xs">
                              {formatSliderValue(key, value, paramSliders.find(s => s.key === key)?.unit)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <p className="text-xs text-on-surface-variant/70 italic">
                {t("setup.stochastic_engine_note", "Ao clicar em começar, o motor estocástico irá inicializar o mercado com os parâmetros acima.")}
              </p>
            </CardContent>
          </Card>
          <div className="sticky bottom-0 z-10 flex justify-end gap-3 bg-background/95 backdrop-blur border-t border-outline-variant/30 py-3 mt-4">
            <Button variant="outline" onClick={() => setSetupStep(2)}>
              {t("common.back", "Voltar")}
            </Button>
            <Button onClick={handleStart} disabled={isStarting}>
              <PlayIcon className="size-4 mr-2" />
              {t("common.start_simulation", "Iniciar Simulação")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
