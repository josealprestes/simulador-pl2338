import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@/stores/simulation.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadSavedSimulations, deleteSavedSimulation, type SavedSimulation } from "@/lib/simulationPersistence";
import type { Screen } from "@/stores/navigation.store";
import { PageHeader } from "@/components/PageHeader";

function getPresetName(params: any) {
  if (!params) return "Personalizado";
  if (params.complianceCostHighRisk === 80000) return "Conservador";
  if (params.complianceCostHighRisk === 25000) return "Base";
  if (params.complianceCostHighRisk === 10000) return "Otimista";
  return "Personalizado";
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { params, setParams, setHistory, setTurn, setInitialParams } = useSimulationStore();
  const { setScreen } = useNavigationStore();
  const [saved, setSaved] = useState<SavedSimulation[]>([]);

  useEffect(() => {
    setSaved(loadSavedSimulations());
  }, []);

  const handleDelete = (id: string) => {
    deleteSavedSimulation(id);
    setSaved(loadSavedSimulations());
  };

  const handleLoad = (s: SavedSimulation) => {
    setParams(s.params);
    setInitialParams(s.params);
    setHistory(s.history);
    setTurn(s.turn);
    setScreen("SIMULATION" as Screen);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
      <PageHeader
        title={t("history.title", "Histórico")}
        showHomeButton={true}
        actions={
          <Button variant="outline" onClick={() => setScreen("HOME" as Screen)}>
            {t("back", "Voltar")}
          </Button>
        }
      />

      {saved.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-on-surface-variant text-sm">
              {t("history.empty_title", "Nenhuma simulação salva")}
            </p>
            <p className="text-on-surface-variant text-xs mt-1">
              {t("history.empty_desc", "Execute uma simulação e salve para vê-la aqui.")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" role="list">
          {saved.map((s) => (
            <Card key={s.id} role="listitem">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-on-surface">{s.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(s.timestamp).toLocaleString("pt-BR")} | ID: {s.playbookId}
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">
                      {getPresetName(s.params)}
                    </span>
                    <span className="text-[10px] bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded">
                      {s.params?.initialStartups} Startups
                    </span>
                    <span className="text-[10px] bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded">
                      {s.params?.initialBigTechs} Big Techs
                    </span>
                    <span className="text-[10px] bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded">
                      {s.turn}/{s.params?.maxTurns || s.turn} turnos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => handleLoad(s)}>
                    {t("history.load", "Carregar")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(s.id)}
                    aria-label={`${t("history.remove", "Excluir")} ${s.name}`}
                  >
                    {t("history.remove", "Excluir")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
