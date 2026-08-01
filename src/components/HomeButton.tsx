import { HomeIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/stores/navigation.store";
import type { Screen } from "@/stores/navigation.store";
import { useTranslation } from "react-i18next";

export function HomeButton() {
  const { setScreen } = useNavigationStore();
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-surface/80 backdrop-blur-sm border-outline-variant hover:bg-surface-container transition-all shadow-sm flex items-center gap-2"
      onClick={() => setScreen("HOME" as Screen)}
    >
      <HomeIcon className="w-4 h-4 text-primary" />
      <span className="text-xs font-semibold">{t("nav.home", "Início")}</span>
    </Button>
  );
}
