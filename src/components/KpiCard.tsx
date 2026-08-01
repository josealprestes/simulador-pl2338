import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
  delta?: number;
  showDelta?: boolean;
  description?: string;
  tooltip?: string;
  className?: string;
}

const statusColors = {
  success: "text-success font-bold",
  warning: "text-warning font-bold",
  danger: "text-error font-bold",
  info: "text-primary",
};

const statusBadgeColors = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-error/10 text-error",
  info: "bg-primary/10 text-primary",
};

const statusLabels: Record<string, string> = {
  success: "Bom",
  warning: "Alerta",
  danger: "Crítico",
  info: "Normal",
};

export function KpiCard({
  label,
  value,
  unit,
  status = "info",
  icon,
  delta,
  showDelta,
  description,
  tooltip,
  className,
}: KpiCardProps) {
  const showBadge = status !== "info";
  const accessibleDescription = description ?? tooltip;
  const showDeltaIndicator = showDelta !== false && delta !== undefined && delta !== 0;
  const isPositive = delta !== undefined && delta > 0;
  
  return (
    <Card
      className={cn("p-4 transition-all duration-300 hover:shadow-md", className)}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}${accessibleDescription ? `. ${accessibleDescription}` : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2 min-w-0">
            {icon && (
              <span className="text-on-surface-variant/70 shrink-0">{icon}</span>
            )}
            <span className="text-sm font-light tracking-wide text-on-surface-variant uppercase truncate">{label}</span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
            <div className={cn("text-2xl font-extrabold leading-none truncate max-w-full", statusColors[status])} title={String(value)}>
              {value}
            </div>
            {unit && <span className="text-sm font-medium text-on-surface-variant/70 shrink-0">{unit}</span>}
            {showDeltaIndicator && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-bold shrink-0",
                isPositive ? "text-success" : "text-error"
              )}>
                {isPositive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                {Math.abs(delta!)}
              </span>
            )}
          </div>
        </div>
        {showBadge && (
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/20 shrink-0", statusBadgeColors[status])}>
            {statusLabels[status]}
          </span>
        )}
      </div>
      {accessibleDescription && (
        <div className="text-xs text-on-surface-variant/70 mt-2 leading-relaxed">
          {accessibleDescription}
        </div>
      )}
    </Card>
  );
}
