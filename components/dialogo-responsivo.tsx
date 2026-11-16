"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
};

/** Janela de formulário: Dialog no computador e Drawer (gaveta de baixo) no celular. */
export function DialogoResponsivo({ aberto, onAbertoChange, titulo, descricao, children }: Props) {
  const mobile = useIsMobile();

  if (mobile) {
    return (
      <Drawer open={aberto} onOpenChange={onAbertoChange}>
        <DrawerContent className="max-h-[92svh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl">{titulo}</DrawerTitle>
            <DrawerDescription className={descricao ? undefined : "sr-only"}>
              {descricao ?? titulo}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{titulo}</DialogTitle>
          <DialogDescription className={descricao ? undefined : "sr-only"}>
            {descricao ?? titulo}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
