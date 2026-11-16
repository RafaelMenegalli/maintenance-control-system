"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";

function assinar(aoMudar: () => void) {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

/**
 * Espaço reservado do indicador de sincronização (sempre visível no cabeçalho).
 * Por enquanto só mostra se há internet. Na etapa 5 passa a mostrar também
 * "N serviços aguardando envio" e o andamento do envio.
 */
export function IndicadorSincronizacao() {
  const online = useSyncExternalStore(
    assinar,
    () => navigator.onLine,
    () => true,
  );

  return (
    <div data-slot="indicador-sincronizacao" className="shrink-0">
      {online ? (
        <Badge variant="outline" className="border-2 border-em-dia-border bg-em-dia text-em-dia-foreground">
          <Wifi className="size-4" aria-hidden />
          Conectado
        </Badge>
      ) : (
        <Badge variant="outline" className="border-2 border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground">
          <WifiOff className="size-4" aria-hidden />
          Sem internet
        </Badge>
      )}
    </div>
  );
}
