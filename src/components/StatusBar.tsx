import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  turn: number;
  totalTurns?: number;
  isRunning?: boolean;
  computationalTime?: number;
  turnMeaning?: string;
  className?: string;
}

export function StatusBar({
  turn,
  totalTurns,
  isRunning,
  computationalTime,
  turnMeaning,
  className,
}: StatusBarProps) {
  const { t } = useTranslation();
  const progress = totalTurns ? (turn / totalTurns) * 100 : 0;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${m}:${s}`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-on-surface-variant">
          {t("simulation.simulated_time", "Tempo Simulado")}
        </span>
        <span className="font-mono font-bold text-on-surface">
          {turn}
          {totalTurns && <span className="text-on-surface-variant">/{totalTurns}</span>}
        </span>
        {computationalTime !== undefined && computationalTime > 0 && (
          <span className="text-xs text-on-surface-variant font-mono ml-2 border-l border-outline-variant pl-2">
            {formatDuration(computationalTime)}
          </span>
        )}
        {turnMeaning && (
          <span className="text-xs text-on-surface-variant">{turnMeaning}</span>
        )}
      </div>

      <div className="flex-1 h-1.5 bg-outline-variant rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      {isRunning && (
        <span className="text-xs text-success animate-pulse">
          {t("simulation.running", "Executando...")}
        </span>
      )}
    </div>
  );
}
