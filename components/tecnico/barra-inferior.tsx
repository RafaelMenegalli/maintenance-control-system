"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BotaoSair } from "@/components/botao-sair";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ITENS_MAIS, ITENS_PRINCIPAIS, rotaAtiva } from "./navegacao";

const classesItem =
  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-semibold leading-tight tracking-tight";

/**
 * Barra inferior fixa do celular: 4 itens grandes (ícone + texto).
 * "Mais" abre uma gaveta com o restante do menu e o botão Sair.
 */
export function BarraInferior() {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const maisAtivo = ITENS_MAIS.some((i) => rotaAtiva(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-background pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <ul className="grid grid-cols-4">
          {ITENS_PRINCIPAIS.map(({ href, rotulo, icone: Icone }) => {
            const ativo = rotaAtiva(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    classesItem,
                    "w-full",
                    ativo ? "bg-accent text-primary" : "text-foreground active:bg-muted",
                  )}
                >
                  <Icone className="size-7" aria-hidden />
                  {rotulo}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMaisAberto(true)}
              aria-haspopup="dialog"
              aria-expanded={maisAberto}
              className={cn(
                classesItem,
                "w-full",
                maisAtivo ? "bg-accent text-primary" : "text-foreground active:bg-muted",
              )}
            >
              <Menu className="size-7" aria-hidden />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
        <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-xl">Mais opções</SheetTitle>
            <SheetDescription>Cadastros, relatórios e acessos.</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col gap-2 px-4">
            {ITENS_MAIS.map(({ href, rotulo, icone: Icone }) => {
              const ativo = rotaAtiva(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMaisAberto(false)}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 text-lg font-medium",
                      ativo ? "border-primary bg-accent" : "border-border active:bg-muted",
                    )}
                  >
                    <Icone className="size-6" aria-hidden />
                    {rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="px-4 pb-6">
            <BotaoSair size="lg" className="w-full" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
