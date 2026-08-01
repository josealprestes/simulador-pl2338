import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigationStore } from "@/stores/navigation.store";
import { Button } from "@/components/ui/button";
import { HomeIcon } from "@radix-ui/react-icons";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  showHomeButton?: boolean;
}

export function PageHeader({ title, subtitle, icon, actions, showHomeButton = true }: PageHeaderProps) {
  const { t } = useTranslation();
  const { setScreen } = useNavigationStore();

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-outline-variant/30 pb-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && <div className="text-primary">{icon}</div>}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface font-serif">
            {title}
          </h1>
          {subtitle && <div className="mt-1 text-sm text-on-surface-variant">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {showHomeButton && (
          <Button variant="outline" size="sm" onClick={() => setScreen("HOME")} title={t("nav.home", "Início")}>
            <HomeIcon className="w-4 h-4 mr-2" />
            {t("nav.home", "Início")}
          </Button>
        )}
        {actions}
      </div>
    </header>
  );
}
