import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, CheckCircledIcon, ChevronDownIcon, GearIcon } from "@radix-ui/react-icons";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { useSimulationStore } from "@/stores/simulation.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { PLAYBOOK_CATEGORIES } from "@/data/playbooks/categories";
import PLAYBOOKS from "@/data/playbooks";
import type { Screen } from "@/stores/navigation.store";
import type { SimulationParams } from "@/engine/types";
import { PageHeader } from "@/components/PageHeader";

const INTENT_PATHS = [
  {
    id: "competition",
    label: "Concentração de mercado",
    question: "Como a regulação afeta barreiras de entrada e poder das incumbentes?",
    ids: ["porter", "stigler", "anticaptura_procurement"],
  },
  {
    id: "innovation",
    label: "Inovação e acesso",
    question: "Qual desenho preserva entrada de startups e criação de produtos?",
    ids: ["mazzucato", "sandbox_anpd", "procurement_publico"],
  },
  {
    id: "trust",
    label: "Confiança social",
    question: "Como riscos, incidentes e conformidade alteram a confiança pública?",
    ids: ["floridi", "pl2338_rigor", "generative_challenge"],
  },
  {
    id: "compliance",
    label: "Fiscalização e compliance",
    question: "Quais custos, auditorias e sanções equilibram proteção e viabilidade?",
    ids: ["auditoria_algoritmica", "seguro_responsabilidade", "cooter_ulen"],
  },
  {
    id: "international",
    label: "Comparação internacional",
    question: "O que muda ao aproximar o Brasil de modelos europeus ou de alta confiança?",
    ids: ["modelo_nordic", "ai_act_vs_pl2338", "governança_brasileira"],
  },
] as const;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { setSelectedPlaybook, setCurrentPlaybookData, setParams, setInitialParams, reset } =
    useSimulationStore();
  const { setScreen } = useNavigationStore();
  const [selectedIntent, setSelectedIntent] = useState<string>(INTENT_PATHS[0].id);

  const categorizedPlaybooks = useMemo(() => {
    const orderedIds = PLAYBOOK_CATEGORIES.flatMap(({ ids }) =>
      ids.filter((id) => PLAYBOOKS.some((pb) => pb.id === id))
    );

    return PLAYBOOK_CATEGORIES.map(({ label, ids }) => ({
      label,
      items: ids
        .filter((id) => PLAYBOOKS.some((pb) => pb.id === id))
        .map((id) => ({
          pb: PLAYBOOKS.find((p) => p.id === id)!,
          index: orderedIds.indexOf(id) + 1,
        })),
    })).filter(({ items }) => items.length > 0);
  }, []);

  const selectedIntentPath = useMemo(
    () => INTENT_PATHS.find((intent) => intent.id === selectedIntent) ?? INTENT_PATHS[0],
    [selectedIntent],
  );

  const recommendedPlaybooks = useMemo(
    () =>
      selectedIntentPath.ids
        .map((id) => PLAYBOOKS.find((pb) => pb.id === id))
        .filter(Boolean),
    [selectedIntentPath],
  );

  function handleSelectPlaybook(id: string) {
    const pb = PLAYBOOKS.find((p) => p.id === id);
    if (!pb) return;
    reset(); // ← limpa estado da simulação anterior
    setSelectedPlaybook(id);
    setCurrentPlaybookData(pb as unknown as Record<string, unknown>);
    setParams({ ...pb.params, maxTurns: pb.maxTurns } as unknown as SimulationParams);
    setInitialParams({ ...pb.params } as unknown as SimulationParams);
    setScreen("SETUP" as Screen);
  }

  function renderPlaybookCard(pb: (typeof PLAYBOOKS)[number], index: number, compact = false) {
    return (
      <Card
        key={pb.id}
        className={`group p-0 transition-all hover:ring-primary/50 hover:shadow-md ${
          compact ? "min-h-[104px]" : "h-[88px]"
        }`}
      >
        <button
          type="button"
          role={compact ? undefined : "button"}
          onClick={() => handleSelectPlaybook(pb.id)}
          className="flex h-full w-full items-start gap-3 p-3 text-left"
          aria-label={`Selecionar: ${t(`playbook.${pb.id}.name`, { defaultValue: pb.name })}`}
        >
          <span className="text-xs font-mono font-bold text-on-surface-variant mt-0.5 shrink-0">
            {String(index).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-on-surface line-clamp-2 leading-tight mb-1">
              {t(`playbook.${pb.id}.name`, { defaultValue: pb.name })}
            </span>
            <span className="block text-[10px] text-on-surface-variant line-clamp-1 opacity-70">
              {String(pb.author)}
            </span>
            {compact && (
              <span className="mt-2 block text-xs leading-relaxed text-on-surface-variant line-clamp-2">
                {String(pb.executiveSummary || pb.scenarioSummary || "")}
              </span>
            )}
          </span>
          <ArrowRightIcon
            width={14}
            height={14}
            className="mt-1 shrink-0 text-on-surface-variant group-hover:text-on-surface transition-colors"
          />
        </button>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title={t("app_title", "Simulador PL 2338")}
        subtitle={t("hero_subtitle", { defaultValue: "Explore cenários regulatórios parametrizados, dinâmicas de mercado e evolução institucional da IA no Brasil através de modelos baseados em agentes (ABM)." })}
        showHomeButton={false}
        actions={
          <>
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setScreen("COMPARISON" as Screen)}>
                {t("nav.compare", "Comparar")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScreen("HISTORY" as Screen)}>
                {t("nav.history", "Histórico")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScreen("AI_CONFIG" as Screen)}>
                <GearIcon className="w-3.5 h-3.5" />
                {t("nav.ai_config", "Configurar IA")}
              </Button>
            </div>
            {/* Mobile Action */}
            <div className="sm:hidden">
              <MobileNavMenu />
            </div>
          </>
        }
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-on-surface">
          {t("common.about_title", "O que é este simulador?")}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4">
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {t("common.about_text_1", { defaultValue: "O Simulador PL 2338/2023 é uma ferramenta exploratória de comparação de cenários regulatórios. Ele utiliza modelos baseados em agentes (ABM) para explorar como diferentes configurações da regulação de IA produzem trajetórias distintas dentro das premissas do modelo." })}
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {t("common.about_text_2", { defaultValue: "Ao ajustar parâmetros como custos de conformidade, severidade de multas e capacidade de ambientes experimentais (sandbox), você pode observar o comportamento emergente de empresas incumbentes e novos entrantes ao longo do tempo." })}
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {t("common.about_text_3", { defaultValue: "O sistema entrega relatórios interpretativos automatizados que traduzem os dados estocásticos em leituras institucionais, apoiando a formulação de hipóteses e a análise de sensibilidade sobre cenários regulatórios parametrizados." })}
            </p>
            <p className="text-xs text-on-surface-variant/70 italic">
              {t("common.about_text_4", { defaultValue: "Os parâmetros, premissas de modelagem e playbooks deste simulador se baseiam na literatura acadêmica sobre economia da complexidade, análise econômica do direito e nas bases legais do PL 2338/2023. Cada cenário reflete uma perspectiva teórica consolidada (como Schumpeter, Mazzucato ou Stigler), permitindo explorar trajetórias possíveis em cenários parametrizados." })}
            </p>
            <p className="text-xs text-on-surface-variant/70">
              <strong>Aviso:</strong> os resultados não são previsão, não constituem parecer, dependem das premissas do modelo e não substituem análise empírica.
            </p>
          </div>
        </div>
      </section>
      <section className="space-y-4" aria-labelledby="intent-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="intent-heading" className="text-xl font-semibold text-on-surface">
              {t("home.intent_title", "Comece pela pergunta regulatória")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-on-surface-variant leading-relaxed">
              {t("home.intent_desc", "Escolha o objetivo da análise. O simulador sugere playbooks alinhados à pergunta, sem esconder o catálogo completo abaixo.")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedIntent(INTENT_PATHS[0].id)}>
            {t("home.intent_reset", "Ver trilha padrão")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {INTENT_PATHS.map((intent) => {
            const active = selectedIntentPath.id === intent.id;
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() => setSelectedIntent(intent.id)}
                className={`min-h-[112px] rounded-none border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "border-primary bg-primary/10 text-on-surface"
                    : "border-outline-variant bg-surface-container-low/40 text-on-surface-variant hover:border-outline hover:bg-surface-container"
                }`}
                aria-pressed={active}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-on-surface">{intent.label}</span>
                  {active && <CheckCircledIcon className="h-4 w-4 shrink-0 text-primary" />}
                </span>
                <span className="mt-2 block text-xs leading-relaxed">
                  {intent.question}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.4fr] gap-4">
          <div className="border border-outline-variant bg-surface-container-low/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {t("home.recommended_path", "Trilha sugerida")}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-on-surface">
              {selectedIntentPath.label}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {selectedIntentPath.question}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant/80">
              {t("home.recommended_hint", "Use esta trilha para iniciar rápido ou role para baixo e escolha qualquer playbook do catálogo completo.")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendedPlaybooks.map((pb, index) => pb && renderPlaybookCard(pb, index + 1, true))}
          </div>
        </div>
      </section>

      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-on-surface">
            {t("home.catalog_title", "Catálogo completo de cenários")}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t("home.catalog_desc", "Para usuários avançados, todos os playbooks continuam disponíveis por categoria.")}
          </p>
        </div>
        {categorizedPlaybooks.map(({ label, items }) => (
          <Fragment key={label}>
            <div className="flex items-center gap-4 mb-4 mt-10 first:mt-0">
              <h2 className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
                {label}
              </h2>
              <span className="flex-1 h-px bg-outline-variant" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(({ pb, index }) => (
                renderPlaybookCard(pb, index)
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}