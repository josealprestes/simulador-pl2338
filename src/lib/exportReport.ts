import jsPDF from "jspdf";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import type { SimulationState } from "../engine/types";

function formatCurveTable(history: SimulationState[]): string[][] {
  const header = [
    "Turno",
    "Adoção Compl.",
    "Adoção Subst.",
    "Adoção Gen.",
    "Taxa Subst.",
    "Velocidade",
    "Diversidade",
    "Emp. Inov.",
    "Média Prod.",
  ];
  const rows = history.map((h) => [
    String(h.turn),
    h.adoption ? (h.adoption.adoptionComplementary * 100).toFixed(1) + "%" : "-",
    h.adoption ? (h.adoption.adoptionSubstitutive * 100).toFixed(1) + "%" : "-",
    h.adoption ? (h.adoption.adoptionGenerative * 100).toFixed(1) + "%" : "-",
    h.adoption ? (h.adoption.substitutionRate * 100).toFixed(1) + "%" : "-",
    h.adoption ? h.adoption.adoptionVelocity.toFixed(4) : "-",
    h.marketCreation ? h.marketCreation.diversityIndex.toFixed(4) : "-",
    h.marketCreation ? String(h.marketCreation.innovatingCompanies) : "-",
    h.marketCreation ? String(h.marketCreation.avgProductsPerCompany) : "-",
  ]);
  return [header, ...rows];
}

export function exportCurvesPDF(history: SimulationState[], playbookName = "Simulação"): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(`Curvas de Adoção - ${playbookName}`, pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, 22, { align: "center" });

  const tableData = formatCurveTable(history);
  const colCount = tableData[0].length;
  const colWidth = (pageWidth - 20) / colCount;
  let y = 30;

  tableData.forEach((row, rowIdx) => {
    if (y > 180) {
      doc.addPage();
      y = 15;
    }
    row.forEach((cell, colIdx) => {
      const x = 10 + colIdx * colWidth;
      doc.setFontSize(rowIdx === 0 ? 7 : 6);
      doc.setFont("helvetica", rowIdx === 0 ? "bold" : "normal");
      doc.text(cell, x + 1, y + 4);
    });
    y += rowIdx === 0 ? 8 : 5;
  });

  doc.save(`curvas-${playbookName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export interface FullReportOptions {
  history: SimulationState[];
  playbookName: string;
  analysisText?: string;
  fullReport?: string;
  criticalEvents?: Array<{ turn: number; type: string; text: string }>;
  params?: Record<string, unknown>;
  decisionAxes?: Array<{
    title: string;
    value: string;
    finding: string;
    implication: string;
  }>;
  executiveSummary?: {
    verdict: string;
    whyItMatters: string;
    recommendation?: string;
    caution?: string;
  };
  aiGenerationSource?: "ai" | "heuristic";
  computationalTime?: number;
  /** Metadados do provedor EFETIVO de decisão (reprodutibilidade real). */
  strictlyReproducible?: boolean;
  decisionProvider?: string;
  decisionMode?: string;
  /** Metadados da execução (para capas e identificadores técnicos). */
  seed?: number;
  executedTurns?: number;
  snapshotCount?: number;
  externalLLMUsed?: boolean;
  softwareVersion?: string;
  schemaVersion?: string;
}

/** Conjunto estruturado de metadados de execução (fonte única para capas). */
export interface ExecutionMetadata {
  seed?: number;
  executedTurns?: number;
  snapshotCount?: number;
  decisionMode: string;
  decisionProvider: string;
  strictlyReproducible: boolean;
  externalLLMUsed: boolean;
  softwareVersion: string;
  schemaVersion?: string;
  sourceNarrative: "ai" | "heuristic";
}

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas-pro";
import { ReportTemplate } from "../components/report/ReportTemplate";
import { buildDocxCoverText } from "./reportBuilders";

export async function exportFullReportPDF(options: FullReportOptions): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(createElement(ReportTemplate, { options }));

  // Wait for the component to mount and any internal assets to render
  await new Promise((resolve) => setTimeout(resolve, 800));

  const doc = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const a4Width = doc.internal.pageSize.getWidth();
  
  const pages = container.querySelectorAll(".pdf-page");

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    
    if (i > 0) doc.addPage();
    
    const ratio = canvas.height / canvas.width;
    const imgHeight = a4Width * ratio;
    doc.addImage(imgData, "JPEG", 0, 0, a4Width, imgHeight);
  }

  doc.save(`relatorio-${options.playbookName.replace(/\s+/g, "-").toLowerCase()}.pdf`);

  root.unmount();
  document.body.removeChild(container);
}

export async function exportFullReportDOCX(options: FullReportOptions): Promise<void> {
  const { history, playbookName, fullReport, analysisText, criticalEvents, decisionAxes, executiveSummary } = options;
  const cover = buildDocxCoverText(options);
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: cover.title,
      heading: "Heading1",
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Cenário: ${playbookName}`, bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString("pt-BR")}`, size: 16, color: "64748b" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: cover.disclaimer, italics: true, size: 18, color: "64748b" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    ...cover.metadataLines.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size: 16, color: "64748b" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
    ),
  );

  if (executiveSummary) {
    children.push(
      new Paragraph({ text: "Resumo Executivo", heading: "Heading2", spacing: { before: 400, after: 200 } }),
      new Paragraph({
        children: [new TextRun({ text: `Veredito: ${executiveSummary.verdict}`, bold: true, size: 24 })],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [new TextRun({ text: executiveSummary.whyItMatters, size: 22 })],
        spacing: { after: 200 }
      })
    );
  }

  if (decisionAxes && decisionAxes.length > 0) {
    children.push(
      new Paragraph({ text: "Eixos de Decisão", heading: "Heading2", spacing: { before: 200, after: 200 } })
    );
    decisionAxes.forEach((axis) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${axis.title}: `, bold: true, size: 20 }),
            new TextRun({ text: axis.value, color: "0e7490", bold: true, size: 20 })
          ],
          spacing: { before: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: axis.finding, size: 18 })],
          bullet: { level: 0 }
        }),
        new Paragraph({
          children: [new TextRun({ text: axis.implication, italics: true, size: 18 })],
          bullet: { level: 0 }
        })
      );
    });
  }

  const docxReport = fullReport || analysisText;
  if (docxReport) {
    children.push(
      new Paragraph({ text: "Análise Regulatória Detalhada", heading: "Heading2", spacing: { before: 400, after: 200 } })
    );
    const reportLines = docxReport
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*/g, "")
      .split("\n")
      .filter(Boolean);
    reportLines.forEach((line) => {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: line.trim(), size: 22 })],
        spacing: { after: 150 },
        alignment: AlignmentType.JUSTIFIED
      }));
    });
  }

  if (criticalEvents && criticalEvents.length > 0) {
    children.push(
      new Paragraph({ text: "Eventos Críticos", heading: "Heading2", spacing: { before: 400, after: 200 } })
    );
    criticalEvents.forEach((e) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[T${e.turn}] ${e.type}: `, bold: true, size: 20, color: "0e7490" }),
            new TextRun({ text: e.text, size: 20 })
          ],
          spacing: { after: 120 }
        })
      );
    });
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Dados de Curvas", bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 }
    }),
  );

  const tableData = formatCurveTable(history);
  const rows: TableRow[] = tableData.map((row) =>
    new TableRow({
      children: row.map((cell) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 16 })] })],
        }),
      ),
    }),
  );
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `relatorio-${playbookName.replace(/\s+/g, "-").toLowerCase()}.docx`);
}

export async function exportCurvesDOCX(history: SimulationState[], playbookName = "Simulação"): Promise<void> {
  const tableData = formatCurveTable(history);
  const rows: TableRow[] = tableData.map((row) => {
    return new TableRow({
      children: row.map((cell) => {
        return new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 16 })] })],
        });
      }),
    });
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Curvas de Adoção - ${playbookName}`, bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString("pt-BR")}`, size: 16 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `curvas-${playbookName.replace(/\s+/g, "-").toLowerCase()}.docx`);
}
