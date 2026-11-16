"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de lista enquanto carrega. */
export function CarregandoLista({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

/** Erro ao carregar, com botão para tentar de novo. */
export function ErroAoCarregar({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden />
      <AlertTitle>Não foi possível carregar</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{mensagem}</span>
        <Button variant="outline" onClick={aoTentar}>
          <RefreshCw aria-hidden />
          Tentar de novo
        </Button>
      </AlertDescription>
    </Alert>
  );
}
