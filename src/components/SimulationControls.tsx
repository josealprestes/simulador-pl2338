import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  PlayIcon,
  TrackNextIcon,
  ActivityLogIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { useSimulationStore } from "@/stores/simulation.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Screen } from "@/stores/navigation.store";

interface SimulationControlsProps {
  className?: string;
}

export function SimulationControls({ className = "" }: SimulationControlsProps) {
  const { t } = useTranslation();
  const {
    turn,
    params,
    isAutoPlaying,
    autoPlaySpeed,
    isJumping,
    setIsAutoPlaying,
    setAutoPlaySpeed,
    runTurn,
    jumpToEnd,
    setWasSkipped,
  } = useSimulationStore();
  const { setScreen } = useNavigationStore();

  const maxTurns = params?.maxTurns ?? 50;
  const remainingTurns = maxTurns - turn;

  const handleJumpToEnd = async () => {
    if (jumpToEnd) {
      setWasSkipped(true);
      await jumpToEnd();
      setScreen("RESULT" as Screen);
    }
  };

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      <Button size="sm" onClick={() => runTurn()} disabled={turn >= maxTurns}>
        <PlayIcon width={16} height={16} /> +1
      </Button>
      <Button
        size="sm"
        variant={isAutoPlaying && autoPlaySpeed === 500 ? "default" : "outline"}
        onClick={() => {
          setAutoPlaySpeed(500);
          setIsAutoPlaying(!isAutoPlaying);
        }}
      >
        <ActivityLogIcon width={16} height={16} />
        {t("simulation.auto_play", "Auto")}
      </Button>
      <Button
        size="sm"
        variant={isAutoPlaying && autoPlaySpeed === 100 ? "default" : "outline"}
        onClick={() => {
          setAutoPlaySpeed(100);
          setIsAutoPlaying(true);
        }}
      >
        <TrackNextIcon width={16} height={16} />
        {t("simulation.fast", "Rápido")}
      </Button>
      {remainingTurns > 1 && (
        <ConfirmDialog
          title={t("simulation.jump_to_end", "Pular para o final")}
          description={t("simulation.jump_confirm", "Tem certeza que deseja pular para o final da simulação?")}
          onConfirm={handleJumpToEnd}
          disabled={turn >= maxTurns || isJumping}
          variant="outline"
          size="sm"
        >
          <DoubleArrowRightIcon width={16} height={16} />
          {t("simulation.jump_to_end", "Pular para o final")}
        </ConfirmDialog>
      )}
    </div>
  );
}
