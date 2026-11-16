import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sem internet" };

/**
 * Página mostrada pelo service worker quando uma tela que precisa de internet é aberta sem conexão.
 * É pública e guardada no precache. Usa links comuns (<a>) de propósito: a navegação completa
 * passa pelo service worker, que abre a versão guardada das telas offline.
 */
export default function PaginaOffline() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-vence-em-breve text-vence-em-breve-foreground">
        <WifiOff className="size-10" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Esta tela precisa de internet.</h1>
        <p className="text-lg text-muted-foreground">
          Sem conexão você ainda pode ver os equipamentos e registrar serviços. Tudo é enviado sozinho quando a internet voltar.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <a
          href="/tecnico"
          className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-6 text-lg font-semibold text-primary-foreground"
        >
          Ir para o início
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- navegação completa de propósito */}
        <a
          href="/tecnico/equipamentos"
          className="inline-flex h-14 items-center justify-center rounded-lg border-2 px-6 text-lg font-semibold"
        >
          Ver equipamentos
        </a>
      </div>
    </main>
  );
}
