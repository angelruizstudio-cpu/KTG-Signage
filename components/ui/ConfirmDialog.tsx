"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, message, onCancel, onConfirm }: ConfirmDialogProps) {
  const { t } = useLanguage();
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="mb-5 text-sm text-slate-300">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t("common.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
