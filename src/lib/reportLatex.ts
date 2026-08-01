/**
 * Gerador do relatório em LaTeX (estrutura do template v3).
 *
 * Produz um .tex autossuficiente (compilável com tectonic) a partir dos dados
 * reais da simulação: capa, resumo executivo, dinâmica do ecossistema,
 * concentração, confiança, adoção, eventos/risco, parecer completo (markdown
 * convertido), anexos e notas metodológicas. Nenhum valor hardcoded.
 *
 * Convenção de escape: no código-fonte, todo backslash LaTeX é escrito como
 * `\\`. Comando LaTeX `\section` -> fonte `\\section`. Quebra de linha LaTeX
 * `\\` -> fonte `\\\\` (ou `\\\\[x]` com argumento opcional).
 */
import type { FullReportOptions } from "./exportReport";
import { APP_NAME, APP_VERSION } from "../engine/version";
import { buildCountTrendLabel, buildStartupTrendLabel, buildTrustTrendLabel } from "./reportBuilders";
import {
  describeCapitalConcentration,
  describeTrustTrajectory,
  describeReproducibility,
} from "./reportNarratives";

/* ─────────────────────────── utilitários ─────────────────────────── */

/** Escapa caracteres especiais do LaTeX. Aplicar SEMPRE a dados/texto externos. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function fmtBRL(value: unknown): string {
  return `R\\$ ${Math.round(Number(value) || 0).toLocaleString("pt-BR")}`;
}

function fmtPct(value: unknown, digits = 1): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(digits).replace(".", ",")}\\%` : "n/d";
}

function trendOf(delta: number): string {
  if (delta > 0) return "\\trendpos";
  if (delta < 0) return "\\trendneg";
  return "\\trendflat";
}

/** Converte markdown simples (##, **, -, listas numeradas) para LaTeX. */
export function mdToLatex(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inItemize = false;

  const closeList = () => {
    if (inItemize) {
      out.push("\\end{itemize}");
      inItemize = false;
    }
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) {
      closeList();
      out.push("");
      continue;
    }
    if (t === "---") {
      closeList();
      out.push("\\sectionsep");
      continue;
    }
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const title = esc(h[2]);
      out.push(level === 1 ? `\\subsection*{${title}}` : level === 2 ? `\\subsubsection*{${title}}` : `\\paragraph*{${title}}`);
      continue;
    }
    const bullet = t.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!inItemize) {
        out.push("\\begin{itemize}[leftmargin=*,itemsep=0.3em]");
        inItemize = true;
      }
      out.push(`\\item ${esc(bullet[1]).replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}")}`);
      continue;
    }
    const num = t.match(/^\d+[.)]\s+(.*)$/);
    if (num) {
      if (!inItemize) {
        out.push("\\begin{enumerate}[leftmargin=*,itemsep=0.3em]");
        inItemize = true;
      }
      out.push(`\\item ${esc(num[1]).replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}")}`);
      continue;
    }
    closeList();
    out.push(esc(raw).replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}"));
  }
  closeList();
  return out.join("\n");
}

/** Gera um gráfico de linhas pgfplots a partir de uma série. */
function lineChartLatex(
  opts: {
    data: Array<Record<string, unknown>>;
    xKey: string;
    series: Array<{ yKey: string; color: string; name: string; dashed?: boolean }>;
    yMin?: number;
    yMax?: number;
    yLabel: string;
    thresholds?: Array<{ value: number; color: string; label: string }>;
    height?: string;
  },
): string {
  const { data, xKey, series, yLabel, thresholds } = opts;
  const values = data
    .flatMap((d) => series.map((s) => Number(d[s.yKey]) || 0))
    .concat((thresholds ?? []).map((th) => th.value));
  const yMin = opts.yMin ?? Math.min(...values, 0) * 0.9;
  const yMax = opts.yMax ?? Math.max(...values, 1) * 1.1;
  const xMax = Math.max(...data.map((d) => Number(d[xKey]) || 0), 1);
  const n = data.length;
  const ticks = Array.from({ length: Math.min(n, 11) }, (_, i) => Math.round((i * xMax) / Math.max(Math.min(n - 1, 10), 1)));

  const plots = series.map(
    (s) =>
      `\\addplot[color=${s.color}${s.dashed ? "!60, dashed" : ""}, smooth] table[x=turn, y=${s.yKey}, col sep=tab] {\nturn\t${s.yKey}\n${data
        .map((d) => `${Number(d[xKey]) || 0}\t${Number(d[s.yKey]) || 0}`)
        .join("\n")}\n};`,
  );
  const thPlots = (thresholds ?? [])
    .map(
      (th) =>
        `\\addplot[color=${th.color}!60, dashed, domain=0:${xMax}] {${th.value}};\n\\node[color=${th.color}!60, font=\\tiny] at (${xMax + 1.5},${th.value}) {${th.label}};`,
    )
    .join("\n");

  return `\\begin{center}
\\begin{tikzpicture}
\\begin{axis}[
  width=0.92\\textwidth, height=${opts.height ?? "4.2cm"},
  xlabel={Turno}, ylabel={${yLabel}},
  xmin=0, xmax=${xMax}, ymin=${yMin.toFixed(1)}, ymax=${yMax.toFixed(1)},
  xtick={${ticks.join(",")}},
  grid=both, grid style={line width=0.15pt, color=gray!25},
  axis lines=left, axis line style={color=gray!40},
  tick label style={font=\\footnotesize},
  label style={font=\\small,color=neutral},
  line width=1.2pt, mark=none,
  legend style={font=\\footnotesize, at={(0.98,0.98)}, anchor=north east},
]
${plots.join("\n")}
${thPlots}
\\end{axis}
\\end{tikzpicture}
\\end{center}`;
}

function barChartLatex(opts: { bars: Array<{ name: string; value: number }>; yLabel: string; yMax?: number }): string {
  const { bars } = opts;
  const yMax = opts.yMax ?? Math.max(...bars.map((b) => b.value), 1) * 1.15;
  const coords = bars.map((b, i) => `(${i + 1},${b.value.toFixed(2)})`).join(" ");
  const labels = bars.map((b) => esc(b.name)).join(",");
  return `\\begin{center}
\\begin{tikzpicture}
\\begin{axis}[
  width=0.55\\textwidth, height=4.5cm,
  ybar, bar width=0.35,
  xtick={1,2,3},
  xticklabels={${labels}},
  nodes near coords, nodes near coords align={vertical},
  ymin=0, ymax=${yMax.toFixed(1)},
  ylabel={${opts.yLabel}},
  axis lines=left, axis line style={color=gray!50},
  tick label style={font=\\footnotesize},
  grid=major, grid style={line width=0.15pt, color=gray!25},
  enlarge x limits=0.35,
]
\\addplot[color=accent!80!black, fill=accent!50] coordinates {${coords}};
\\end{axis}
\\end{tikzpicture}
\\end{center}`;
}

function longTableLatex(opts: { caption: string; header: string[]; rows: string[][] }): string {
  const cols = opts.header.map(() => "l").join("");
  return `\\begin{longtable}{${cols}}
\\caption{${opts.caption}}\\\\
\\toprule
${opts.header.map((h) => `\\textbf{${h}}`).join(" & ")} \\\\
\\midrule
\\endfirsthead
\\toprule
${opts.header.map((h) => `\\textbf{${h}}`).join(" & ")} \\\\
\\midrule
\\endhead
${opts.rows.map((r) => r.join(" & ") + " \\\\").join("\n")}
\\bottomrule
\\end{longtable}`;
}

function escLatexPct(s: string): string {
	return s.replace(/%/g, "\\%");
}

function buildInsightCentral(
  startupDelta: number,
  startupDropPct: number,
  hhiInitial: number,
  hhiFinal: number,
  prodDelta: number,
): string {
  const startupPart =
    startupDelta < 0
      ? `redução da base de startups${Math.abs(startupDropPct) >= 30 ? " acentuada" : Math.abs(startupDropPct) >= 10 ? " moderada" : " leve"} (perda de ${Math.abs(startupDropPct).toFixed(0).replace(".", ",")}\\% das startups)`
      : startupDelta > 0
        ? "crescimento da base de startups"
        : "base de startups estável";
  // Narrativa derivada dos dados: aumento, diminuição ou estabilidade
  // aproximada do proxy, sem atribuir causalidade ao PL.
  const hhiText = describeCapitalConcentration(hhiInitial, hhiFinal);
  const hhiPart = hhiText.charAt(0).toLowerCase() + hhiText.slice(1);
  const prodPart = prodDelta > 0 ? "crescimento de produtos" : "dinâmica de produtos estável ou negativa";
  return `\\insight{Tendência central}{o mercado apresentou ${startupPart}, porém ${hhiPart} e ${prodPart}. Essas trajetórias são condicionadas às premissas do cenário modelado e não implicam causalidade direta da legislação.}`;
}

/* ─────────────────────────── gerador principal ─────────────────────────── */

export function generateLatexReport(o: FullReportOptions): string {
  const { history, playbookName, fullReport, criticalEvents, aiGenerationSource } = o;
  const last = history[history.length - 1];
  const first = history[0];
  const simParams = o.params as Record<string, unknown> | undefined;
  const sourceLabel = aiGenerationSource === "ai" ? "IA generativa" : "Análise heurística";
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const duration = o.computationalTime
    ? (() => {
        const s = Math.floor(o.computationalTime! / 1000);
        return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      })()
    : "n/d";

  /* ── Resumo executivo ── */
  const startupDelta = last ? last.activeStartups - first.activeStartups : 0;
  const trustDelta = last ? Math.round(last.socialTrust - first.socialTrust) : 0;
  const hhiDelta = last ? Math.round(last.hhi - first.hhi) : 0;
  const prodDelta = last ? last.totalProducts - first.totalProducts : 0;
  const startupDropPct = first && first.activeStartups > 0 && last
    ? ((first.activeStartups - last.activeStartups) / first.activeStartups) * 100
    : 0;
  const hhiDropPct = first && first.hhi > 0 && last ? ((first.hhi - last.hhi) / first.hhi) * 100 : 0;

  const summaryNarrative = last && first
    ? `A simulação modelou o ecossistema brasileiro de Inteligência Artificial sob o regime regulatório do PL 2338/2023, cenário \\textbf{${esc(playbookName)}}. Partindo de \\textbf{${first.activeStartups} startups} e \\textbf{${first.activeBigTechs} big techs}, ao longo de ${last.turn} turnos havia \\textbf{${last.activeStartups} startups ativas} com \\textbf{${last.totalProducts} produtos} e proxy de concentração de capital (HHI) de \\textbf{${last.hhi.toFixed(0).replace(".", ",")}}. A análise foi gerada por \\textbf{${esc(sourceLabel)}}.`
    : "Dados insuficientes para o resumo executivo.";

  const kpiRow = last
    ? `\\vspace{0.5em}
\\noindent
\\kpi{${last.activeStartups}/${first.activeStartups}}{Startups Ativas}%
\\kpi{${last.hhi.toFixed(0).replace(".", ",")}}{HHI de capital (final)}%
\\kpi{${Math.round(last.socialTrust)}\\%}{Confiança Social}%
\\kpi{${last.totalProducts}}{Produtos Totais}`
    : "";

  const tableIndicators = last
    ? `\\begin{table}[h!]
  \\centering\\small
  \\begin{tabular}{lcccc}
    \\toprule
    \\textbf{Indicador} & \\textbf{Início} & \\textbf{Fim} & $\\Delta$ & \\textbf{Tendência} \\\\
    \\midrule
    Startups Ativas   & ${first.activeStartups}     & ${last.activeStartups}     & ${startupDelta >= 0 ? "+" : ""}${startupDelta}    & ${trendOf(startupDelta)} ${buildStartupTrendLabel(startupDelta)} \\\\
    Big Techs         & ${first.activeBigTechs}      & ${last.activeBigTechs}      & ${last.activeBigTechs - first.activeBigTechs >= 0 ? "+" : ""}${last.activeBigTechs - first.activeBigTechs}     & ${trendOf(last.activeBigTechs - first.activeBigTechs)} ${buildCountTrendLabel(last.activeBigTechs - first.activeBigTechs)} \\\\
    HHI de capital    & ${first.hhi.toFixed(0).replace(".", ",")}  & ${last.hhi.toFixed(0).replace(".", ",")}  & ${hhiDelta >= 0 ? "+" : ""}${hhiDelta}  & ${trendOf(-hhiDelta)} ${hhiDelta < 0 ? "Menos concentrado" : hhiDelta > 0 ? "Mais concentrado" : "Estável"} \\\\
    Confiança Social  & ${Math.round(first.socialTrust)}\\%  & ${Math.round(last.socialTrust)}\\%  & ${trustDelta >= 0 ? "+" : ""}${trustDelta}     & ${trendOf(trustDelta)} ${buildTrustTrendLabel(trustDelta)} \\\\
    Produtos Totais   & ${first.totalProducts}      & ${last.totalProducts}     & ${prodDelta >= 0 ? "+" : ""}${prodDelta}   & ${trendOf(prodDelta)} ${prodDelta > 0 ? "Crescimento" : prodDelta < 0 ? "Queda" : "Estável"} \\\\
    \\bottomrule
  \\end{tabular}
\\end{table}`
    : "";

  const insightCentral = last
    ? buildInsightCentral(startupDelta, startupDropPct, first?.hhi ?? 0, last.hhi ?? 0, prodDelta)
    : "";

  /* ── Gráficos ── */
  const chartStartups = last
    ? lineChartLatex({
        data: history,
        xKey: "turn",
        yLabel: "Startups",
        series: [
          { yKey: "activeStartups", color: "secondary", name: "Startups" },
          { yKey: "activeBigTechs", color: "accent", name: "Big Techs" },
        ],
        yMin: 0,
      })
    : "";
  const chartProducts = last
    ? lineChartLatex({
        data: history,
        xKey: "turn",
        yLabel: "Produtos",
        series: [
          { yKey: "totalProducts", color: "success", name: "Total" },
          { yKey: "compliantProducts", color: "accent", name: "Conforme" },
          { yKey: "nonCompliantProducts", color: "danger", name: "Não conforme" },
        ],
        yMin: 0,
      })
    : "";
  const chartHHI = last
    ? lineChartLatex({
        data: history,
        xKey: "turn",
        yLabel: "HHI (capital)",
        series: [{ yKey: "hhi", color: "accent", name: "HHI (capital)" }],
        yMin: 0,
        thresholds: [
          { value: 1500, color: "danger", label: "1.500" },
          { value: 2500, color: "warning", label: "2.500" },
        ],
      })
    : "";
  const chartTrust = last
    ? lineChartLatex({
        data: history,
        xKey: "turn",
        yLabel: "Confiança (\\%)",
        series: [{ yKey: "trust", color: "warning", name: "Confiança" }],
        yMin: 40,
        thresholds: [{ value: 50, color: "danger", label: "50\\% crítico" }],
      })
    : "";

  const chartAdoption =
    last && last.adoption
      ? barChartLatex({
          bars: [
            { name: "Complementar", value: last.adoption.adoptionComplementary * 100 },
            { name: "Substitutiva", value: last.adoption.adoptionSubstitutive * 100 },
            { name: "Generativa", value: last.adoption.adoptionGenerative * 100 },
          ],
          yLabel: "Participação (\\%)",
        })
      : "";

  /* ── Tabela de indicadores de mercado ── */
  const adoptionTable =
    last && last.adoption && last.marketCreation
      ? `\\begin{table}[h!]
  \\centering\\small
  \\begin{tabular}{lccc}
    \\toprule
    \\textbf{Indicador} & \\textbf{Valor} & \\textbf{Ref.} & \\textbf{Interpretação} \\\\
    \\midrule
    Velocidade de Adoção   & ${last.adoption.adoptionVelocity.toFixed(4).replace(".", ",")} & n/d      & ${last.adoption.adoptionVelocity < 0.01 ? "Mercado estabilizado" : "Adoção em curso"} \\\\
    Taxa de Substituição   & ${(last.adoption.substitutionRate * 100).toFixed(1).replace(".", ",")}\\%  & $>30\\%$ alto & ${last.adoption.substitutionRate > 0.3 ? "Deslocamento relevante" : "Sem deslocamento de IA"} \\\\
    Índice de Diversidade  & ${(last.marketCreation.diversityIndex ?? 0).toFixed(4).replace(".", ",")} & $>0,70$  & ${(last.marketCreation.diversityIndex ?? 0) > 0.7 ? "Distribuição equilibrada" : "Distribuição concentrada"} \\\\
    Empresas Inovadoras    & ${last.marketCreation.innovatingCompanies ?? 0}      & n/d      & Inovação ${(last.marketCreation.innovatingCompanies ?? 0) > 0 ? "ativa" : "incremental"} \\\\
    Média Prod./Empresa    & ${(last.marketCreation.avgProductsPerCompany ?? 0).toFixed(2).replace(".", ",")}   & n/d      & Portfólio moderado \\\\
    \\bottomrule
  \\end{tabular}
\\end{table}`
      : "";

  /* ── Eventos e risco ── */
  const eventsTable =
    criticalEvents && criticalEvents.length > 0
      ? `\\begin{table}[h!]
  \\centering\\small
  \\begin{tabular}{cp{3cm}p{8cm}}
    \\toprule
    \\textbf{Turno} & \\textbf{Evento} & \\textbf{Impacto} \\\\
    \\midrule
    ${criticalEvents.map((e) => `${e.turn}  & ${esc(e.type)} & ${esc(e.text)} \\\\`).join("\n    ")}
    \\bottomrule
  \\end{tabular}
\\end{table}`
      : "\\noindent Nenhum evento crítico registrado durante a simulação.";

  const riskItems = last
    ? [
        `\\item \\textbf{Risco de concentração:} ${last.hhi < 1500 ? "\\trendpos\\ baixo." : "\\trendneg\\ alto."} HHI final (${last.hhi.toFixed(0).replace(".", ",")}) ${last.hhi < 1500 ? "bem abaixo do limiar de 1.500" : "acima do limiar de 1.500"}.`,
        `\\item \\textbf{Risco de colapso de confiança:} \\trendflat\\ ${last.socialTrust > 70 ? "baixo." : "moderado."} Confiança social em ${Math.round(last.socialTrust)}\\%${last.socialTrust > 70 ? ", acima do nível crítico" : ", próxima do nível crítico"}.`,
        `\\item \\textbf{Risco de estagnação da inovação:} ${(last.marketCreation?.diversityIndex ?? 0) > 0.7 ? "\\trendpos\\ baixo." : "\\trendneg\\ moderado."} Índice de diversidade de ${(last.marketCreation?.diversityIndex ?? 0).toFixed(3).replace(".", ",")}.`,
        `\\item \\textbf{Risco sistêmico:} \\trendflat\\ ${(last.systemicIncidentCount ?? 0) === 0 ? "baixo." : "moderado."} ${last.systemicIncidentCount ?? 0} incidente(s) sistêmico(s) em ${last.turn} turnos.`,
      ].join("\n")
    : "";

  /* ── Análise regulatória (relatório interpretativo) ── */
  const reportText = (fullReport && fullReport.length > 200 ? fullReport : o.analysisText) || "";
  const analysisLatex = reportText ? mdToLatex(reportText) : "Relatório indisponível para esta simulação.";

  const analysisSection = reportText
    ? `% ══════════════════════════════════════════════════════════
\\section{Análise Regulatória ${sourceLabel === "IA generativa" ? "por IA Generativa" : "Heurística"}}

${analysisLatex}`
    : "";

  /* ── Anexo A: série histórica ── */
  const seriesHeader = ["Turno", "Startups", "BigTechs", "HHI cap.", "Conf.", "Prod.", "Conformes", "NãoConf."];
  const seriesRows = history.map((h) => [
    String(h.turn),
    String(h.activeStartups),
    String(h.activeBigTechs),
    h.hhi.toFixed(0),
    String(Math.round(h.socialTrust)),
    String(h.totalProducts),
    String(h.compliantProducts),
    String(h.nonCompliantProducts),
  ]);

  /* ── Anexo B: métricas finais ── */
  const finalMetrics: Array<[string, string]> = last
    ? [
        ["Confiança social", fmtPct(last.socialTrust)],
        ["HHI capital (concentração)", last.hhi.toFixed(0)],
        ["HHI produtos de alto risco", String(last.hhiHighRiskProducts ?? "n/d")],
        ["Startups ativas", String(last.activeStartups)],
        ["Big techs ativas", String(last.activeBigTechs)],
        ["Produtos totais", String(last.totalProducts)],
        ["Produtos conformes", String(last.compliantProducts)],
        ["Produtos não conformes", String(last.nonCompliantProducts)],
        ["Proporção de conformidade", last.compliantProductsRatio != null ? fmtPct(last.compliantProductsRatio * 100) : "n/d"],
        ["Razão de IA complementar", (last.complementaryRatio ?? 0).toFixed(3)],
        ["IA complementar (contagem)", String(last.compAICount ?? 0)],
        ["IA substitutiva (contagem)", String(last.substAICount ?? 0)],
        ["IA generativa (contagem)", String(last.genAICount ?? 0)],
        ["Capital médio", fmtBRL(last.avgCapital)],
        ["Runway médio (turnos)", Number(last.avgRunway) === Infinity ? "$\\infty$" : (Number(last.avgRunway) || 0).toFixed(1)],
        ["Burn rate médio", fmtBRL(last.avgBurnRate)],
        ["Dreno cloud", fmtBRL(last.cloudDrain)],
        ["Fundo estatal utilizado", fmtBRL(last.stateFundsUsed)],
        ["Saldo do fundo estatal", fmtBRL(last.stateFundBalance)],
        ["Retornos estatais", fmtBRL(last.totalStateReturns)],
        ["Royalties de copyright", fmtBRL(last.totalCopyrightFees)],
        ["Incidentes sistêmicos", String(last.systemicIncidentCount ?? 0)],
        ["Score de reputação", (last.reputationScore ?? 0).toFixed(2)],
      ]
    : [];

  /* ── Anexo C: parâmetros ── */
  const paramRows = simParams
    ? Object.entries(simParams)
        .filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
        .map(([k, v]) => [
          k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
          typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v),
        ])
    : [];

  return `\\documentclass[11pt,a4paper]{article}

% ── Pacotes ─────────────────────────────────────────────
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\geometry{top=2.2cm, bottom=2.8cm, left=2.2cm, right=2.2cm}
\\usepackage{microtype}
\\usepackage{xcolor}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{array}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{amssymb}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{setspace}
\\usepackage{graphicx}
\\usepackage{lastpage}
\\usepackage[portuguese]{babel}
\\usepackage{textcomp}

% ── Configuração básica ─────────────────────────────────
\\setstretch{1.08}
\\setlength{\\parskip}{0.5em}
\\setlength{\\parindent}{0pt}

% ── Paleta de cores ─────────────────────────────────────
\\definecolor{primary}{HTML}{1B2A4A}
\\definecolor{secondary}{HTML}{2C5282}
\\definecolor{accent}{HTML}{3182CE}
\\definecolor{accentlight}{HTML}{EBF4FF}
\\definecolor{success}{HTML}{276749}
\\definecolor{neutral}{HTML}{4A5568}
\\definecolor{muted}{HTML}{718096}
\\definecolor{border}{HTML}{CBD5E0}
\\definecolor{danger}{HTML}{C53030}
\\definecolor{warning}{HTML}{975A16}

% ── Cabeçalho / Rodapé ──────────────────────────────────
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small\\color{muted}Relatório de Simulação Regulatória}
\\fancyhead[R]{\\small\\color{muted}Página \\thepage\\ de \\pageref{LastPage}}
\\renewcommand{\\headrulewidth}{0.15pt}
\\renewcommand{\\headrule}{\\vskip0.4em{\\color{border}\\hrule}}
\\fancyfoot[C]{\\footnotesize\\color{muted}${APP_NAME} v\\simulatorversion\\ --- \\copyright\\ 2026 José Augusto de Lima Prestes \\quad\\textbullet\\quad \\today}
\\renewcommand{\\footrulewidth}{0pt}

\\fancypagestyle{firstpage}{%
  \\fancyhf{}
  \\fancyhead[L]{\\small\\color{muted}Relatório de Simulação Regulatória}
  \\fancyhead[R]{\\small\\color{muted}Página \\thepage\\ de \\pageref{LastPage}}
  \\renewcommand{\\headrulewidth}{0.15pt}
  \\renewcommand{\\headrule}{\\vskip0.4em{\\color{border}\\hrule}}
  \\fancyfoot[C]{\\footnotesize\\color{muted}${APP_NAME} v\\simulatorversion\\ --- \\copyright\\ 2026 José Augusto de Lima Prestes \\quad\\textbullet\\quad \\today}
  \\renewcommand{\\footrulewidth}{0pt}
}

% ── Títulos de seção ────────────────────────────────────
\\titleformat{\\section}
  {\\normalfont\\large\\bfseries\\color{primary}}
  {\\llap{\\color{accent}\\rule{3pt}{1.2em}\\hspace{0.5em}}}{0pt}{}[]
\\titleformat{\\subsection}
  {\\normalfont\\normalsize\\bfseries\\color{secondary}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{1.5em}{0.5em}
\\titlespacing*{\\subsection}{0pt}{1em}{0.3em}

% ── Separador entre seções ──────────────────────────────
\\newcommand{\\sectionsep}{{\\color{border}\\rule{\\textwidth}{0.3pt}}\\vspace{0.5em}}

% ── Comandos ─────────────────────────────────────────────
\\newcommand{\\kpi}[2]{%
  \\begin{minipage}[b]{0.23\\textwidth}
    \\centering
    {\\color{primary}\\LARGE\\bfseries#1}
    \\par\\small\\color{neutral}#2
  \\end{minipage}%
}

\\newcommand{\\trendpos}{{\\color{success}$\\blacktriangle$}}
\\newcommand{\\trendneg}{{\\color{danger}$\\blacktriangledown$}}
\\newcommand{\\trendflat}{{\\color{neutral}$\\blacktriangleright$}}

% Versão do simulador: dinâmica (gerada pelo app)
\\newcommand{\\simulatorversion}{${esc(APP_VERSION)}}

% ── Bloco de destaque ───────────────────────────────────
\\newcommand{\\insight}[2]{%
  \\medskip
  \\noindent{\\colorbox{accentlight}{%
    \\begin{minipage}{\\dimexpr\\textwidth-2\\fboxsep\\relax}
    \\small\\color{primary!90!black}
    $\\blacktriangleright$ \\textbf{#1:} #2
    \\end{minipage}%
  }}\\par
  \\medskip
}

% ══════════════════════════════════════════════════════════
\\begin{document}

% ── CAPA (sem header/footer) ─────────────────────────────
\\begin{titlepage}
\\thispagestyle{empty}
  \\vspace*{3cm}
  \\begin{center}
    {\\color{accent}\\rule{0.55\\textwidth}{0.6pt}}\\\\[1.5em]

    {\\color{primary}\\Huge\\bfseries Relatório de\\\\[0.2em] Simulação Regulatória}

    \\vspace{0.6em}

    {\\large\\color{secondary}Cenários regulatórios parametrizados relacionados ao PL 2338/2023\\\\[0.3em] Ecossistema Brasileiro de IA}

    \\vspace{1.2em}

    {\\color{accent}\\rule{0.55\\textwidth}{0.6pt}}

    \\vspace{2cm}

    \\begin{minipage}{0.6\\textwidth}
      \\centering\\small
      \\begin{tabular}{>{\\color{neutral}}r l}
        Cenário: & ${esc(playbookName)} \\\\
        Seed:    & ${esc(simParams?.seed ?? "n/d")} \\\\
        Turnos:  & ${last ? last.turn : "n/d"} \\\\
        Modelo:  & ${esc(APP_NAME)} v\\simulatorversion \\\\
        Geração: & ${esc(sourceLabel)} \\\\
        Tempo:   & ${esc(duration)} \\\\
        Data:    & ${esc(today)} \\\\
      \\end{tabular}
    \\end{minipage}

    \\vspace{2.5cm}

    {\\colorbox{accentlight}{%
      \\begin{minipage}{0.82\\textwidth}
      \\centering\\footnotesize\\color{neutral}
      $\\blacktriangleright$ Relatório gerado automaticamente pelo motor de simulação.\\\\
      {\\color{muted}Não constitui parecer jurídico nem previsão do impacto real da lei.}
      \\end{minipage}%
    }}

    \\vfill

    {\\small\\color{gray}${APP_NAME} v\\simulatorversion\\\\[2pt]
    \\copyright\\ 2026 José Augusto de Lima Prestes}
  \\end{center}
\\end{titlepage}

% Ativar header/footer padrão
\\pagestyle{fancy}

% ══════════════════════════════════════════════════════════
\\section{Resumo Executivo}

${summaryNarrative}

${kpiRow}

${tableIndicators}

${insightCentral}

% ══════════════════════════════════════════════════════════
\\section{Dinâmica do Ecossistema}

\\subsection{Evolução das Startups}

${last ? `O ecossistema iniciou com \\textbf{${first.activeStartups} startups} e \\textbf{${first.activeBigTechs} big techs} e encerrou com \\textbf{${last.activeStartups} startups} e \\textbf{${last.activeBigTechs} big techs} ativas (variação de ${startupDelta >= 0 ? "+" : ""}${startupDelta}).` : ""}

${chartStartups}

\\subsection{Evolução dos Produtos}

${last ? `A oferta total de produtos passou de \\textbf{${first.totalProducts}} para \\textbf{${last.totalProducts}} unidades, das quais ${last.compliantProducts} conformes e ${last.nonCompliantProducts} não conformes.` : ""}

${chartProducts}

\\sectionsep

% ══════════════════════════════════════════════════════════
\\section{Concentração de Mercado}

${last ? `O proxy de concentração de capital (HHI) variou de ${first.hhi.toFixed(0).replace(".", ",")} para ${last.hhi.toFixed(0).replace(".", ",")}${last.hhi < 1500 ? ", bem abaixo do limiar de 1.500 que caracteriza concentração moderada" : last.hhi < 2500 ? ", em zona de concentração moderada" : ", acima do limiar de concentração alta (2.500)"}.` : ""}

${chartHHI}

\\par\\small\\color{muted}Linhas tracejadas: limiares de concentração moderada (1.500) e alta (2.500).\\par

\\insight{Análise do HHI de capital}{o proxy partiu de ${first.hhi.toFixed(0).replace(".", ",")} e fechou em ${last.hhi.toFixed(0).replace(".", ",")}, ${last.hhi < 1500 ? "bem abaixo" : "na faixa"} do limiar de 1.500 que caracteriza concentração moderada. A tendência indica que os custos de conformidade ${last.hhi < first.hhi ? "não favoreceram as big techs" : "pressionaram a concentração"} neste cenário.}

\\sectionsep

% ══════════════════════════════════════════════════════════
\\section{Confiança Social}

${last && first ? `A confiança social encerrou em \\textbf{${Math.round(last.socialTrust)}\\%}. ${escLatexPct(describeTrustTrajectory(history, 50))}` : "A confiança social não informada para esta simulação."}

${chartTrust}

\\par\\small\\color{muted}${escLatexPct(describeTrustTrajectory(history, 50))}\\par

\\insight{Trajetória da confiança}{${escLatexPct(describeTrustTrajectory(history, 50))}}

\\newpage

% ══════════════════════════════════════════════════════════
\\section{Adoção de Inteligência Artificial}

\\subsection{Distribuição por Tipo de IA}

${last && last.adoption ? `A adoção final foi de \\textbf{${(last.adoption.adoptionComplementary * 100).toFixed(0).replace(".", ",")}\\%} para IA Complementar, \\textbf{${(last.adoption.adoptionSubstitutive * 100).toFixed(0).replace(".", ",")}\\%} para Substitutiva e \\textbf{${(last.adoption.adoptionGenerative * 100).toFixed(0).replace(".", ",")}\\%} para Generativa.` : ""}

${chartAdoption}

${adoptionTable}

\\sectionsep

% ══════════════════════════════════════════════════════════
\\section{Eventos Críticos e Análise de Risco}

\\subsection{Linha do Tempo}

${eventsTable}

\\subsection{Avaliação de Risco}

\\begin{itemize}[leftmargin=*,itemsep=0.3em]
${riskItems}
\\end{itemize}

\\insight{Padrão observado}{os períodos de estabilidade e variação observados na série são descritos pelos dados; este relatório não aplica detecção formal de padrões como equilíbrio pontuado.}

${analysisSection}

\\newpage

% ══════════════════════════════════════════════════════════
\\section{Anexos}

\\subsection{Anexo A: Série Histórica Consolidada}

A tabela abaixo apresenta a série histórica completa da simulação, turno a turno.

${longTableLatex({ caption: `Série histórica (${history.length} turnos)`, header: seriesHeader, rows: seriesRows })}

\\subsection{Anexo B: Métricas Finais Completas}

Estado consolidado ao final do turno ${last ? last.turn : "n/d"}, incluindo métricas não exibidas na tela de resultados.

${longTableLatex({ caption: "Métricas finais", header: ["Métrica", "Valor"], rows: finalMetrics })}

\\subsection{Anexo C: Parâmetros do Cenário}

Parâmetros utilizados na execução do cenário \\textbf{${esc(playbookName)}}, para reprodutibilidade integral.

${longTableLatex({ caption: "Parâmetros do cenário", header: ["Parâmetro", "Valor"], rows: paramRows })}

% ══════════════════════════════════════════════════════════
\\section{Notas Metodológicas}

\\subsection{O Modelo}
O ${esc(APP_NAME)} é um Modelo Baseado em Agentes (ABM) implementado em TypeScript, com motor estocástico independente de framework. Cada turno executa 10 etapas sequenciais: nascimento de startups, receitas, competição, conformidade, auditoria e multas, capital de risco e fomento estatal, P\\&D, falências, atualização da confiança social e infraestrutura de nuvem.

\\subsection{Agentes}
\\begin{itemize}[leftmargin=*,nosep]
  \\item \\textbf{Startups} (até 20): capital inicial heterogêneo, sensibilidade a custos de conformidade
  \\item \\textbf{Big Techs} (até 5): vantagens de escala, maior capacidade de compliance
  \\item \\textbf{Titulares de Dados}: agentes implícitos que representam a confiança social da sociedade civil
\\end{itemize}

\\subsection{Reprodutibilidade e Validação}
O motor utiliza gerador congruencial linear (LCG) determinístico, semeado pela configuração da simulação. ${simParams?.seed !== undefined && Number.isFinite(simParams.seed) ? `A seed \\texttt{${esc(String(simParams.seed))}} é informada nos metadados da exportação.` : "A seed não informada nesta execução."} ${describeReproducibility({ strictlyReproducible: o.strictlyReproducible, decisionProvider: o.decisionProvider })} O projeto documenta uma bateria histórica de 23.000 execuções realizada em ambiente separado, não reproduzível integralmente a partir deste repositório.

\\subsection{Limitações}
\\begin{itemize}[leftmargin=*,nosep]
  \\item Simulação estocástica: diferentes seeds produzem trajetórias distintas
  \\item HHI calculado sobre participação no capital total (proxy de concentração patrimonial)
  \\item Os parâmetros seguem os valores padrão do playbook \\emph{${esc(playbookName)}}
  \\item Resultados dependem das premissas de modelagem e não constituem previsão empírica
\\end{itemize}

\\vspace{1em}

\\end{document}
`;
}
