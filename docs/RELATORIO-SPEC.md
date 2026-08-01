# Especificação Técnica do Relatório PDF

> Documento normativo do relatório gerado pelo Simulador PL 2338/2023.
> Complementa o `DESIGN.md` (tokens visuais) com o contrato técnico de geração.
> Aplica boas práticas de print/PDF adotadas de `pdfnoodle/pdf-best-practices`
> (skills.sh) e das Vercel Web Interface Guidelines (vercel-labs/agent-skills).

---

## 1. Objetivo

O relatório apresenta os dados e resultados da simulação regulatória e a
análise textual completa (IA generativa ou heurística), em PDF de layout
institucional consistente. É 100% dinâmico: nenhum valor fixo no template.

## 2. Arquitetura de geração

| Formato | Pipeline | Status |
|---|---|---|
| **LaTeX (formato primário)** | `reportLatex.ts` gera `.tex` autossuficiente → compilar com tectonic | ✅ Referência de layout e padronização (estrutura do template v3) |
| PDF (rasterizado) | `ReportTemplate.tsx` (React) → `html2canvas-pro` → `jsPDF` | ⚠️ Secundário; sem camada de texto, markdown cru, risco de corte |

### Pipeline LaTeX (recomendado)

1. `ResultScreen` → `buildReportPayload()` monta o parecer (IA gerada, salva, ou heurística completa).
2. `generateLatexReport(options)` produz um `.tex` único e autossuficiente (sem `\input` externo):
   - Capa com metadados dinâmicos (Cenário, Seed, Turnos, Modelo, Geração, Tempo, Data)
   - Resumo Executivo com KPIs (`\kpi`), tabela início/fim/Δ/tendência e `\insight`
   - Gráficos **pgfplots gerados da série real** (startups, produtos, HHI com limiares, confiança, adoção)
   - Parecer completo via `mdToLatex` (markdown → LaTeX: `##`→subseção, `**`→`\textbf`, listas→itemize)
   - Anexos em `longtable` (série histórica, métricas finais, parâmetros)
   - Notas metodológicas e versão dinâmica (`\simulatorversion`)
3. Compilar: `tectonic -X compile relatorio.tex` (ou `pdflatex`/Overleaf).

### Limitações conhecidas do pipeline rasterizado (React)

- **Texto não selecionável**: html2canvas rasteriza a página em imagem.
- **Markdown cru**: o template React não converte `**`/`##`/listas do parecer.
- **Corte de texto**: parágrafos longos excedem a página de 1131px e são cortados na rasterização.
- **JPEG lossy** e peso alto (3,5MB vs ~70KB do LaTeX).

Por isso o LaTeX é o formato primário: fluxo de texto natural (sem corte),
tipografia real, arquivo leve e texto selecionável.

## 3. Paridade informacional (regra normativa)

**O relatório PDF deve conter toda informação exibida na tela de resultados e
não pode perder dados em nenhuma hipótese. O layout pode diferir; o conteúdo,
não.** A regra vale para toda mudança futura na UI: adicionou um KPI, gráfico
ou texto na tela, o relatório deve ser atualizado no mesmo PR.

### Matriz de cobertura UI → PDF

| Informação na UI (ResultScreen) | Onde cai no PDF | Status |
|---|---|---|
| Síntese decisória (verdict, whyItMatters) | Página "Síntese Decisória" | ✅ |
| Próxima decisão (recommendation) | "Síntese Decisória" + fim da análise | ✅ |
| Cautela (caution) | "Síntese Decisória" + fim da análise | ✅ |
| Eixos de decisão (5: título/valor/finding/implicação/tom) | "Síntese Decisória" (cards com tom semântico) | ✅ |
| KPI Confiança | Resumo Executivo (cards) | ✅ |
| KPI Startups | Resumo Executivo (cards) | ✅ |
| KPI Produtos | Resumo Executivo (cards) | ✅ |
| KPI Big Techs | Resumo Executivo (cards) | ✅ |
| KPI HHI | Resumo Executivo (cards) | ✅ |
| KPI Capital Médio | Resumo Executivo (cards) | ✅ |
| Gráfico Concentração e Confiança (HHI + trust) | "Dinâmica do Ecossistema" | ✅ |
| Gráfico Curvas de Adoção (3 curvas) | "Confiança Social e Adoção" | ✅ |
| Gráfico Demografia (startups/big techs) | "Dinâmica do Ecossistema" | ✅ |
| Gráfico Produtos (total/conforme/não conforme) | "Dinâmica do Ecossistema" | ✅ |
| Gráfico Capital e Dreno (capital/dreno/fundo) | "Capital e Sustentabilidade Financeira" | ✅ |
| Eventos críticos (turno + texto) | "Eventos Críticos e Análise de Risco" | ✅ |
| Análise da IA (fullReport ou campos) | "Análise Regulatória" (nunca truncada) | ✅ |
| Tempo computacional (header da tela) | Capa (metadado "Tempo") | ✅ |
| Turnos simulados (header da tela) | Capa + Resumo Executivo | ✅ |

### Informação extra (o relatório é mais denso que a tela)

- Série histórica turno a turno completa (Anexo A).
- Métricas finais não exibidas na tela (Anexo B): HHI alto risco, razão IA
  complementar, contagens por tipo de IA, runway, burn rate, saldo e retornos
  do fundo estatal, royalties, incidentes sistêmicos, reputação.
- Parâmetros completos do cenário (Anexo C), para reprodutibilidade.
- Notas metodológicas (motor, RNG, validação).

### Regra do parecer (análise regulatória)

O texto da seção "Análise Regulatória" deve ser **o mesmo que o sistema gera
na tela** ("Gerar Análise"): `fullReport` da IA ou o `fullReport` completo da
heurística (`AnalysisGenerator.generateHeuristic`). Se nenhuma análise foi
gerada no momento da exportação, a exportação gera o parecer heurístico
completo automaticamente. **Proibido** usar o resumo raso
(`buildReportText`/fallback) como conteúdo da análise no PDF — ele existe
apenas como texto de contingência de `analysisText` e seu conteúdo (veredito,
eixos, recomendação, cautela) já está coberto pela página "Síntese Decisória".

### Checklist de paridade (parte do code review)

- [ ] `ResultScreen.tsx` → `ReportTemplate.tsx`: todo bloco renderizado na tela
      tem correspondência no PDF
- [ ] Nenhum campo novo de `SimulationState` usado na tela sem uso no PDF
- [ ] Textos dinâmicos da tela (verdict, eixos, eventos) entram via `options`,
      nunca regenerados ou resumidos no template
- [ ] `fullReport` da IA nunca é truncado (blocos de 15 parágrafos/página até o fim)

## 4. Estrutura do documento

Ordem fixa, cada seção principal em página nova:

1. **Capa** (sem header/footer): eyebrow "SIMULADOR PL 2338/2023", título,
   subtítulo "Cenários regulatórios parametrizados relacionados ao PL 2338/2023 — Ecossistema Brasileiro de IA", duas
   regras simétricas, tabela de metadados, aviso legal, rodapé com versão.
2. **Resumo Executivo**: síntese narrativa, 4 KPIs (Startups, HHI, Confiança,
   Produtos), tabela início/fim/Δ/tendência, insight.
3. **Dinâmica do Ecossistema**: evolução de startups, evolução de produtos,
   HHI com limiar de referência 1.500.
4. **Confiança Social e Adoção de IA**: confiança ao longo dos turnos,
   participação por tipo (Complementar/Substitutiva/Generativa), tabela de
   indicadores de adoção.
5. **Eventos Críticos e Análise de Risco**: timeline (turno, tipo, descrição),
   avaliação de risco (concentração, confiança, estagnação) com badges.
6. **Análise Regulatória** (páginas contínuas): texto completo
   (`fullReport` da IA, ou texto concatenado), blocos de até 15 parágrafos
   por página. Título da primeira página declara a fonte.

### Metadados da capa (todos dinâmicos)

| Campo | Fonte | Fallback proibido |
|---|---|---|
| Cenário | `playbook.name` | — |
| Seed | `params.seed` | — |
| Turnos | `history[last].turn` | — |
| Modelo | versão real do simulador (constante única de versão) | — |
| Geração | `aiGenerationSource` → "IA generativa" / "Análise heurística" | — |
| Data | `Intl.DateTimeFormat('pt-BR')` | — |

## 5. Contrato de dados

```ts
interface FullReportOptions {
  history: SimulationState[];          // série temporal completa (nunca truncar)
  playbookName: string;
  analysisText?: string;               // campos resumidos concatenados
  fullReport?: string;                 // texto completo da IA (1000–1200 palavras)
  criticalEvents?: Array<{ turn: number; type: string; text: string }>;
  params?: Record<string, unknown>;    // seed e demais parâmetros
  decisionAxes?: any[];
  executiveSummary?: any;
  aiGenerationSource?: "ai" | "heuristic";
}
```

Regras:
- `fullReport` tem prioridade sobre `analysisText` quando `length > 200`.
- O relatório **nunca** omite conteúdo: se a análise tem 60 parágrafos, todas
  as páginas são geradas (15 parágrafos por página).
- `aiGenerationSource` é obrigatório no chamador: sem ele, o padrão é
  tratar como heurística (conservador e honesto).

## 6. Regras de conteúdo

1. **Transparência de fonte**: rótulo "IA generativa" ou "Análise heurística"
   na capa (campo Geração), no resumo executivo e no título da seção de
   análise ("Análise Regulatória por IA" / "Análise Regulatória Heurística").
2. **Números**: formato pt-BR via `Intl.NumberFormat`; porcentagens com um
   decimal; HHI inteiro; velocidades com 4 casas.
3. **Insights interpretativos**: após cada bloco de dados relevante
   (gráfico/tabela), um insight de 2–3 frases interpreta, não descreve.
4. **Voz ativa** na análise, segunda pessoa evitada, rótulos específicos
   ("Risco de concentração" e não "Risco").
5. **Aviso legal** na capa: "Não constitui parecer jurídico nem previsão do
   impacto real da lei".

## 7. Regras de layout (print best practices)

- **Densidade**: sem páginas com menos de 25% de conteúdo. Se a última
  página ficar esparsa, ajustar espaçamento (nunca adicionar conteúdo fixo).
- **Quebras**: `page-break-inside: avoid` em cards, figuras e linhas de
  tabela; `page-break-after: avoid` em headings; `orphans/widows: 3`.
- **Tabelas**: header repetido por página; zebra em linhas pares; colunas
  numéricas com `tabular-nums`; larguras fixas de coluna.
- **Contraste**: texto ≥ `#4A5568`; captions/rodapé ≥ `#718096`; nunca
  gradientes, transparência ou sombras.
- **Cores**: `print-color-adjust: exact` (ou o equivalente do html2canvas:
  `backgroundColor` explícito em cada página).
- **Header/footer**: cabeçalho uniforme com título; rodapé com
  "Simulador PL 2338/2023 v<versão> — © 2026 José Augusto de Lima Prestes" à
  esquerda e data pt-BR à direita. Capa sem ambos.

## 8. Versão

A versão exibida no rodapé e na capa deve vir de **uma única constante de
versão** do projeto (ex.: `APP_VERSION` em `src/engine/version.ts` ou o
`version` do `package.json`). Proibido `v1.0.0` literado no template.

## 9. Checklist de qualidade (pré-release)

- [ ] Nenhum valor hardcoded no template (grep por dígitos literais em `ReportTemplate.tsx`)
- [ ] Rótulo de fonte (IA vs heurística) presente na capa, resumo e análise
- [ ] `fullReport` completo em todas as páginas (sem corte)
- [ ] Sem páginas esparsas (< 25% de conteúdo)
- [ ] Nenhum heading órfão no fim de página
- [ ] Tabelas com zebra e colunas numéricas alinhadas
- [ ] Versão dinâmica em capa e rodapé
- [ ] Data em pt-BR por extenso (ex.: "31 de julho de 2026")
- [ ] Contraste WCAG AA (texto ≥ #4A5568, captions ≥ #718096)
- [ ] Cores sólidas, sem gradientes/transparência/sombras
- [ ] Exportação testada com IA configurada e sem IA (heurística)

## 10. Referências

- `pdfnoodle/pdf-best-practices` (skills.sh) — document types (Report),
  content density, colors, headers & footers, page breaks, tables
- `vercel-labs/web-interface-guidelines` (skills.sh) — tipografia, conteúdo,
  acessibilidade, anti-padrões
- `DESIGN.md` (raiz do projeto) — tokens visuais normativos
- `/tmp/relatorio-template-v3.tex` — template LaTeX de referência do layout
