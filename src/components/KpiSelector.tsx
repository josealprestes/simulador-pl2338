import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CaretSortIcon,
  CheckIcon,
  RocketIcon,
  HomeIcon,
  BarChartIcon,
  BoxIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  MagicWandIcon,
  UpdateIcon,
  ThickArrowUpIcon,
  ThickArrowDownIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import type { ReactNode } from "react";

interface KeyMetric {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  priority?: number;
  type?: 'number' | 'percentage' | 'currency' | 'integer' | 'compact';
}

interface KpiSelectorProps {
  availableMetrics: KeyMetric[];
  selectedMetricIds: string[];
  onToggleMetric: (metricId: string) => void;
  maxSelection?: number;
  className?: string;
}

const iconMap: Record<string, ReactNode> = {
  RocketIcon: <RocketIcon className="h-3 w-3" aria-hidden="true" />,
  HomeIcon: <HomeIcon className="h-3 w-3" aria-hidden="true" />,
  CheckCircledIcon: <CheckIcon className="h-3 w-3" aria-hidden="true" />,
  BarChartIcon: <BarChartIcon className="h-3 w-3" aria-hidden="true" />,
  BoxIcon: <BoxIcon className="h-3 w-3" aria-hidden="true" />,
  HeartIcon: <HeartIcon className="h-3 w-3" aria-hidden="true" />,
  WarningIcon: <ExclamationTriangleIcon className="h-3 w-3" aria-hidden="true" />,
  PercentageIcon: <span aria-hidden="true">%</span>,
  CalendarIcon: <CalendarIcon className="h-3 w-3" aria-hidden="true" />,
  CurrencyIcon: <span aria-hidden="true">R$</span>,
  GridIcon: <BoxIcon className="h-3 w-3" aria-hidden="true" />,
  LightbulbIcon: <MagicWandIcon className="h-3 w-3" aria-hidden="true" />,
  MagicWandIcon: <MagicWandIcon className="h-3 w-3" aria-hidden="true" />,
  ReplaceIcon: <UpdateIcon className="h-3 w-3" aria-hidden="true" />,
  BuildingIcon: <HomeIcon className="h-3 w-3" aria-hidden="true" />,
  PackageIcon: <BoxIcon className="h-3 w-3" aria-hidden="true" />,
  TrendUpIcon: <ThickArrowUpIcon className="h-3 w-3" aria-hidden="true" />,
  TrendDownIcon: <ThickArrowDownIcon className="h-3 w-3" aria-hidden="true" />,
};

export function KpiSelector({
  availableMetrics,
  selectedMetricIds,
  onToggleMetric,
  maxSelection = 5,
  className = "",
}: KpiSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = selectedMetricIds.length;
  const canAddMore = selectedCount < maxSelection;

  // Ordenar por prioridade (descendente) e depois por label
  const sortedMetrics = [...availableMetrics].sort((a, b) => {
    const priorityDiff = (b.priority || 3) - (a.priority || 3);
    if (priorityDiff !== 0) return priorityDiff;
    return a.label.localeCompare(b.label);
  });

  const handleToggle = (metricId: string) => {
    onToggleMetric(metricId);
  };

  const isSelected = (metricId: string) => selectedMetricIds.includes(metricId);

  return (
    <div className={className}>
      <Card className="p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface">
            {t("dashboard.kpi_selector_title", "KPIs do Cenário")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs"
          >
            <CaretSortIcon className="h-3 w-3 mr-1" />
            {t("dashboard.customize", "Personalizar")}
          </Button>
        </div>
      </Card>

      {isOpen && (
        <Card className="p-3 space-y-2">
          <p className="text-xs text-on-surface-variant mb-2">
            {t("dashboard.select_metrics", "Selecione até {{max}} métricas", { max: maxSelection })}
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sortedMetrics.map((metric) => {
              const selected = isSelected(metric.id);
              const disabled = !selected && !canAddMore;
              const icon = metric.icon ? iconMap[metric.icon] : <span aria-hidden="true">•</span>;

              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => !disabled && handleToggle(metric.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${metric.label}${metric.description ? `. ${metric.description}` : ""}`}
                  className={`w-full flex items-center gap-2 p-2 rounded text-xs transition-colors ${
                    selected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-on-surface-variant hover:bg-muted"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="w-4 text-center">
                    {selected ? <CheckIcon className="h-3 w-3" aria-hidden="true" /> : icon}
                  </span>
                  <span className="flex-1 text-left">{metric.label}</span>
                  {metric.type && (
                    <span className="text-on-surface-variant/70 text-[10px] uppercase">
                      {metric.type}
                    </span>
                  )}
                  {metric.description && (
                    <span className="text-on-surface-variant/50">
                      <InfoCircledIcon className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2"
          >
            {t("dashboard.close", "Fechar")}
          </Button>
        </Card>
      )}
    </div>
  );
}
