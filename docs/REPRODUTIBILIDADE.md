# Reprodutibilidade

Este documento define o que é reproduzível a partir do repositório público e
como executar.

## 1. O que é estritamente reproduzível

O motor é **determinístico por seed** no modo heurístico: mesmas seed e
configuração produzem o mesmo histórico, turno a turno. A garantia vem de:

- RNG LCG semeado (`src/engine/RNG.ts`), único ponto de geração estocástica;
- nenhum `Math.random()` em caminhos científicos do motor (decisões de Big
  Techs inclusas, via `HeuristicLLMDecider` com RNG injetado);
- **reset e mudança de seed recriam os provedores de decisão** com o RNG
  atual (`configureDecisionProviders`): o decisor heurístico nunca fica
  preso a um RNG obsoleto; um decisor externo genuinamente injetado é
  preservado;
- **ActorManager sincronizado**: `setParams()` no manager após reset e
  mudança de parâmetros — nunca opera com objeto de parâmetros obsoleto;
- **política de cache de decisões**: desabilitada por padrão (heurística e
  HTTP externo usam `cachePolicy: "none"`); quando um provedor declara
  `"state"` (idempotência), a chave inclui `companyId` e `turno` — duas
  empresas com estado semelhante nunca compartilham decisão cacheada;
- **provedor efetivo nos metadados**: `decisionMode`/`decisionProvider`/
  `strictlyReproducible`/`externalLLMUsed` refletem o decisor REALMENTE
  usado, não o `agentMode` desejado. `agentMode: "llm"` sem decisor externo
  injetado permanece heurístico e `strictlyReproducible: true`;
- **lobby observável**: cada ação de lobby registra entrada no log causal
  (`type: "lobby"` com `auditProbabilityBefore/After`) e evento estruturado
  `LOBBY` em `criticalEvents` (uma ocorrência por empresa por turno);
- **turnos executados × snapshots**: `executedTurns` (`ctx.turn`) e
  `snapshotCount` (`history.length`, inclui o turno zero) são metadados
  explícitos da exportação; `totalTurns` ambíguo foi removido;
- reset equivalente a nova instância (mesmos parâmetros e seed);
- exportação com metadados de reprodutibilidade: `seed`, `decisionMode`,
  `decisionProvider`, `strictlyReproducible`, `externalLLMUsed`,
  `executedTurns`, `snapshotCount`, `initialParams` e
  `finalRegulatoryState` (`softwareVersion` e `schemaVersion` incluídos).

## 1.1. Decisões de agente × geração de relatório

O provedor configurado na tela de IA é consumido pelo `AnalysisGenerator`
para produzir o **relatório narrativo** (leitura direta da configuração +
`fetch`). Esse caminho é distinto do decisor estratégico: as decisões dos
agentes no motor usam o decisor heurístico semeado por padrão; o
`HttpLLMDecider` é a implementação **experimental** para decisões
estratégicas (injeção via construtor de `Simulation`), não exposta na UI, e
quando injetado os metadados passam a refletir
`external-llm`/não reproduzível. Execuções normais nunca são marcadas como
externas.

## 1.2. Log causal e parâmetros

- `causalLog` é um snapshot **profundo** (`structuredClone`, com fallback por
  clone recursivo JSON-safe): mutações no estado vivo nunca alteram o
  histórico registrado;
- `initialParams` é acessível apenas via cópia profunda (getter) — mutações
  externas não afetam a configuração original usada pelo reset;
- contadores de runway (`finiteRunwayCompanyCount`,
  `unlimitedRunwayCompanyCount`) são persistidos em cada turno, no JSON e no
  CSV.

Verificação automatizada: `npm test` (determinismo, divergência entre seeds,
reset, mudança de seed, decisor externo preservado, parâmetros imutáveis,
HHI, runway, adoção, exportação, credenciais, cache de decisões, score
normalizado de fatos estilizados).

## 2. Execução em lote (BatchRunner)

O motor possui um runner headless para execução em lote com Monte Carlo e
análise de sensibilidade: `BatchRunner` (`src/engine/BatchRunner.ts`).

```ts
import { BatchRunner } from "./src/engine/BatchRunner";
import { Simulation } from "./src/engine/Simulation";

// 1.000 execuções com seeds determinísticas (baseSeed + i)
const params = Simulation.defaultParams();
params.seed = 12345; // base seed documentada
const results = await BatchRunner.run(params, 1000);

// Resumo estatístico por execução
console.table(
  results.map((r) => ({
    seed: r.seed,
    activeStartups: r.activeStartups,
    hhi: r.hhi,
    socialTrust: r.socialTrust,
  })),
);
```

Regras para uma bateria publicável:

1. fixe a seed base e documente-a (as seeds usadas são `baseSeed + i`);
2. fixe a versão do software (`package.json` → `version`) e registre a data;
3. salve o resumo estatístico (média, desvio, matriz de correlação via
   `MetricsEngine.calculateCorrelationMatrix`) junto com os resultados;
4. registre as limitações (CPU, tempo de execução, faixas paramétricas).

## 3. Limites metodológicos

- O modo **LLM externa** não é estritamente reproduzível: provedores externos
  são não determinísticos. A exportação marca `strictlyReproducible: false`
  nesse modo.
- A bateria de 23.000 simulações citada no README foi executada em ambiente
  de desenvolvimento separado, fora do repositório público, e não é
  reproduzível integralmente a partir dele (exige horas de CPU e o ambiente
  da época).
- As checagens de coerência (`src/engine/ValidationModule.ts`) comparam os
  resultados com **fatos estilizados da literatura** (faixas heurísticas).
  Elas não constituem validação empírica, calibração com dados reais nem
  previsão de efeitos da legislação.
- Timestamps reais (`startedAt`, `exportedAt`) são metadados de auditoria e
  ficam **fora** do hash científico, que distingue configuração inicial,
  estado final, seed e modo de decisão.
