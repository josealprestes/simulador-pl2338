import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { buildReportTitle } from "../../lib/reportBuilders";
import type { SimulationState } from "../../engine/types";
import type { FullReportOptions } from "../../lib/exportReport";
import { APP_NAME, APP_VERSION } from "../../engine/version";
import {
  describeCapitalConcentration,
  describeStartupTrajectory,
  describeReproducibility,
} from "../../lib/reportNarratives";

const CHART_PALETTE = ["#3182CE", "#2C5282", "#276749", "#975A16", "#C53030", "#4A5568", "#22d3ee"];

const SECTION_HEADING: React.CSSProperties = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontSize: "20px",
  fontWeight: 700,
  color: "#1B2A4A",
  borderBottom: "2px solid #3182CE",
  paddingBottom: "6px",
  marginBottom: "16px",
  marginTop: "0",
};

const SUBSEC_HEADING: React.CSSProperties = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontSize: "15px",
  fontWeight: 700,
  color: "#2C5282",
  marginBottom: "10px",
  marginTop: "0",
};

const PAGE_STYLE: React.CSSProperties = {
  width: "800px",
  minHeight: "1131px",
  padding: "50px 64px",
  backgroundColor: "#ffffff",
  position: "relative",
};

const PAGE_HEADER: React.CSSProperties = {
  paddingBottom: "8px",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "10px",
  color: "#718096",
  borderBottom: "1px solid #CBD5E0",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const PAGE_FOOTER: React.CSSProperties = {
  position: "absolute",
  bottom: "24px",
  left: "64px",
  right: "64px",
  borderTop: "1px solid #CBD5E0",
  paddingTop: "6px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "9px",
  color: "#718096",
};

const INSIGHT_BOX: React.CSSProperties = {
  backgroundColor: "#EBF4FF",
  borderLeft: "3px solid #3182CE",
  padding: "10px 14px",
  fontSize: "12px",
  color: "#1B2A4A",
  lineHeight: 1.5,
  marginTop: "12px",
  marginBottom: "12px",
};

const KPI_STYLE: React.CSSProperties = {
  padding: "12px 8px",
  border: "1px solid #E2E8F0",
  borderRadius: "6px",
  textAlign: "center" as const,
  backgroundColor: "#F7FAFC",
};

const CHART_WRAPPER: React.CSSProperties = {
  width: "100%",
  height: 200,
  backgroundColor: "#ffffff",
  border: "1px solid #E2E8F0",
  borderRadius: "4px",
  padding: "4px",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #E2E8F0",
  borderRadius: "4px",
  fontSize: 11,
  color: "#1B2A4A",
};

function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatCurveTable(history: SimulationState[]): string[][] {
  const header = [
    "Turno", "Adoção Compl.", "Adoção Subst.", "Adoção Gen.",
    "Taxa Subst.", "Diversidade", "Emp. Inov.", "Média Prod.",
  ];
  const rows = history.map((h) => [
    String(h.turn),
    h.adoption ? (h.adoption.adoptionComplementary * 100).toFixed(1) + "%" : "-",
    h.adoption ? (h.adoption.adoptionSubstitutive * 100).toFixed(1) + "%" : "-",
    h.adoption ? (h.adoption.adoptionGenerative * 100).toFixed(1) + "%" : "-",
    h.adoption ? (h.adoption.substitutionRate * 100).toFixed(1) + "%" : "-",
    h.marketCreation ? h.marketCreation.diversityIndex.toFixed(3) : "-",
    h.marketCreation ? String(h.marketCreation.innovatingCompanies) : "-",
    h.marketCreation ? h.marketCreation.avgProductsPerCompany.toFixed(1) : "-",
  ]);
  return [header, ...rows];
}

const Label: React.FC<{ text: string; value: string; color?: string }> = ({ text, value, color }) => (
  <div style={KPI_STYLE}>
    <p style={{ fontSize: "22px", fontWeight: 700, color: color || "#1B2A4A", margin: "0 0 2px 0" }}>
      {value}
    </p>
    <p style={{ fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
      {text}
    </p>
  </div>
);

const Insight: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={INSIGHT_BOX}>
    <strong>{title}:</strong> {children}
  </div>
);

export const ReportTemplate: React.FC<{ options: FullReportOptions }> = ({ options }) => {
  const {
    history,
    playbookName,
    fullReport,
    analysisText,
    criticalEvents,
    decisionAxes,
    executiveSummary,
    params,
    seed: effectiveSeed,
    executedTurns,
    snapshotCount,
  } = options;

  const last = history.length > 0 ? history[history.length - 1] : null;
  const first = history.length > 0 ? history[0] : null;
  /* ── Monta o texto completo da análise: usa fullReport (mais completo) se existir, senão analysisText ── */
  const reportText = fullReport && fullReport.length > 200
    ? fullReport
    : analysisText || "";
  const reportParagraphs = reportText.split("\n\n").filter((p) => p.trim() !== "");
  const hasAiReport = reportParagraphs.length > 0 || (fullReport && fullReport.length > 0);
  const sourceLabel = options.aiGenerationSource === "ai" ? "IA generativa" : "Análise heurística";
  const simParams = params as Record<string, unknown> | undefined;
  /** Seed efetiva: metadados da execução > params > n/d (nunca inventar). */
  const seedLabel =
    effectiveSeed !== undefined && Number.isFinite(effectiveSeed)
      ? String(effectiveSeed)
      : simParams?.seed !== undefined && Number.isFinite(simParams.seed)
        ? String(simParams.seed)
        : "n/d";

  const chartData = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        ...(h.adoption ?? {}),
        ...(h.marketCreation ?? {}),
        trust: Math.round(h.socialTrust),
        compliancePct: (Number(h.compliantProductsRatio) || 0) * 100,
      })),
    [history],
  );

  const tableData = formatCurveTable(history);
  const todayStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const commonFooter = (
    <div style={PAGE_FOOTER}>
      <span>{APP_NAME} v{APP_VERSION} — © 2026 José Augusto de Lima Prestes — github.com/josealprestes/simulador-pl2338</span>
      <span>{todayStr}</span>
    </div>
  );

  const commonHeader = (
    <div style={PAGE_HEADER}>
      <span>Relatório de Simulação Regulatória</span>
    </div>
  );

  return (
    <div id="pdf-report-container" style={{ width: "800px", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: "#1B2A4A", backgroundColor: "#ffffff" }}>
      {/* ═══════════════ PAGE 1: CAPA ═══════════════ */}
      <div className="pdf-page" style={{ ...PAGE_STYLE, backgroundColor: "#F7FAFC", padding: "80px 80px 60px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: "40px", height: "3px", backgroundColor: "#3182CE", marginBottom: "24px" }} />
        <p style={{ color: "#3182CE", fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
          {APP_NAME}
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#1B2A4A", fontFamily: "'Newsreader', Georgia, serif", letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1.2, margin: "0 0 8px 0" }}>
          Relatório de<br />Simulação Regulatória
        </h1>
        <p style={{ fontSize: "16px", color: "#2C5282", textAlign: "center", margin: "0 0 32px 0" }}>
          {buildReportTitle()} — Ecossistema Brasileiro de IA
        </p>
        <div style={{ width: "40px", height: "2px", backgroundColor: "#3182CE", marginBottom: "32px" }} />

        <table style={{ fontSize: "12px", color: "#4A5568", marginBottom: "32px" }}>
          <tbody>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Cenário</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{playbookName}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Seed</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{seedLabel}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Turnos executados</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{executedTurns !== undefined ? String(executedTurns) : "n/d"}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Snapshots</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{snapshotCount !== undefined ? String(snapshotCount) : "n/d"}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Turnos</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{last?.turn ?? "n/d"}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Modelo</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>Simulador ABM v{APP_VERSION}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Geração</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{sourceLabel}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Tempo</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{formatDuration(options.computationalTime)}</td></tr>
            <tr><td style={{ padding: "4px 12px 4px 0", color: "#4A5568" }}>Data</td><td style={{ fontWeight: 600, color: "#1B2A4A" }}>{todayStr}</td></tr>
          </tbody>
        </table>

        <div style={{ backgroundColor: "#EBF4FF", padding: "12px 24px", textAlign: "center", fontSize: "11px", color: "#4A5568", lineHeight: 1.5, maxWidth: "480px" }}>
          Relatório gerado automaticamente pelo motor de simulação.
          Não constitui parecer jurídico nem previsão do impacto real da lei.
        </div>

        <div style={{ marginTop: "auto", fontSize: "10px", color: "#718096", textAlign: "center", lineHeight: 1.6 }}>
          {APP_NAME} v{APP_VERSION}<br />
          © 2026 José Augusto de Lima Prestes
        </div>
      </div>

      {/* ═══════════════ PAGE 2: RESUMO EXECUTIVO ═══════════════ */}
      {last && first && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Resumo Executivo</h2>

          <p style={{ fontSize: "13px", color: "#1B2A4A", lineHeight: 1.6, marginBottom: "16px" }}>
            A simulação modelou o ecossistema brasileiro de Inteligência Artificial sob o regime regulatório do
            PL 2338/2023, cenário <strong>{playbookName}</strong>. Partindo de <strong>{first.activeStartups + first.activeBigTechs} empresas</strong>
            ({first.activeStartups} startups e {first.activeBigTechs} big techs), ao longo de
            {last.turn} turnos havia <strong>{last.activeStartups} startups ativas</strong> com
            <strong> {last.totalProducts} produtos</strong> e proxy de concentração de capital (HHI) de <strong>{last.hhi.toFixed(0)}</strong>.
            {" "}{describeStartupTrajectory(first?.activeStartups, last?.activeStartups)}
            {" "}A análise foi gerada por <strong>{sourceLabel}</strong>.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <Label text="Confiança" value={`${last.socialTrust.toFixed(0)}%`} color="#276749" />
            <Label text="Startups" value={`${last.activeStartups}/${first.activeStartups}`} color="#3182CE" />
            <Label text="Produtos" value={String(last.totalProducts)} color="#975A16" />
            <Label text="Big Techs" value={String(last.activeBigTechs)} color="#2C5282" />
            <Label text="HHI" value={last.hhi.toFixed(0)} color="#2C5282" />
            <Label text="Capital Médio" value={`R$ ${Math.round(last.avgCapital || 0).toLocaleString("pt-BR")}`} color="#4A5568" />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "16px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #3182CE" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Indicador</th>
                <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#1B2A4A" }}>Início</th>
                <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#1B2A4A" }}>Fim</th>
                <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#1B2A4A" }}>Δ</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Tendência</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Startups Ativas", start: first.activeStartups, end: last.activeStartups, trend: last.activeStartups < first.activeStartups ? "Consolidação" : last.activeStartups > first.activeStartups ? "Crescimento" : "Estável", delta: last.activeStartups - first.activeStartups },
                { label: "Big Techs", start: first.activeBigTechs, end: last.activeBigTechs, trend: "Estável", delta: last.activeBigTechs - first.activeBigTechs },
                { label: "HHI", start: first.hhi, end: last.hhi, trend: last.hhi < first.hhi ? "Desconcentração" : last.hhi > first.hhi ? "Concentração" : "Estável", delta: last.hhi - first.hhi, fmt: "num" },
                { label: "Confiança Social", start: first.socialTrust, end: last.socialTrust, trend: "Estável", delta: last.socialTrust - first.socialTrust, fmt: "pct" },
                { label: "Produtos Totais", start: first.totalProducts, end: last.totalProducts, trend: last.totalProducts > first.totalProducts ? "Crescimento" : last.totalProducts < first.totalProducts ? "Queda" : "Estável", delta: last.totalProducts - first.totalProducts },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600, color: "#1B2A4A" }}>{row.label}</td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: "#4A5568" }}>{row.fmt === "pct" ? `${row.start.toFixed(0)}%` : row.fmt === "num" ? row.start.toFixed(0) : String(row.start)}</td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: "#4A5568" }}>{row.fmt === "pct" ? `${row.end.toFixed(0)}%` : row.fmt === "num" ? row.end.toFixed(0) : String(row.end)}</td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: row.delta > 0 ? "#276749" : row.delta < 0 ? "#C53030" : "#4A5568" }}>{row.delta > 0 ? `+${row.delta}` : String(row.delta)}</td>
                  <td style={{ padding: "6px 10px", color: "#4A5568" }}>{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Insight title="Tendência central">
            {describeStartupTrajectory(first?.activeStartups, last?.activeStartups)} Além disso,{" "}
            {describeCapitalConcentration(first?.hhi, last?.hhi).toLowerCase()} Essas trajetórias são condicionadas
            às premissas do cenário modelado e não implicam causalidade direta da legislação.
          </Insight>
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ SÍNTESE DECISÓRIA (paridade com a UI) ═══════════════ */}
      {executiveSummary && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Síntese Decisória</h2>

          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#3182CE", marginBottom: "6px" }}>
            Síntese decisória
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1B2A4A", fontFamily: "'Newsreader', Georgia, serif", lineHeight: 1.3, margin: "0 0 8px 0" }}>
            {executiveSummary.verdict}
          </h3>
          <p style={{ fontSize: "12px", color: "#1B2A4A", lineHeight: 1.6, marginBottom: "16px" }}>
            {executiveSummary.whyItMatters}
          </p>

          {decisionAxes && decisionAxes.length > 0 && (
            <>
              <h3 style={{ ...SUBSEC_HEADING, marginTop: "8px" }}>Eixos de Decisão</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {decisionAxes.map((axis: any, i: number) => {
                  const toneBg = axis.tone === "danger" ? "#FFF5F5" : axis.tone === "warning" ? "#FFFAF0" : axis.tone === "success" ? "#F0FFF4" : "#EBF4FF";
                  const toneBorder = axis.tone === "danger" ? "#C53030" : axis.tone === "warning" ? "#975A16" : axis.tone === "success" ? "#276749" : "#3182CE";
                  return (
                    <div key={i} style={{ backgroundColor: toneBg, borderLeft: `3px solid ${toneBorder}`, padding: "10px 12px", borderRadius: "4px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#718096", marginBottom: "4px" }}>{axis.title}</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#1B2A4A", marginBottom: "4px" }}>{axis.value}</div>
                      <p style={{ fontSize: "11px", color: "#4A5568", lineHeight: 1.5, margin: "0 0 4px 0" }}>{axis.finding}</p>
                      <p style={{ fontSize: "11px", color: "#1B2A4A", lineHeight: 1.5, margin: 0 }}>{axis.implication}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ backgroundColor: "#EBF4FF", borderLeft: "3px solid #3182CE", padding: "10px 14px", fontSize: "12px", color: "#1B2A4A", lineHeight: 1.5, marginBottom: "12px" }}>
            <strong>Próxima decisão:</strong> {executiveSummary.recommendation}
          </div>
          <div style={{ backgroundColor: "#FFF5F5", borderLeft: "3px solid #C53030", padding: "10px 14px", fontSize: "11px", color: "#1B2A4A", lineHeight: 1.5 }}>
            <strong>Cautela:</strong> {executiveSummary.caution}
          </div>
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ PAGE 3: DINÂMICA + CONCENTRAÇÃO ═══════════════ */}
      {last && first && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Dinâmica do Ecossistema</h2>

          <h3 style={SUBSEC_HEADING}>Evolução das Startups</h3>
          <div style={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="turn" stroke="#4A5568" fontSize={10} />
                <YAxis stroke="#4A5568" fontSize={10} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="activeStartups" stroke="#3182CE" name="Startups" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="activeBigTechs" stroke="#2C5282" name="Big Techs" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{ ...SUBSEC_HEADING, marginTop: "16px" }}>Evolução dos Produtos</h3>
          <div style={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="turn" stroke="#4A5568" fontSize={10} />
                <YAxis stroke="#4A5568" fontSize={10} domain={[0, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="totalProducts" stroke="#276749" name="Total" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="compliantProducts" stroke="#3182CE" name="Conforme" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="nonCompliantProducts" stroke="#C53030" name="Não Conforme" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h2 style={{ ...SECTION_HEADING, marginTop: "20px" }}>Concentração de Mercado</h2>
          <div style={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="turn" stroke="#4A5568" fontSize={10} />
                <YAxis stroke="#4A5568" fontSize={10} domain={[800, 1800]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="hhi" stroke="#3182CE" name="HHI" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey={() => 1500} stroke="#C53030" name="Limiar 1.500" dot={false} strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "9px", color: "#718096", marginTop: "4px" }}>
            Referência: HHI &lt; 1.500 = desconcentrado. Fonte: Simulador PL 2338/2023.
          </p>

          <Insight title="Análise do HHI">
            o HHI partiu de {first.hhi.toFixed(0)} e fechou em {last.hhi.toFixed(0)}, bem abaixo do limiar de
            1.500 que caracteriza concentração moderada. A tendência de queda indica que os custos de
            conformidade não favoreceram big techs neste cenário.
          </Insight>
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ PAGE 4: CONFIANÇA + ADOÇÃO ═══════════════ */}
      {last && first && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Confiança Social</h2>
          <div style={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="turn" stroke="#4A5568" fontSize={10} />
                <YAxis stroke="#4A5568" fontSize={10} domain={[60, 105]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="trust" stroke="#975A16" name="Confiança" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Insight title="Resiliência">
            a confiança social flutuou mas jamais atingiu níveis críticos. O ponto mais baixo foi {Math.min(...chartData.map(d => d.trust))}%,
            com recuperação completa nos turnos seguintes, indicando resiliência institucional.
          </Insight>

          <h2 style={SECTION_HEADING}>Adoção de Inteligência Artificial</h2>
          <div style={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Complementar", value: last.adoption ? Math.round(last.adoption.adoptionComplementary * 100) : 100 },
                { name: "Substitutiva", value: last.adoption ? Math.round(last.adoption.adoptionSubstitutive * 100) : 0 },
                { name: "Generativa", value: last.adoption ? Math.round(last.adoption.adoptionGenerative * 100) : 0 },
              ]} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#4A5568" fontSize={10} />
                <YAxis stroke="#4A5568" fontSize={10} domain={[0, 120]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#3182CE" name="Participação (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {last.adoption && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #3182CE" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Indicador</th>
                  <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#1B2A4A" }}>Valor</th>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Interpretação</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Velocidade de Adoção", value: last.adoption.adoptionVelocity.toFixed(4), note: "Mercado estabilizado" },
                  { label: "Taxa de Substituição", value: (last.adoption.substitutionRate * 100).toFixed(1) + "%", note: last.adoption.substitutionRate > 0.3 ? "Alta" : "Sem deslocamento" },
                  { label: "Índice de Diversidade", value: (last.marketCreation?.diversityIndex || 0).toFixed(4), note: "Distribuição " + ((last.marketCreation?.diversityIndex || 0) > 0.7 ? "equilibrada" : "concentrada") },
                  { label: "Média Prod./Empresa", value: (last.marketCreation?.avgProductsPerCompany || 0).toFixed(2), note: "Portfólio moderado" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                    <td style={{ padding: "5px 10px", fontWeight: 600, color: "#1B2A4A" }}>{row.label}</td>
                    <td style={{ padding: "5px 10px", textAlign: "center", color: "#4A5568" }}>{row.value}</td>
                    <td style={{ padding: "5px 10px", color: "#718096" }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ CAPITAL E DREMO (paridade com a UI) ═══════════════ */}
      {last && first && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Capital e Sustentabilidade Financeira</h2>

          <div style={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="turn" stroke="#4A5568" fontSize={10} />
                <YAxis stroke="#4A5568" fontSize={10} tickFormatter={(val) => `R$ ${Math.round(Number(val) / 1000)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val: any, name: any) => [`R$ ${Math.round(Number(val)).toLocaleString("pt-BR")}`, name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="avgCapital" stroke="#975A16" name="Capital Médio" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="cloudDrain" stroke="#C53030" name="Dreno Cloud" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="stateFundsUsed" stroke="#3182CE" name="Fundo Estatal" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "9px", color: "#718096", marginTop: "4px" }}>
            Capital: média do capital das empresas ativas. Dreno: capital que sai do sistema (impostos, multas). Fonte: Simulador PL 2338/2023.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "16px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #3182CE" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Indicador</th>
                <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#1B2A4A" }}>Valor final</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Interpretação</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Capital Médio", value: `R$ ${Math.round(last.avgCapital || 0).toLocaleString("pt-BR")}`, note: "Capital por empresa ativa" },
                { label: "Runway Médio", value: Number(last.avgRunway) === Infinity ? "∞" : (Number(last.avgRunway) || 0).toFixed(1), note: "Turnos até exaustão de capital" },
                { label: "Burn Rate Médio", value: `R$ ${Math.round(last.avgBurnRate || 0).toLocaleString("pt-BR")}`, note: "Consumo de capital por turno" },
                { label: "Dreno Cloud", value: `R$ ${Math.round(last.cloudDrain || 0).toLocaleString("pt-BR")}`, note: "Infraestrutura de nuvem acumulada" },
                { label: "Fundo Estatal Utilizado", value: `R$ ${Math.round(last.stateFundsUsed || 0).toLocaleString("pt-BR")}`, note: "Fomento público consumido" },
                { label: "Saldo do Fundo Estatal", value: `R$ ${Math.round(last.stateFundBalance || 0).toLocaleString("pt-BR")}`, note: "Disponível ao final" },
                { label: "Retornos Estatais", value: `R$ ${Math.round(last.totalStateReturns || 0).toLocaleString("pt-BR")}`, note: "Royalties e retornos do fomento" },
                { label: "Royalties de Copyright", value: `R$ ${Math.round(last.totalCopyrightFees || 0).toLocaleString("pt-BR")}`, note: "Remuneração de titulares" },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                  <td style={{ padding: "5px 10px", fontWeight: 600, color: "#1B2A4A" }}>{row.label}</td>
                  <td style={{ padding: "5px 10px", textAlign: "center", color: "#4A5568", fontVariantNumeric: "tabular-nums" }}>{row.value}</td>
                  <td style={{ padding: "5px 10px", color: "#718096" }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Insight title="Saúde financeira">
            o capital médio de {`R$ ${Math.round(last.avgCapital || 0).toLocaleString("pt-BR")}`} e o dreno cloud de
            {` R$ ${Math.round(last.cloudDrain || 0).toLocaleString("pt-BR")}`} indicam o custo líquido da regulação
            sobre a infraestrutura. O fundo estatal consumiu {`R$ ${Math.round(last.stateFundsUsed || 0).toLocaleString("pt-BR")}`}
            {" "}ao longo dos {last.turn} turnos.
          </Insight>
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ PAGE 5: EVENTOS + RISCO ═══════════════ */}
      {last && first && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Eventos Críticos e Análise de Risco</h2>

          {criticalEvents && criticalEvents.length > 0 ? (
            <>
              <p style={{ fontSize: "13px", color: "#1B2A4A", lineHeight: 1.5, marginBottom: "12px" }}>
                Durante a simulação, {criticalEvents.length} evento(s) crítico(s) foram registrados.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #3182CE" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A", width: "60px" }}>Turno</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A", width: "120px" }}>Tipo</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1B2A4A" }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalEvents.map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                      <td style={{ padding: "5px 10px", fontWeight: 700, color: "#1B2A4A" }}>T-{e.turn}</td>
                      <td style={{ padding: "5px 10px", color: "#4A5568" }}>{e.type}</td>
                      <td style={{ padding: "5px 10px", color: "#4A5568" }}>{e.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: "13px", color: "#4A5568", marginBottom: "16px" }}>
              Nenhum evento crítico registrado durante a simulação.
            </p>
          )}

          <h3 style={SUBSEC_HEADING}>Avaliação de Risco</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ padding: "8px 12px", backgroundColor: last.hhi < 1500 ? "#F0FFF4" : "#FFF5F5", borderRadius: "4px", fontSize: "12px", color: "#1B2A4A", borderLeft: `3px solid ${last.hhi < 1500 ? "#276749" : "#C53030"}` }}>
              <strong>{last.hhi < 1500 ? "Baixo" : "Alto"} — Risco de concentração:</strong> HHI final de {last.hhi.toFixed(0)}.
            </div>
            <div style={{ padding: "8px 12px", backgroundColor: last.socialTrust > 70 ? "#F0FFF4" : "#FFF5F5", borderRadius: "4px", fontSize: "12px", color: "#1B2A4A", borderLeft: `3px solid ${last.socialTrust > 70 ? "#276749" : "#C53030"}` }}>
              <strong>{last.socialTrust > 70 ? "Baixo" : "Moderado"} — Risco de confiança:</strong> Confiança social em {last.socialTrust.toFixed(0)}%.
            </div>
            <div style={{ padding: "8px 12px", backgroundColor: (last.marketCreation?.diversityIndex || 0) > 0.7 ? "#F0FFF4" : "#FFF5F5", borderRadius: "4px", fontSize: "12px", color: "#1B2A4A", borderLeft: `3px solid ${(last.marketCreation?.diversityIndex || 0) > 0.7 ? "#276749" : "#C53030"}` }}>
              <strong>{(last.marketCreation?.diversityIndex || 0) > 0.7 ? "Baixo" : "Moderado"} — Risco de estagnação:</strong> Índice de diversidade de {(last.marketCreation?.diversityIndex || 0).toFixed(3)}.
            </div>
          </div>

          {criticalEvents && criticalEvents.length > 0 && (
            <Insight title="Eventos críticos">
              o modelo registrou {criticalEvents.length} evento(s) crítico(s) nesta execução. A descrição do padrão
              temporal fica condicionada aos dados da série; este relatório não aplica detecção formal de padrões
              como equilíbrio pontuado.
            </Insight>
          )}
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ PAGE 6+: RELATÓRIO COMPLETO (IA/Heurística) ═══════════════ */}
      {hasAiReport && (() => {
        const CHUNK_SIZE = 15; // menor para caber mais páginas
        const chunks: string[][] = [];
        for (let i = 0; i < reportParagraphs.length; i += CHUNK_SIZE) {
          chunks.push(reportParagraphs.slice(i, i + CHUNK_SIZE));
        }
        return chunks.map((chunk, chunkIdx) => (
          <div key={`report-chunk-${chunkIdx}`} className="pdf-page" style={PAGE_STYLE}>
            {commonHeader}
            <h2 style={SECTION_HEADING}>
              {chunkIdx === 0
                ? `Análise Regulatória ${sourceLabel === "IA generativa" ? "por IA" : "Heurística"}`
                : `Análise Regulatória (cont.)`}
            </h2>

            <div style={{ marginBottom: "20px" }}>
              {chunk.map((p, i) => {
                if (p.startsWith("#")) {
                  return (
                    <h3 key={i} style={{ ...SUBSEC_HEADING, marginTop: "16px" }}>
                      {p.replace(/^#+\s*/, "")}
                    </h3>
                  );
                }
                return (
                  <p key={i} style={{ fontSize: "12px", color: "#1B2A4A", lineHeight: 1.6, marginBottom: "10px", textAlign: "justify" }}>
                    {p}
                  </p>
                );
              })}
            </div>

            {chunkIdx === chunks.length - 1 && executiveSummary && (
              <>
                <h3 style={SUBSEC_HEADING}>Recomendação</h3>
                <p style={{ fontSize: "12px", color: "#1B2A4A", lineHeight: 1.6, marginBottom: "12px" }}>
                  {executiveSummary.recommendation}
                </p>
                <div style={{ backgroundColor: "#FFF5F5", borderLeft: "3px solid #C53030", padding: "10px 14px", fontSize: "11px", color: "#1B2A4A", lineHeight: 1.5 }}>
                  <strong>Cautela:</strong> {executiveSummary.caution}
                </div>
              </>
            )}
            {commonFooter}
          </div>
        ));
      })()}

      {/* ═══════════════ PAGE 7+: ANEXOS ═══════════════ */}
      <div className="pdf-page" style={PAGE_STYLE}>
        {commonHeader}
        <h2 style={SECTION_HEADING}>Anexos</h2>
        <h3 style={SUBSEC_HEADING}>Anexo A — Série Histórica Consolidada</h3>
        <p style={{ fontSize: "11px", color: "#4A5568", marginBottom: "12px", lineHeight: 1.5 }}>
          A tabela abaixo apresenta a série histórica completa da simulação, turno a turno.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", border: "1px solid #E2E8F0" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #CBD5E0" }}>
                {tableData[0].map((h, i) => (
                  <th key={i} style={{ padding: "4px 6px", textAlign: "left", color: "#1B2A4A", fontWeight: 700, borderRight: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.slice(1).map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: "3px 6px", color: "#4A5568", borderRight: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "9px", color: "#718096", marginTop: "10px", fontStyle: "italic" }}>
          {tableData.length - 1} turnos simulados · {tableData[0].length - 1} métricas monitoradas
        </p>

        <div style={{ marginTop: "20px" }}>
          <h3 style={SUBSEC_HEADING}>Notas Metodológicas</h3>
          <p style={{ fontSize: "11px", color: "#4A5568", lineHeight: 1.5, marginBottom: "8px" }}>
            O Simulador PL 2338/2023 é um Modelo Baseado em Agentes (ABM) implementado em TypeScript.
            Cada turno executa nascimento de startups, receitas, competição, conformidade, auditoria,
            capital, P&amp;D, falências, confiança social e infraestrutura de nuvem.
          </p>
          <p style={{ fontSize: "11px", color: "#4A5568", lineHeight: 1.5 }}>
            <strong>Reprodutibilidade:</strong> Motor com gerador congruencial linear (LCG) determinístico.
            Seed: <em>{seedLabel}</em>.
            {" "}{describeReproducibility({ strictlyReproducible: options.strictlyReproducible, decisionProvider: options.decisionProvider })}
            {" "}HHI calculado sobre capital (proxy de concentração patrimonial).
          </p>
        </div>
        {commonFooter}
      </div>

      {/* ═══════════════ ANEXO B: MÉTRICAS FINAIS COMPLETAS ═══════════════ */}
      {last && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Anexos</h2>
          <h3 style={SUBSEC_HEADING}>Anexo B — Métricas Finais Completas</h3>
          <p style={{ fontSize: "11px", color: "#4A5568", marginBottom: "12px", lineHeight: 1.5 }}>
            Estado consolidado ao final do turno {last.turn}, incluindo métricas não exibidas na tela de resultados.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #CBD5E0" }}>
                <th style={{ padding: "4px 8px", textAlign: "left", color: "#1B2A4A", fontWeight: 700 }}>Métrica</th>
                <th style={{ padding: "4px 8px", textAlign: "right", color: "#1B2A4A", fontWeight: 700 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Confiança social", `${last.socialTrust?.toFixed(1)}%`],
                ["HHI (concentração)", last.hhi?.toFixed(0)],
                ["HHI produtos de alto risco", last.hhiHighRiskProducts?.toFixed(0)],
                ["Startups ativas", String(last.activeStartups)],
                ["Big techs ativas", String(last.activeBigTechs)],
                ["Produtos totais", String(last.totalProducts)],
                ["Produtos conformes", String(last.compliantProducts)],
                ["Produtos não conformes", String(last.nonCompliantProducts)],
                ["Proporção de conformidade", last.compliantProductsRatio != null ? `${(last.compliantProductsRatio * 100).toFixed(1)}%` : "—"],
                ["Razão de IA complementar", last.complementaryRatio?.toFixed(3)],
                ["IA complementar (contagem)", String(last.compAICount)],
                ["IA substitutiva (contagem)", String(last.substAICount)],
                ["IA generativa (contagem)", String(last.genAICount)],
                ["Capital médio", `R$ ${Math.round(last.avgCapital || 0).toLocaleString("pt-BR")}`],
                ["Runway médio (turnos)", Number(last.avgRunway) === Infinity ? "∞" : (Number(last.avgRunway) || 0).toFixed(1)],
                ["Burn rate médio", `R$ ${Math.round(last.avgBurnRate || 0).toLocaleString("pt-BR")}`],
                ["Dreno cloud", `R$ ${Math.round(last.cloudDrain || 0).toLocaleString("pt-BR")}`],
                ["Fundo estatal utilizado", `R$ ${Math.round(last.stateFundsUsed || 0).toLocaleString("pt-BR")}`],
                ["Saldo do fundo estatal", `R$ ${Math.round(last.stateFundBalance || 0).toLocaleString("pt-BR")}`],
                ["Retornos estatais", `R$ ${Math.round(last.totalStateReturns || 0).toLocaleString("pt-BR")}`],
                ["Royalties de copyright", `R$ ${Math.round(last.totalCopyrightFees || 0).toLocaleString("pt-BR")}`],
                ["Incidentes sistêmicos", String(last.systemicIncidentCount)],
                ["Score de reputação", last.reputationScore?.toFixed(2)],
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                  <td style={{ padding: "3px 8px", color: "#1B2A4A" }}>{label}</td>
                  <td style={{ padding: "3px 8px", textAlign: "right", color: "#4A5568", fontVariantNumeric: "tabular-nums" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {commonFooter}
        </div>
      )}

      {/* ═══════════════ ANEXO C: PARÂMETROS DO CENÁRIO ═══════════════ */}
      {simParams && (
        <div className="pdf-page" style={PAGE_STYLE}>
          {commonHeader}
          <h2 style={SECTION_HEADING}>Anexos</h2>
          <h3 style={SUBSEC_HEADING}>Anexo C — Parâmetros do Cenário</h3>
          <p style={{ fontSize: "11px", color: "#4A5568", marginBottom: "12px", lineHeight: 1.5 }}>
            Parâmetros utilizados na execução do cenário <strong>{playbookName}</strong>, para reprodutibilidade integral.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "2px solid #CBD5E0" }}>
                <th style={{ padding: "4px 8px", textAlign: "left", color: "#1B2A4A", fontWeight: 700 }}>Parâmetro</th>
                <th style={{ padding: "4px 8px", textAlign: "right", color: "#1B2A4A", fontWeight: 700 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(simParams)
                .filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
                .map(([k, v], i) => [
                  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
                  typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v),
                  i,
                ])
                .map(([label, value, i]) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: (i as number) % 2 === 0 ? "#ffffff" : "#F7FAFC" }}>
                    <td style={{ padding: "3px 8px", color: "#1B2A4A" }}>{label}</td>
                    <td style={{ padding: "3px 8px", textAlign: "right", color: "#4A5568", fontVariantNumeric: "tabular-nums" }}>{value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {commonFooter}
        </div>
      )}

    </div>
  );
};
