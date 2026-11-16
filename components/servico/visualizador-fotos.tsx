"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { FotoResumo } from "@/lib/tecnico/data";

type Props = {
  fotos: FotoResumo[];
  /** Índice da foto aberta, ou null se fechado. */
  indiceInicial: number | null;
  aoFechar: () => void;
};

/** Foto em tela cheia, com navegação entre as fotos do serviço e indicação "Antes"/"Depois". */
export function VisualizadorFotos({ fotos, indiceInicial, aoFechar }: Props) {
  const aberto = indiceInicial !== null;
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      {/* Remonta a cada abertura para começar na foto tocada. */}
      {aberto && <Conteudo key={indiceInicial} fotos={fotos} inicial={indiceInicial} aoFechar={aoFechar} />}
    </Dialog>
  );
}

function Conteudo({ fotos, inicial, aoFechar }: { fotos: FotoResumo[]; inicial: number; aoFechar: () => void }) {
  const [i, setI] = useState(inicial);
  const foto = fotos[i];
  if (!foto) return null;

  return (
    <DialogContent showCloseButton={false} className="flex h-svh max-h-svh w-screen max-w-none flex-col gap-3 rounded-none p-3 sm:h-[90svh] sm:max-w-4xl sm:rounded-xl">
      <DialogTitle className="sr-only">Foto {foto.momento === "antes" ? "de antes" : "de depois"}</DialogTitle>
      <DialogDescription className="sr-only">
        Foto {i + 1} de {fotos.length}
      </DialogDescription>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="px-4 text-base">{foto.momento === "antes" ? "Antes" : "Depois"}</Badge>
          <span className="font-medium">
            {i + 1} de {fotos.length}
          </span>
        </div>
        <Button type="button" variant="outline" onClick={aoFechar}>
          <X aria-hidden />
          Fechar
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto protegida servida pela API */}
        <img
          src={foto.url ?? `/api/fotos/${foto.id}`}
          alt={`Foto ${foto.momento === "antes" ? "de antes" : "de depois"} do serviço`}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {fotos.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" size="lg" variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ChevronLeft aria-hidden />
            Anterior
          </Button>
          <Button type="button" size="lg" variant="outline" disabled={i === fotos.length - 1} onClick={() => setI(i + 1)}>
            Próxima
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}
    </DialogContent>
  );
}
