# Simulador PL 2338/2023 — ABM do Impacto Regulatório de IA no Brasil

> **Aviso**: este é um simulador **exploratório** de cenários regulatórios. Os resultados não constituem previsão de efeitos reais da legislação, parecer jurídico ou recomendação regulatória oficial. Veja [Limites Metodológicos](#limites-metodologicos).

![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
[![CI](https://github.com/josealprestes/simulador-pl2338/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/josealprestes/simulador-pl2338/actions/workflows/ci.yml)
![ORCID](https://img.shields.io/badge/ORCID-0000--0001--8686--5360-green)

---

## Sobre

Modelo Baseado em Agentes (ABM) que simula os impactos socioeconômicos do **Projeto de Lei 2338/2023** (aprovado pelo Senado Federal em dezembro de 2024 e atualmente em tramitação na Câmara dos Deputados), que propõe o marco regulatório da inteligência artificial no Brasil, sobre o ecossistema de IA brasileiro.

Startups e big techs interagem como agentes heterogêneos em um mercado competitivo, respondendo a parâmetros regulatórios como custo de conformidade, probabilidade de auditoria, severidade de multas, fomento estatal, proteção de titulares de dados e mecanismos de mercado. O simulador integra teoria econômica, jurídica e computacional em uma plataforma interativa.

---

## Como Executar

### Pré-requisitos

- **Node.js** 20 ou superior (testado até Node 22)
- **npm** 9 ou superior
- Navegador moderno (Chrome 120+, Firefox 120+, Edge 120+, Opera 100+)
- ~500 MB de espaço em disco (com dependências)
- ~2 GB de RAM para execução confortável

### Instalação e execução

```bash
# Clone o repositório
git clone https://github.com/josealprestes/simulador-pl2338.git
cd simulador-pl2338

# Instale as dependências (instalação limpa e reproduzível a partir do lockfile)
npm ci

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:5173** no navegador. A aplicação carrega e está pronta para uso imediato.

### Testes e CI

```bash
npm run typecheck       # checagem de tipos do app (tsc --noEmit)
npm run typecheck:test   # checagem de tipos dos testes (tsc -p tsconfig.test.json)
npm run lint        # lint (eslint)
npm test            # suíte de testes do motor (Vitest): determinismo, decisores (reset/seed), cache, metadados de reprodutibilidade, HHI, runway, narrativas condicionais, validação normalizada, credenciais
npm run test:coverage  # cobertura (v8)
npm run build       # build de produção
```

A integração contínua (GitHub Actions, `.github/workflows/ci.yml`) executa `npm ci → typecheck → typecheck:test → lint → test → build` em Node 22 a cada push na `main` e em pull requests.

### Reproducibilidade

O motor é **determinístico por seed** no modo heurístico: mesmas seed e configuração produzem o mesmo histórico. A exportação inclui `seed`, `decisionMode`, `decisionProvider`, `strictlyReproducible`, `externalLLMUsed`, `executedTurns`, `snapshotCount`, `initialParams` e `finalRegulatoryState`.

Os metadados refletem o **provedor efetivamente usado**: `agentMode: "llm"` sem decisor externo injetado permanece heurístico (e `strictlyReproducible: true`). A LLM configurada na tela de IA é usada para o **relatório narrativo**; decisões de agentes com provedor externo (`HttpLLMDecider`) existem como API experimental, não exposta na UI, e marcam `strictlyReproducible: false`. Reset e mudança de seed recriam os provedores de decisão com o RNG atual; cache de decisões desabilitado por padrão (`cachePolicy: "none"`). Detalhes: [`docs/REPRODUTIBILIDADE.md`](docs/REPRODUTIBILIDADE.md).

### Segurança de credenciais

A **API Key** do provedor de IA é usada apenas pelo navegador durante a sessão atual (`sessionStorage`) e é apagada ao fechar a aba. Ela **nunca** é gravada em `localStorage`, nem em logs, histórico, exportações ou hash. Configuração não sensível (provedor, endpoint, modelo) persiste normalmente. O modo **Ollama local** funciona sem chave.

### Build de produção

```bash
npm run build
```

Os arquivos estáticos serão gerados em `dist/`. Sirva com qualquer servidor web (nginx, Apache, Caddy, etc.).

```bash
# Exemplo com npx serve
npx serve dist
```

---

## Como Usar

O simulador funciona como um laboratório digital de política regulatória. Você escolhe um cenário (playbook), ajusta os parâmetros, executa a simulação e analisa os resultados.

### 1. Escolha um Playbook

Na tela inicial, selecione um dos **23 playbooks regulatórios** organizados em 5 categorias. Cada playbook representa uma abordagem diferente para regular a IA no Brasil. Se preferir, você pode comparar até **3 playbooks lado a lado** para ver como diferentes estratégias regulatórias produzem resultados distintos.

### 2. Ajuste os Parâmetros

Antes de simular, você pode ajustar dezenas de parâmetros regulatórios:

- **Custo de conformidade** para startups e big techs
- **Probabilidade de auditoria** e severidade de multas
- **Fomento estatal** e incentivos à inovação
- **Mecanismos de proteção** de titulares de dados
- **Políticas de compras públicas** e cotas para startups
- **Capacidade de sandbox regulatório**
- Entre outros, dependendo do playbook escolhido

Cada parâmetro tem valores mínimos e máximos calibrados com base na literatura econômica e jurídica.

### 3. Execute a Simulação

A simulação avança **turno a turno**, onde cada turno representa um período de atividade econômica. Durante a execução, você pode:

- **Acompanhar em tempo real** os gráficos de evolução
- **Pausar** a qualquer momento e ajustar parâmetros
- **Alternar entre velocidade** de simulação
- Ver o **painel de indicadores** (KPIs) sendo atualizado

### 4. Analise os Resultados

Ao final da simulação, o sistema gera:

- **7 gráficos dinâmicos**: evolução do mercado, concentração (HHI), confiança social, fluxo de capital, demografia empresarial, diversidade de produtos e curvas de adoção de IA
- **KPIs numéricos**: startups ativas, big techs no mercado, trust social, produtos em conformidade, investimento recebido, falências
- **Relatório interpretativo automatizado**: gerado automaticamente ao final da simulação (por IA, se configurada; senão pela análise heurística completa), com o texto exibido na tela reproduzido 1:1 no relatório e rótulo da fonte (IA generativa ou heurística) na capa e no rodapé
- **Comparação**: visualize até 3 cenários lado a lado no mesmo gráfico

### 5. Exporte

É possível exportar os resultados em **PDF** ou **DOCX** para consulta posterior ou compartilhamento. O relatório **LaTeX** (`Exportar LaTeX`) é o formato primário de relatório: gera um `.tex` autossuficiente com capa, gráficos pgfplots, relatório interpretativo completo e anexos, compilável com `tectonic -X compile relatorio.tex` (ou Overleaf). O relatório segue identidade visual e especificações documentadas em:

- [`DESIGN.md`](DESIGN.md) — tokens visuais (cores, tipografia, componentes do relatório)
- [`docs/RELATORIO-SPEC.md`](docs/RELATORIO-SPEC.md) — especificação técnica da geração do relatório (LaTeX primário; PDF rasterizado como opção secundária)

### 6. Histórico

Todas as simulações executadas são salvas automaticamente no navegador (localStorage). Você pode revisitar, comparar ou exportar resultados anteriores a qualquer momento.

### Geração de relatórios com IA (opcional)

O simulador pode gerar relatórios narrativos usando modelos de linguagem. Para ativar:

1. Acesse **Configurações → IA** no menu superior
2. Conecte uma API compatível com OpenAI (OpenAI, Anthropic, Ollama local, OpenRouter, etc.)

> **Nota:** nenhuma chave de API é fornecida. O recurso de relatórios funciona em modo heurístico (sem IA) por padrão. O uso de IA é opcional e não afeta a simulação.

---

## Como o Motor de Simulação Funciona

O núcleo do simulador é um **Modelo Baseado em Agentes (ABM)** que opera da seguinte forma:

### Agentes

- **Startups** (até 20): agentes com capital inicial, custos fixos variáveis, capacidade de inovação e sensibilidade a conformidade. Entram no mercado, competem, buscam investimento e podem falir.
- **Big Techs** (até 5): agentes com vantagens de escala, maior capacidade de compliance e influência regulatória. Atuam no mesmo mercado que as startups.
- **Titulares de Dados** (agentes implícitos): representam a sociedade civil, com nível de **confiança social** que reage a incidentes, conformidade e percepção de captura regulatória. Podem boicotar empresas com baixa conformidade.

### Mecanismos

A cada turno, o motor executa sequencialmente:

1. **Nascimento de startups**: novas empresas entram conforme o momento do mercado
2. **Cálculo de receitas**: cada empresa gera receita com base em seus produtos ativos
3. **Competição e substituição**: produtos concorrem; IA generativa pode substituir produtos tradicionais
4. **Custo de conformidade**: empresas pagam custos regulatórios proporcionais ao risco
5. **Auditoria e multas**: sorteio determina se há auditoria; não conformidade gera multa
6. **Investimento e fomento**: VC e fundos estatais distribuem capital
7. **P&D e inovação**: empresas investem em novos produtos
8. **Falências**: empresas com capital negativo encerram atividades
9. **Confiança social**: atualizada com base em conformidade, incidentes e percepção de captura
10. **Infraestrutura**: custos de nuvem e gargalos computacionais afetam operação

### Curvas de Adoção

Três tipos de inovação são modelados com curvas de adoção próprias:
- **IA Complementar**: adotada gradualmente, aumenta produtividade
- **IA Substitutiva**: substitui produtos tradicionais, pode concentrar mercado
- **IA Generativa**: efeitos de rede, criação de novos mercados

---

## Playbooks

O simulador oferece **23 cenários regulatórios** em 5 categorias. Cada playbook modela uma abordagem específica de regulação de IA, com parâmetros calibrados e fundamentação teórica própria.

### Regulação & Conformidade (9 playbooks)

| Playbook | O que mede |
|----------|-----------|
| **Aplicação estrita do PL 2338** | Sobrevivência de startups, concentração de mercado (HHI) e confiança social sob regime regulatório rigoroso com multas altas e auditoria frequente |
| **Autorregulação e Códigos de Conduta** | Se códigos setoriais voluntários alcançam conformidade aceitável ou se são capturados por incumbentes |
| **Captura Regulatória (Stigler)** | Risco de big techs influenciarem a regulação para criar barreiras de entrada, medida pela concentração de mercado e queda de startups |
| **Análise Econômica do Direito (Cooter & Ulen)** | Eficiência da combinação entre probabilidade de auditoria e severidade de multas para dissuadir infrações sem inviabilizar startups |
| **Governança e Autorregulação** | Efeito de estruturas de governança corporativa e compliance voluntário sobre confiança social e perenidade das empresas |
| **Direitos Fundamentais (debate atual PL 2338)** | Tensão entre proteção de direitos dos titulares e viabilidade econômica do ecossistema de inovação |
| **Limites do Consentimento e Assimetria (Bioni)** | Se a regulação baseada em consentimento formal protege titulares ou apenas mascara assimetrias entre big techs e usuários |
| **Auditoria Algorítmica Obrigatória** | Eficácia de auditorias externas obrigatórias na detecção de riscos e impacto do custo de auditoria sobre startups |
| **Seguro Obrigatório e Responsabilidade** | Se seguro obrigatório estabiliza a confiança social ou se prêmios elevados concentram mercado |

### Concentração & Poder de Mercado (3 playbooks)

| Playbook | O que mede |
|----------|-----------|
| **Barreiras de Entrada (Porter)** | Como custos de conformidade e vantagens de escala criam barreiras que protegem incumbentes |
| **Equilíbrio Não Cooperativo (Nash, Tucker, Hardin)** | Se a regulação sem coordenação leva à tragédia dos comuns: descumprimento generalizado, erosão de confiança e incidentes sistêmicos |
| **Contratos Públicos Anti-Captura** | Se reserva de contratos públicos para startups reduz concentração ou se mecanismos anti-captura são eficazes |

### Acesso & Inovação (3 playbooks)

| Playbook | O que mede |
|----------|-----------|
| **Estado Empreendedor (Mazzucato)** | Se fomento estatal direcionado estimula inovação ou se os recursos são capturados por incumbentes |
| **Sandbox ANPD (Regulação Experimental)** | Se ambientes regulatórios experimentais reduzem barreiras de entrada para startups sem comprometer a proteção de direitos |
| **Procurement Público e Startups** | Se compras públicas com cotas para startups geram mercado para inovadores entrantes |

### Dinâmicas Sociais (6 playbooks)

| Playbook | O que mede |
|----------|-----------|
| **Destruição Criativa (Schumpeter Mk II)** | Se a regulação permite que startups desafiem incumbentes ou se cristaliza a concentração de mercado |
| **A Segunda Era das Máquinas (Brynjolfsson & McAfee)** | Abundância digital gerada pela IA versus concentração de capital e confiança social |
| **Inovação Direcionada Pró-Trabalhador (Acemoglu & Johnson)** | Se a regulação direciona a inovação para complementar o trabalho humano ou para substituí-lo |
| **Trajetória Evolucionária (Nelson & Winter)** | Como rotinas organizacionais e pressão seletiva da regulação moldam a sobrevivência das empresas |
| **Ética Complementar e Design Pró-Ético (Floridi)** | Se padrões éticos voluntários geram retorno em confiança e reputação sem sufocar novos entrantes |
| **O Desafio da IA Generativa** | Impacto da IA generativa em riscos sistêmicos (deepfakes, desinformação), direitos autorais e exaustão de infraestrutura |

### Internacional (2 playbooks)

| Playbook | O que mede |
|----------|-----------|
| **Modelo de Alta Confiança (Neo-Nórdico)** | Efeito de alto investimento estatal em inovação combinado com regulação rigorosa sobre confiança institucional e competitividade |
| **Rigor Extremo (EU AI Act × PL 2338)** | Impacto de uma regulação ainda mais rigorosa que o PL 2338 sobre sobrevivência de startups e proteção de direitos |

Cada playbook inclui na interface: resumo executivo, base teórica, fundamentação jurídica, nota interpretativa, nível de confiança, parâmetros calibrados e referências bibliográficas completas.

---

## Para Formuladores de Políticas e Pesquisadores

O simulador permite testar perguntas como:

- **O PL 2338 na forma atual concentra ou desconcentra o mercado de IA?**
- **Sandboxes regulatórios realmente reduzem barreiras de entrada para startups?**
- **Multas mais severas desestimulam a concentração ou apenas aumentam custos de conformidade?**
- **O fomento estatal via compras públicas é mais eficaz que subsídio direto?**
- **Como a confiança social reage a diferentes regimes de auditoria e transparência?**

Os **23 playbooks** cobrem a maior parte das propostas em discussão no Legislativo, no Executivo e na academia, permitindo explorar trajetórias possíveis em cenários parametrizados (sem capacidade preditiva).

---

## FAQ — Perguntas Frequentes

### Qual versão do Node.js eu preciso?
Node.js 20 ou superior. Versões anteriores podem não funcionar devido a APIs modernas do JavaScript usadas no motor ABM.

### Preciso de conexão com a internet para rodar?
Não após a instalação. O simulador não depende de backend próprio: no **modo heurístico**, o processamento permanece local no navegador. Quando um provedor de IA é configurado, dados derivados da simulação (métricas, parâmetros, eventos críticos) e a credencial são enviados **diretamente pelo navegador ao endpoint selecionado pelo usuário** — nunca a um servidor deste projeto.

### Onde meus dados são salvos?
Todas as simulações e resultados ficam no **localStorage do navegador**. Nada é enviado a servidores externos no modo heurístico; ao usar um provedor de IA externo, os dados necessários à geração do relatório são enviados ao endpoint configurado. Se você limpar os dados do navegador, perderá o histórico.

### Como mudo o idioma?
O simulador oferece **pt-BR** e **en**. O idioma padrão segue a configuração do navegador. Para alternar manualmente, use o seletor de idioma na interface.

### Posso adicionar meus próprios playbooks?
Sim. Os playbooks estão em `src/data/playbooks/`. Cada arquivo exporta um array de cenários. Siga o formato existente — você precisa definir parâmetros, base teórica e calibração. Após adicionar, reinicie o servidor de desenvolvimento.

### O simulador funciona offline?
Sim. Todo o motor ABM executa no navegador. O histórico fica no localStorage. A única dependência de rede é para APIs de IA (opcional).

### Quanto de memória/RAM o simulador consome?
Cerca de 200-500 MB durante a execução de simulações, dependendo do número de turnos. O build de produção consome ~300 KB de JavaScript gzippado.

### O simulador roda em dispositivos móveis?
A interface é responsiva e funciona em tablets e smartphones, mas a experiência é otimizada para telas maiores (desktop/notebook) devido à densidade de informação dos gráficos.

### Como faço para contribuir?
Veja a seção de playbooks e o código-fonte em `src/`. Pull requests são bem-vindos. Para mudanças significativas, abra uma issue primeiro.

---

## Arquitetura

O simulador é composto por duas camadas principais:

| Camada | Descrição | Tecnologia |
|--------|-----------|------------|
| **Engine ABM** | Motor de simulação baseado em agentes com 20 módulos especializados (empresas, titulares de dados, VC, fomento estatal, nuvem, conformidade, aprendizado, curvas de adoção, análise de sensibilidade) | TypeScript puro |
| **Frontend SPA** | Interface web interativa com 7 telas (home, setup, simulação, resultado, histórico, comparação, configuração de IA) | React 19 + Vite 8 + Tailwind v4 + Radix UI + Zustand |

### Estrutura de Diretórios

```
simulador-pl2338/
├── CHANGELOG.md          # Histórico de versões (Keep a Changelog)
├── DESIGN.md             # Design system dos relatórios (tokens visuais)
├── .github/workflows/
│   └── ci.yml           # CI: npm ci → typecheck → typecheck:test → lint → test → build
├── docs/
│   ├── RELATORIO-SPEC.md # Especificação técnica da geração de relatórios
│   └── REPRODUTIBILIDADE.md # Definições e script de execução em lote
├── src/
│   ├── engine/          # Motor ABM (Simulation, ActorManager, Titular, etc.)
│   │   ├── validators/  # Checagens de coerência com fatos estilizados
│   │   └── version.ts   # Versão única (fonte: package.json)
│   ├── components/      # Componentes React reutilizáveis
│   │   ├── config/      # Componentes de configuração de IA
│   │   ├── report/      # Template de relatório
│   │   └── ui/          # Componentes base (shadcn/ui)
│   ├── screens/         # Telas da aplicação (7 telas)
│   ├── data/playbooks/  # 23 playbooks regulatórios
│   ├── locales/         # Traduções pt-BR e en
│   ├── lib/             # Utilitários (exportação LaTeX/PDF/DOCX, narrativas de relatório, formatação, finiteValues, aiConfigStorage)
│   ├── stores/          # Estado global (Zustand)
│   └── config/          # Provedores de IA e versão
├── test/                # Suíte de testes do motor (Vitest)
└── README.md            # Este arquivo
```

### Stack

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| UI Framework | React | 19 |
| Build Tool | Vite | 8 |
| Linguagem | TypeScript | 6 |
| CSS | Tailwind CSS | 4 |
| Componentes | Radix UI + shadcn/ui | — |
| Gráficos | Recharts | — |
| Estado | Zustand | — |
| Internacionalização | i18next | — |
| Exportação | LaTeX (tectonic) + jsPDF + docx | — |

---

## Glossário de Métricas

- **Proxy de concentração de capital (HHI)**: índice Herfindahl-Hirschman calculado sobre o capital das empresas ativas (0 = concorrência perfeita, 10.000 = monopólio). É **proxy patrimonial**: não mede poder de mercado sozinho, e os limiares 1.500/2.500 são **referência indicativa não calibrada** para esse proxy.
- **HHI de receita**: HHI calculado sobre a receita do último turno; quando disponível, é a base preferencial de classificação de concentração.
- **HHI de produtos de alto risco**: HHI calculado sobre a contagem de produtos de alto risco por empresa.
- **Runway médio**: média de turnos até a falência, calculada **apenas entre empresas com runway finito** (empresas com runway infinito não reduzem artificialmente a média). A exportação inclui `finiteRunwayCompanyCount` e `unlimitedRunwayCompanyCount`.
- **Velocidade de adoção**: magnitude da maior variação absoluta entre as proporções de adoção (complementar, substitutiva, generativa) em relação ao turno anterior. Quando não há produtos, o snapshot é zerado (adoção zero).

## Limites Metodológicos

- O simulador é um **instrumento exploratório de cenários regulatórios**: não faz previsão de efeitos reais da legislação.
- O relatório gerado **não constitui parecer jurídico**, não é recomendação regulatória oficial e o texto de LLM requer revisão humana.
- As checagens de coerência (`src/engine/ValidationModule.ts`) comparam resultados com **fatos estilizados da literatura** (faixas heurísticas) e **não** constituem validação empírica nem calibração com dados reais.
- O modo LLM externa não é estritamente reproduzível; o modo heurístico é determinístico por seed.
- A legislação pode mudar; os playbooks refletem o estado normativo da época de desenvolvimento.

## Schema de Exportação

As exportações (JSON/CSV) seguem um schema versionado (`schemaVersion`, independente da versão do software) e incluem metadados de reprodutibilidade (`seed`, `decisionMode`, `decisionProvider`, `externalLLMUsed`, `strictlyReproducible`, `executedTurns`, `snapshotCount`, `startedAt`, `exportedAt`, `initialParams`, `finalRegulatoryState`, `softwareVersion`). Os metadados refletem o **provedor efetivamente usado** (não o `agentMode` desejado). Cada turno persiste os contadores de runway (`finiteRunwayCompanyCount`, `unlimitedRunwayCompanyCount`) e o log causal como snapshot profundo. Valores não finitos (NaN/Infinity) abortam a exportação com erro explícito, nunca são mascarados. A API Key nunca é exportada.

---

## Validação e Robustez

> **Nota de reprodutibilidade**: durante o desenvolvimento, o simulador foi submetido a uma bateria de **23.000 simulações** (1.000 × 23 playbooks, 10 faixas paramétricas cada) executadas em **ambiente de desenvolvimento separado**, com 5 checagens de coerência com fatos estilizados. Essa bateria não é reproduzível integralmente a partir deste repositório (exige horas de CPU e o ambiente da época). O que é reproduzível a partir do repositório: o motor determinístico por seed, a suíte de testes automatizados (`npm test`) e o script de execução em lote documentado em [`docs/REPRODUTIBILIDADE.md`](docs/REPRODUTIBILIDADE.md). Os validadores abaixo são **checagens de coerência com fatos estilizados da literatura**, não validação empírica nem calibração com dados reais.

- **AdoptionCurves**: estabilidade das curvas de adoção por tipo de IA
- **ConcentrationTrust**: relação entre concentração de mercado e confiança social
- **BusinessDemography**: demografia empresarial (taxas de entrada, sobrevivência, falência)
- **ProductDiversity**: diversidade de produtos no ecossistema
- **CapitalFlow**: fluxo de capital (VC, subsídios, dreno de nuvem)

---

## Contexto Acadêmico

Este projeto foi desenvolvido como trabalho final da disciplina IA006 — Tópicos em Sistemas Inteligentes II, Turma I ("Aplicações da Ciência e Engenharia dos Sistemas Dinâmicos de Muitos Agentes"), oferecida pelo Programa de Pós-Graduação da Faculdade de Engenharia Elétrica e de Computação (FEEC) da Unicamp, que cursei como aluno regular de mestrado no 1º semestre de 2026.

A disciplina me proporcionou conectar experiências obtidas ao longo da minha trajetória profissional (que percorre Direito, Tecnologia e Gestão) à pesquisa acadêmica em sistemas complexos e modelagem baseada em agentes. Busquei tentar refletir essa intersecção diretamente no simulador: as perguntas que ele busca responder nascem tanto de questões enfrentadas na prática profissional quanto na investigação acadêmica.

## Metodologia de Desenvolvimento

Este projeto foi desenvolvido utilizando **vibe coding**, uma abordagem de codificação iterativa e dialógica mediada por Inteligência Artificial Generativa (IA Gen) na qual a IA atua como parceira no processo criativo e formativo (de Lima Prestes, 2025a). O código foi gerado, revisado e refinado por meio de interações em linguagem natural com modelos de linguagem, com supervisão e direção humana em todas as etapas.

Cada funcionalidade seguiu o ciclo definido no **Framework para Letramento Crítico em IA** (de Lima Prestes, 2025b): **intenção → prompt → geração → análise crítica → metacognição → autoria → iteração**. Esse processo assegura que o uso da IA não substitui o raciocínio, mas o potencializa, alinhado aos princípios de redução de Carga Extrínseca e ampliação de Carga Germana (Sweller, 1988; 2010; Grazioli, 2025).

A escolha metodológica fundamenta-se na pesquisa que venho desenvolvendo sobre vibe coding como estratégia pedagógica e prática de desenvolvimento, apresentada no Congresso Brasileiro de Ensino de Engenharia e no SciELO Preprints.

### Referências da metodologia

> de Lima Prestes, J. A. (2025a). *Vibe Coding e Ensino Humanizado com IA: Uma Proposta Inclusiva para a Formação em Engenharia*. COBENGE 2025. DOI: [10.37702/2175-957X.COBENGE.2025.6030](https://doi.org/10.37702/2175-957X.COBENGE.2025.6030)

> de Lima Prestes, J. A. (2025b). *Vibe Coding na Educação Superior: Framework para Letramento Crítico em IA*. SciELO Preprints. DOI: [10.1590/SciELOPreprints.15198](https://doi.org/10.1590/SciELOPreprints.15198)

---

## Licença

MIT License

Copyright (c) 2026 José Augusto de Lima Prestes

Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## Citação

Se você usar este software em pesquisas, por favor cite como:

```bibtex
@software{prestes_simulador_2026,
  author = {de Lima Prestes, José Augusto},
  title = {Simulador PL 2338/2023: ABM do Impacto Regulatório de IA no Brasil},
  year = {2026},
  url = {https://github.com/josealprestes/simulador-pl2338},
  note = {Projeto final da disciplina IA006 — Tópicos em Sistemas Inteligentes II, Turma I, FEEC/Unicamp.}
}
```

---

## Desenvolvimento Local

### Testes E2E (opcional)

Testes end-to-end com Playwright são mantidos apenas localmente, fora do repositório público. Para executá-los:

```bash
# Instalar dependências de teste
npm install -D playwright @playwright/test @types/node

# Instalar navegador Chromium
npx playwright install chromium

# Executar testes E2E
npx playwright test
```

---

## Links

- **Site:** [joseprestes.com](https://joseprestes.com)
- **ORCID:** [0000-0001-8686-5360](https://orcid.org/0000-0001-8686-5360)
- **Currículo Lattes:** [8295411061159606](http://lattes.cnpq.br/8295411061159606)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
