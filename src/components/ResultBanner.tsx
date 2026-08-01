import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";

interface ResultBannerProps {
  variant?: "success" | "warning" | "danger";
  className?: string;
}

const variantConfig = {
  success: {
    icon: CheckCircledIcon,
    bgColor: "bg-success/10",
    textColor: "text-success",
    borderColor: "border-success",
    label: "Simulação concluída com sucesso!",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    borderColor: "border-warning",
    label: "Simulação concluída com alertas",
  },
  danger: {
    icon: CrossCircledIcon,
    bgColor: "bg-error/10",
    textColor: "text-error",
    borderColor: "border-error",
    label: "Simulação concluída com problemas",
  },
};

export function ResultBanner({ variant = "success", className = "" }: ResultBannerProps) {
  const { t } = useTranslation();
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Card className={`p-4 ${config.bgColor} ${config.borderColor} border-2 ${className}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.textColor}`} />
        <span className={`font-semibold ${config.textColor}`}>
          {t("simulation.completed", config.label)}
        </span>
      </div>
    </Card>
  );
}
