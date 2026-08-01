---
designSystemVersion: 1.0.0
name: Simulador PL 2338/2023
description: "Design system do relatório PDF de simulação regulatória: institucional, editorial, azul corporativo sobre branco, com dados sempre dinâmicos."
colors:
  primary: "#1B2A4A"
  secondary: "#2C5282"
  tertiary: "#3182CE"
  accentlight: "#EBF4FF"
  success: "#276749"
  warning: "#975A16"
  danger: "#C53030"
  neutral: "#4A5568"
  muted: "#718096"
  surface: "#FFFFFF"
  surfacealt: "#F7FAFC"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  subheading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  table:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.08em"
  caption:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: 9px
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.3em"
spacing:
  pagepadding: 64px
  section: 16px
  block: 12px
  inline: 8px
  tight: 4px
rounded:
  sm: 4px
  md: 6px
  lg: 8px
components:
  page:
    width: 800px
    height: 1131px
    padding: "50px 64px"
    backgroundColor: "{colors.surface}"
  page-header:
    textColor: "{colors.muted}"
    typography: "{typography.meta}"
  page-footer:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  cover:
    backgroundColor: "{colors.surfacealt}"
    padding: "80px 80px 60px"
  cover-rule:
    width: 40px
    height: 3px
    backgroundColor: "{colors.tertiary}"
  insight-box:
    backgroundColor: "{colors.accentlight}"
    padding: "10px 14px"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  kpi-card:
    backgroundColor: "{colors.surfacealt}"
    rounded: "{rounded.md}"
    padding: "12px 8px"
    textColor: "{colors.neutral}"
  chart-wrapper:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: 4px
    height: 200px
  chart-series-trust:
    textColor: "{colors.warning}"
  table-header:
    backgroundColor: "{colors.surfacealt}"
    textColor: "{colors.primary}"
  table-row-alt:
    backgroundColor: "{colors.surfacealt}"
  risk-badge-low:
    backgroundColor: "#F0FFF4"
    textColor: "{colors.success}"
  risk-badge-high:
    backgroundColor: "#FFF5F5"
    textColor: "{colors.danger}"
---

## Overview

O Simulador PL 2338/2023 gera relatórios PDF de simulação regulatória com identidade institucional e editorial: serif para títulos, sans para corpo, paleta azul corporativa sobre branco. O relatório é um artefato de análise, não um painel interativo: prioriza legibilidade em impressão, hierarquia clara e dados 100% dinâmicos (nenhum valor fixo no layout).

Três princípios regem o design:

1. **Dados dinâmicos sempre.** Nenhum número, rótulo de cenário, seed, versão ou data pode estar hardcoded no template. Tudo vem do estado da simulação ou dos metadados de execução.
2. **Transparência de fonte.** Todo relatório declara se a análise textual foi gerada por IA generativa ou por heurística (rótulo na capa e no título da seção de análise).
3. **Consistência com o template LaTeX de referência** (layout v3): capa centralizada com regras simétricas, cabeçalho uniforme, rodapé com versão à esquerda e data à direita.

## Colors

- **Primary (#1B2A4A):** azul-marinho institucional para títulos e texto principal.
- **Secondary (#2C5282):** subseções e destaques hierárquicos.
- **Tertiary (#3182CE):** único acento de interação visual: regras, bordas de seção, insights, séries primárias de gráfico.
- **Success (#276749) / Warning (#975A16) / Danger (#C53030):** semântica de risco e tendência (Δ positivo/negativo, badges de risco, série de confiança).
- **Neutral (#4A5568):** texto secundário, rótulos de tabela.
- **Muted (#718096):** rodapés, captions, metadados. Não usar abaixo disso em texto (contraste WCAG AA).
- **Surfacealt (#F7FAFC):** capa, cards de KPI, cabeçalhos de tabela, zebra.
- **Bordas derivadas:** 1px `#E2E8F0` (bordas leves de tabela/cards) e `#CBD5E0` (header/footer, zebra). Não são tokens: são derivadas da paleta para evitar órfãos.

Regra de contraste: texto sempre ≥ #4A5568; texto pequeno (captions/rodapé) nunca mais claro que #718096 sobre branco. Acentos de cor só em elementos não textuais (regras, bordas, fundos).

## Typography

- **Display/H1 (Newsreader 32px):** título da capa "Relatório de Simulação Regulatória".
- **Heading/H2 (Newsreader 20px):** títulos de seção, com regra inferior de 2px em tertiary.
- **Subheading/H3 (Newsreader 15px):** subseções.
- **Body (Inter 13px, line-height 1.6):** parágrafos de análise e resumo.
- **Table (Inter 11px):** dados tabulares. Usar `font-variant-numeric: tabular-nums` em colunas numéricas.
- **Meta (Inter 10px, 0.08em):** cabeçalho de página (uppercase na prosa do template).
- **Caption (Inter 9px):** notas de fonte, rodapé de página.
- **Eyebrow (Inter 11px, 0.3em, uppercase):** rótulos de capa ("SIMULADOR PL 2338/2023").

Mínimos de legibilidade em impressão: corpo 11pt equivalente, tabelas 10pt, captions 9pt. Nunca abaixo disso.

## Layout

- Página A4 retrato renderizada a 800px de largura e 1131px de altura, margens laterais de 64px, topo 50px, rodapé a 24px da base.
- Estrutura fixa do relatório:
  1. **Capa** (sem header/footer): eyebrow, título, subtítulo, regras simétricas, tabela de metadados (Cenário, Seed, Turnos, Modelo, Geração, Data), aviso legal, rodapé com versão.
  2. **Resumo Executivo**: síntese com KPIs (4 cards) e tabela início/fim/Δ/tendência.
  3. **Dinâmica do Ecossistema**: gráficos de startups, produtos e HHI com limiar de referência.
  4. **Confiança Social e Adoção**: gráfico de confiança, barras de adoção por tipo, tabela de indicadores.
  5. **Eventos Críticos e Análise de Risco**: timeline de eventos, avaliação com badges de risco.
  6. **Análise Regulatória** (páginas contínuas): texto completo da IA ou heurística, dividido em blocos de 15 parágrafos por página.
- Cada seção principal inicia em página nova.
- Sem páginas esparsas: densidade mínima de 25% de conteúdo por página; ajustar espaçamento em vez de deixar vazio.
- Título do cabeçalho de página: "Relatório de Simulação Regulatória"; rodapé: versão + copyright à esquerda, data pt-BR à direita.

## Elevation & Depth

O relatório é plano por natureza. Profundidade é expressa por bordas e fundos, nunca por sombras:

- Cards de KPI: borda 1px + fundo surfacealt.
- Insight boxes: fundo accentlight + borda esquerda 3px tertiary.
- Charts: borda 1px + fundo branco.
- Sem gradientes, sem transparência, sem sombras (renderização de impressão inconsistente).

## Shapes

- Cantos levemente arredondados: 4px (charts, badges), 6px (KPI cards).
- Regras e divisores retos: 1px; regras de seção 2px tertiary; regra da capa 40×3px.

## Components

- `page` / `page-header` / `page-footer`: ver tokens acima. A capa usa `cover` (sem header/footer).
- `insight-box`: caixa de interpretação após cada gráfico ou tabela, com título em negrito seguido de análise.
- `kpi-card`: valor grande (22px, bold) + rótulo uppercase 10px.
- `table-header`: fundo surfacealt, borda inferior 2px tertiary, zebra em `table-row-alt`.
- `risk-badge-low` / `risk-badge-high`: avaliação de risco com fundo verde/vermelho suave e borda esquerda semântica.
- `chart-series-trust`: série âmbar do gráfico de confiança.
- `cover-rule`: as duas regras da capa têm o mesmo comprimento (40px), mantendo o eixo central.

## Do's and Don'ts

- **Faça:** usar dados do estado da simulação em toda métrica; declarar a fonte da análise (IA generativa vs heurística); iniciar seções em página nova; manter títulos com conteúdo (sem heading órfão no fim da página); usar zebra e tabular-nums em tabelas; formatar números e datas com locale pt-BR.
- **Não faça:** hardcodar valores no template (cenário, seed, turnos, HHI, participação, eventos, versão); usar texto mais claro que #718096; usar gradientes, transparência ou sombras; quebrar linhas de tabela no meio de uma célula; deixar página com menos de 25% de conteúdo; misturar estilos de heading (serif vs sans) sem função hierárquica.
