"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  titulo: string;
  /** Explique a consequência da ação. */
  descricao: ReactNode;
  rotuloConfirmar: string;
  /** Quando omitido, o diálogo só informa (sem botão de confirmar). */
  onConfirmar?: () => Promise<void> | void;
  destrutivo?: boolean;
  rotuloCancelar?: string;
};

/** Confirmação de ação (AlertDialog). Fecha sozinho se `onConfirmar` terminar sem erro. */
export function DialogoConfirmacao({
  aberto,
  onAbertoChange,
  titulo,
  descricao,
  rotuloConfirmar,
  onConfirmar,
  destrutivo = false,
  rotuloCancelar = "Cancelar",
}: Props) {
  const [processando, setProcessando] = useState(false);

  async function confirmar() {
    if (!onConfirmar) return;
    setProcessando(true);
    try {
      await onConfirmar();
      onAbertoChange(false);
    } catch {
      // Quem chama mostra o erro (toast); o diálogo continua aberto.
    } finally {
      setProcessando(false);
    }
  }

  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !processando && onAbertoChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{titulo}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processando}>{onConfirmar ? rotuloCancelar : "Entendi"}</AlertDialogCancel>
          {onConfirmar && (
            <Button
              variant={destrutivo ? "destructive" : "default"}
              onClick={confirmar}
              disabled={processando}
              className={destrutivo ? "border-destructive" : undefined}
            >
              {processando && <Spinner />}
              {rotuloConfirmar}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
