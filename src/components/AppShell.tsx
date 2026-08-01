import { useState } from "react";
import { APP_VERSION } from "@/config/version";
import { ChangelogModal } from "./ChangelogModal";
import { useTranslation } from "react-i18next";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation();
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1">
        {children}
      </div>
      
      <footer className="sticky bottom-0 z-40 bg-surface/85 backdrop-blur-md border-t w-full py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-on-surface-variant/70 font-medium uppercase tracking-tighter">
              {t("app.name", "Simulador PL 2338")}
            </span>
            <span className="text-[11px] text-on-surface-variant">{t("footer", "© 2026 José Augusto de Lima Prestes — MIT License")}</span>
          </div>
          
          <button
            onClick={() => setChangelogOpen(true)}
            className="flex items-center gap-2 px-2 py-1 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors group"
          >
            <span className="text-[10px] font-mono font-bold text-primary group-hover:text-primary-hover transition-colors">
              v{APP_VERSION}
            </span>
            <span className="text-[10px] text-on-surface-variant font-semibold tracking-tight">
              {t("changelog.badge", "Novidades")}
            </span>
          </button>
        </div>
      </footer>

      <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
}
