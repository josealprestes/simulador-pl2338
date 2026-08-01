import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { useNavigationStore, type Screen } from "@/stores/navigation.store";
import { GearIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function MobileNavMenu() {
  const { t } = useTranslation();
  const { setScreen } = useNavigationStore();
  const [open, setOpen] = useState(false);

  const items: { screen: Screen; label: string; icon?: React.ReactNode }[] = [
    { screen: "COMPARISON", label: t("nav.compare", "Comparar") },
    { screen: "HISTORY", label: t("nav.history", "Histórico") },
    { screen: "AI_CONFIG", label: t("nav.ai_config", "Configurar IA"), icon: <GearIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm" aria-label={t("nav.menu", "Menu de navegação")}>
          <HamburgerMenuIcon className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-50 min-w-[180px] bg-background border border-outline-variant rounded-none shadow-lg p-1">
          {items.map((item) => (
            <DropdownMenu.Item key={item.screen}
              className="flex items-center gap-2 px-3 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-variant/30 outline-none rounded-none"
              onSelect={() => { setScreen(item.screen); setOpen(false); }}>
              {item.icon}{item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}