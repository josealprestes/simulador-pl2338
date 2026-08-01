import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigationStore } from "@/stores/navigation.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadSavedSimulations, type SavedSimulation } from "@/lib/simulationPersistence";
import { formatCurrencyShort, formatKPI } from "@/lib/format";
import {
  buildCriterionResults,
  buildScenarioTradeoff,
  type CriterionResult,
} from "@/lib/comparisonHelpers";

import PLAYBOOKS from "@/data/playbooks";
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
import type { Screen } from "@/stores/navigation.store";
import { PageHeader } from "@/components/PageHeader";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#001c25",
  border: "1px solid #13323c",
  borderRadius: "8px",
  fontSize: 12,
};

const COLORS = ["#22d3ee", "#ef6c22", "#9867e1"];
const DASHES = ["", "6 4", "2 4"];

export default function ComparisonScreen() {
  const { t } = useTranslation();
  const { setScreen } = useNavigationStore();
  const [saved, setSaved] = useState<SavedSimulation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSaved(loadSavedSimulations());
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const selectedSims = useMemo(() => {
    return selectedIds
      .map((id) => {
        const direct = saved.find((s) => s.id === id);
        if (direct) return direct;
        return saved.find((s) => s.playbookId === id);
      })
      .filter(Boolean) as SavedSimulation[];
  }, [selectedIds, saved]);

  const criterionResults = useMemo(
    () => buildCriterionResults(selectedSims),
    [selectedSims],
  );

  const winnerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    criterionResults.forEach((criterion) => {
      if (!criterion.best) return;
      counts.set(criterion.best.id, (counts.get(criterion.best.id) ?? 0) + 1);
    });
    return counts;
  }, [criterionResults]);

  const leadingScenario = useMemo(() => {
    if (selectedSims.length === 0) return null;
    return [...selectedSims].sort((a, b) => (winnerCounts.get(b.id) ?? 0) - (winnerCounts.get(a.id) ?? 0))[0];
  }, [selectedSims, winnerCounts]);

  const mergedChartData = useMemo(() => {
    if (selectedSims.length === 0) return [];
    const maxTurn = Math.max(...selectedSims.map((s) => s.turn));
    const data: Record<string, any>[] = [];
    for (let turn = 1; turn <= maxTurn; turn++) {
      const entry: Record<string, any> = { turn };
      selectedSims.forEach((sim, idx) => {
        const h = sim.history.find((h) => h.turn === turn);
        if (h) {
          entry[`hhi_${idx}`] = h.hhi;
          entry[`trust_${idx}`] = h.socialTrust;
          entry[`startups_${idx}`] = h.activeStartups;
          entry[`substitution_${idx}`] = h.adoption?.substitutionRate ?? 0;
        }
      });
      data.push(entry);
    }
    return data;
  }, [selectedSims]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
      <PageHeader title={t("comparison.title", "Comparar Cenários")} showHomeButton={true} />

      {saved.length === 0 && PLAYBOOKS.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-on-surface-variant text-sm">
              {t("comparison.empty_title", "Nenhum cenário disponível")}
            </p>
            <p className="text-on-surface-variant text-xs mt-1">
              {t("comparison.empty_desc", "Salve simulações para poder compará-las.")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {PLAYBOOKS.length > 0 && (
            <section aria-labelledby="playbooks-heading">
              <h2 id="playbooks-heading" className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                Playbooks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PLAYBOOKS.map((pb) => {
                  const hasSimulation = saved.some((s) => s.playbookId === pb.id);
                  const sim = saved.find((s) => s.playbookId === pb.id);
                  const selectId = pb.id;
                  const isSelected = selectedIds.includes(selectId);
                  const isDisabled = !isSelected && selectedIds.length >= 3;
                  return (
                    <Card
                      key={pb.id}
                      className={`transition-colors ${
                        isSelected ? "ring-2 ring-primary" : ""
                      } ${
                        isDisabled ? "opacity-50" : ""
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isDisabled || !hasSimulation}
                        onClick={() => toggleSelect(selectId)}
                        className={`w-full h-full p-3 text-left ${
                          isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-variant/30"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <CardContent className="p-0 relative">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-semibold text-sm text-on-surface truncate">{pb.name}</p>
                            <p className="text-xs text-on-surface-variant">{pb.author}</p>
                            <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{pb.category}</p>
                            {sim && (
                              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                                {sim.turn} turnos
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {hasSimulation && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                                Simulado
                              </span>
                            )}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary text-on-primary" : "border-on-surface-variant/30"}`}>
                              {isSelected && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      </button>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {saved.length > 0 && (
            <section aria-labelledby="saved-simulations-heading">
              <h2 id="saved-simulations-heading" className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                {t("comparison.saved_section", "Simulações salvas")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {saved.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  const isDisabled = !isSelected && selectedIds.length >= 3;
                  return (
                    <Card
                      key={s.id}
                      className={`transition-colors ${
                        isSelected ? "ring-2 ring-primary" : ""
                      } ${
                        isDisabled ? "opacity-50" : ""
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleSelect(s.id)}
                        className={`w-full h-full p-3 text-left ${
                          isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-variant/30"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <CardContent className="p-0 relative">
                          <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm text-on-surface">{s.name}</p>
                            <p className="text-xs text-on-surface-variant">
                              {s.turn} turnos | {new Date(s.timestamp).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary text-on-primary" : "border-on-surface-variant/30"}`}>
                            {isSelected && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        </CardContent>
                      </button>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {selectedSims.length === 1 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-on-surface-variant text-sm">
                  {t("comparison.select_more_title", "Selecione outro cenário para comparar")}
                </p>
                <p className="text-on-surface-variant text-xs mt-1">
                  {t("comparison.select_more_desc", "Para comparar, você precisa de pelo menos dois cenários.")}
                </p>
              </CardContent>
            </Card>
          )}

          {selectedSims.length >= 2 && (
            <>
              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-4xl">
                      <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                        Leitura comparativa
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-on-surface">
                        {leadingScenario
                          ? `${leadingScenario.name} vence em ${winnerCounts.get(leadingScenario.id) ?? 0} critério(s)`
                          : "Selecione cenários para comparar tradeoffs"}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                        A comparação abaixo destaca vencedores por critério regulatório. Use os gráficos para auditar a trajetória, mas tome a decisão pela matriz de tradeoffs.
                      </p>
                    </div>
                    <aside className="border border-outline-variant/40 bg-surface-container-low/40 p-4 text-sm lg:max-w-sm">
                      <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                        Como ler
                      </div>
                      <p className="mt-2 leading-relaxed text-on-surface">
                        Não há vencedor universal: um cenário pode ganhar em inovação e perder em custo, concentração ou risco.
                      </p>
                    </aside>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {criterionResults.map((criterion) => (
                      <div key={criterion.id} className="border border-outline-variant/40 bg-surface-container-low/30 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                          {criterion.label}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-on-surface">
                          {criterion.question}
                        </div>
                        <p className="mt-2 text-lg font-bold text-primary">
                          {criterion.best?.name ?? "-"}
                        </p>
                        <div className="mt-3 space-y-1 text-xs text-on-surface-variant">
                          {criterion.values.map((item) => (
                            <div key={item.sim.id} className="flex justify-between gap-3">
                              <span className="truncate">{item.sim.name}</span>
                              <span className="font-mono text-on-surface">{item.display}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 id="tradeoff-matrix-heading" className="text-sm font-semibold text-on-surface mb-2">
                    Matriz de tradeoffs
                  </h3>
                  <div className="overflow-x-auto">
                    <table role="table" aria-labelledby="tradeoff-matrix-heading" className="w-full text-left text-sm">
                      <thead>
                        <tr role="row" className="border-b border-outline-variant text-on-surface-variant">
                          <th role="columnheader" className="py-2 pr-4">Cenário</th>
                          <th role="columnheader" className="py-2 pr-4">Vitórias</th>
                          <th role="columnheader" className="py-2 pr-4">Tradeoff principal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSims.map((sim) => (
                          <tr key={sim.id} role="row" className="border-b border-outline-variant/50">
                            <td role="cell" className="py-2 pr-4 font-medium text-on-surface">{sim.name}</td>
                            <td role="cell" className="py-2 pr-4 font-mono text-on-surface-variant">
                              {winnerCounts.get(sim.id) ?? 0}/{criterionResults.length}
                            </td>
                            <td role="cell" className="py-2 pr-4 text-on-surface-variant">
                              {buildScenarioTradeoff(sim)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <h3 id="hhi-chart-heading" className="text-sm font-semibold text-on-surface mb-3">
                      {t("comparison.hhi_title", "Concentração (HHI)")}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={mergedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                        <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                        <YAxis stroke="#748389" fontSize={11} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Legend />
                        {selectedSims.map((sim, idx) => (
                          <Line
                            key={sim.id}
                            type="monotone"
                            dataKey={`hhi_${idx}`}
                            stroke={COLORS[idx]}
                            strokeDasharray={DASHES[idx]}
                            name={sim.name}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 id="trust-chart-heading" className="text-sm font-semibold text-on-surface mb-3">
                      {t("comparison.trust_title", "Confiança Social")}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={mergedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                        <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                        <YAxis stroke="#748389" fontSize={11} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Legend />
                        {selectedSims.map((sim, idx) => (
                          <Line
                            key={sim.id}
                            type="monotone"
                            dataKey={`trust_${idx}`}
                            stroke={COLORS[idx]}
                            strokeDasharray={DASHES[idx]}
                            name={sim.name}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 id="startups-chart-heading" className="text-sm font-semibold text-on-surface mb-3">
                      {t("comparison.startups_title", "Startups Ativas")}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={mergedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                        <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                        <YAxis stroke="#748389" fontSize={11} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Legend />
                        {selectedSims.map((sim, idx) => (
                          <Line
                            key={sim.id}
                            type="monotone"
                            dataKey={`startups_${idx}`}
                            stroke={COLORS[idx]}
                            strokeDasharray={DASHES[idx]}
                            name={sim.name}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 id="substitution-chart-heading" className="text-sm font-semibold text-on-surface mb-3">
                      {t("comparison.substitution_title", "Taxa de Substituição")}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={mergedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#13323c" />
                        <XAxis dataKey="turn" stroke="#748389" fontSize={11} />
                        <YAxis stroke="#748389" fontSize={11} domain={[0, 1]} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Legend />
                        {selectedSims.map((sim, idx) => (
                          <Line
                            key={sim.id}
                            type="monotone"
                            dataKey={`substitution_${idx}`}
                            stroke={COLORS[idx]}
                            strokeDasharray={DASHES[idx]}
                            name={sim.name}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <h3 id="comparison-summary-heading" className="text-sm font-semibold text-on-surface mb-2">
                    {t("comparison.table_title", "Resumo Comparativo")}
                  </h3>
                  <div className="overflow-x-auto">
                    <table role="table" aria-labelledby="comparison-summary-heading" className="w-full text-sm text-left min-w-[600px] table-fixed">
                      <thead>
                        <tr role="row" className="text-on-surface-variant border-b border-outline-variant">
                          <th role="columnheader" className="py-2 pr-4 w-1/3">{t("comparison.metric", "Métrica")}</th>
                          {selectedSims.map((sim) => (
                            <th role="columnheader" key={sim.id} className="py-2 pr-4 truncate" title={sim.name}>{sim.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Turnos", key: "turn" as const },
                          { label: "Startups", key: "activeStartups" as const },
                          { label: "Big Techs", key: "activeBigTechs" as const },
                          { label: "Confiança", key: "socialTrust" as const, fmt: (v: number) => `${Math.round(v)}%` },
                          { label: "HHI", key: "hhi" as const, fmt: (v: number) => String(Math.round(v)) },
                          { label: "Produtos", key: "totalProducts" as const },
                          { label: "Capital Médio", key: "avgCapital" as const, fmt: (v: number) => `R$ ${v.toLocaleString("pt-BR")}` },
                          { label: "Adoção Subst.", key: null, extract: (s: SavedSimulation) => {
                            const last = s.history[s.history.length - 1];
                            return last?.adoption ? `${(last.adoption.adoptionSubstitutive * 100).toFixed(0)}%` : "-";
                          }},
                          { label: "Adoção Gen.", key: null, extract: (s: SavedSimulation) => {
                            const last = s.history[s.history.length - 1];
                            return last?.adoption ? `${(last.adoption.adoptionGenerative * 100).toFixed(0)}%` : "-";
                          }},
                        ].map((row) => (
                          <tr key={row.label} role="row" className="border-b border-outline-variant/50">
                            <td role="cell" className="py-2 pr-4 font-medium text-on-surface truncate">{row.label}</td>
                            {selectedSims.map((sim) => {
                              const last = sim.history[sim.history.length - 1];
                              let value: string;
                              if (row.extract) {
                                value = row.extract(sim);
                              } else if (row.key && last) {
                                const v = (last as any)[row.key];
                                value = row.fmt ? row.fmt(Number(v)) : String(v ?? "-");
                              } else {
                                value = "-";
                              }
                              return <td role="cell" key={sim.id} className="py-2 pr-4 text-on-surface-variant truncate">{value}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
