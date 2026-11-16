"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { assinarEstado, lerEstado } from "@/lib/tecnico/sync/estado";

function assinarRede(aoMudar: () => void) {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

/** `true` quando há internet (o navegador diz que sim e a última chamada ao servidor não falhou). */
export function useOnline(): boolean {
  const navegador = useSyncExternalStore(
    assinarRede,
    () => navigator.onLine,
    () => true,
  );
  const estado = useSyncExternalStore(assinarEstado, lerEstado, lerEstado);
  return navegador && !estado.semInternet;
}

/**
 * Envolve o conteúdo de telas que EXIGEM internet (cadastros, acessos, relatórios, edição de serviço…).
 * Sem internet, no lugar da tela aparece um aviso claro com caminhos que funcionam offline.
 */
export function ExigeInternet({ children }: { children: ReactNode }) {
  const online = useOnline();
  if (online) return <>{children}</>;
  return (
    <Alert className="border-2 border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground">
      <WifiOff aria-hidden />
      <AlertTitle className="text-lg">Esta tela precisa de internet.</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-base text-vence-em-breve-foreground">
        <span>Sem conexão você ainda pode ver os equipamentos e registrar serviços. Quando a internet voltar, esta tela abre sozinha.</span>
        <span className="grid gap-2 sm:grid-cols-2">
          <Button asChild size="lg" variant="outline" className="bg-background text-foreground">
            <Link href="/tecnico">Ir para o início</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-background text-foreground">
            <Link href="/tecnico/equipamentos">Ver equipamentos</Link>
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
