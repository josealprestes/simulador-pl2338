import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function ConfirmDialog({
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  children,
  disabled = false,
  variant = "outline",
  size = "sm",
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? t("dialog.confirm_title", "Confirmar ação")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t("dialog.confirm_description", "Tem certeza que deseja executar esta ação?")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {cancelText ?? t("dialog.cancel", "Cancelar")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {confirmText ?? t("dialog.confirm", "Confirmar")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
