"use client";

import { Serwist } from "@serwist/window";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Registra o service worker (só em produção, e só dentro da área do técnico — depois do login)
 * e mostra o aviso "Nova versão disponível" quando existe um SW novo esperando.
 * O SW novo só assume quando a pessoa toca em "Atualizar".
 */
export function RegistrarServiceWorker() {
  const [novaVersao, setNovaVersao] = useState(false);
  const serwist = useRef<Serwist | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = new Serwist("/serwist/sw.js", { scope: "/", type: "classic" });
    serwist.current = sw;
    sw.addEventListener("waiting", () => setNovaVersao(true));
    sw.register().catch(() => {
      /* sem service worker o app continua funcionando online */
    });
  }, []);

  if (!novaVersao) return null;

  function atualizar() {
    const sw = serwist.current;
    if (!sw) return;
    // Quando o SW novo assumir, recarrega para usar os arquivos novos.
    sw.addEventListener("controlling", () => window.location.reload());
    sw.messageSkipWaiting();
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b-2 border-primary bg-background p-3 shadow-md print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <p className="min-w-[12rem] flex-1 text-lg font-semibold">Nova versão disponível</p>
        <Button size="lg" onClick={atualizar}>
          <RefreshCw aria-hidden />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
