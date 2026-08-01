import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { APP_VERSION } from "@/config/version";
import { useTranslation } from "react-i18next";

interface ChangelogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogModal({ open, onOpenChange }: ChangelogModalProps) {
  const { t } = useTranslation();

  const versions = [
    {
      version: APP_VERSION,
      date: "2026-07-30",
      changes: [
        { type: "Added", items: [
          "Lançamento público inicial — Simulador ABM do PL 2338/2023",
          "23 playbooks regulatórios em 5 categorias",
          "Motor ABM com 20 módulos especializados",
          "7 telas interativas (home, setup, simulação, resultado, histórico, comparação, configuração de IA)",
          "Exportação de relatórios em PDF e DOCX",
          "Comparação lado a lado de até 3 cenários",
          "183 testes unitários",
          "Validação de robustez com 23.000 simulações"
        ]}
      ]
    }
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 border-outline-variant bg-surface text-on-surface">
        <AlertDialogHeader className="p-6 border-b border-outline-variant">
          <AlertDialogTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">{t("changelog.title", "Novidades")}</span>
            <span className="text-xs font-mono bg-surface-container text-on-surface-variant px-2 py-1 rounded-sm border border-outline-variant">
              v{APP_VERSION}
            </span>
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {versions.map((v) => (
            <section key={v.version} className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-outline-variant pb-1">
                <h3 className="text-lg font-bold text-on-surface">{v.version}</h3>
                <time className="text-xs text-on-surface-variant">{v.date}</time>
              </div>
              <div className="space-y-4">
                {v.changes.map((group) => (
                  <div key={group.type} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">{group.type}</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                      {group.items.map((item, i) => (
                        <li key={i} className="text-on-surface/90">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <AlertDialogFooter className="p-4 border-t border-outline-variant bg-surface-container-low">
          <AlertDialogAction onClick={() => onOpenChange(false)} className="w-full sm:w-auto bg-primary hover:bg-primary-hover">
            {t("common.close", "Entendido")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
