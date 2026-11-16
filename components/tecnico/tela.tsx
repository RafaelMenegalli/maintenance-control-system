import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IndicadorSincronizacao } from "./indicador-sincronizacao";

type Props = {
  titulo: string;
  /** Quando informado, mostra o botão "Voltar" (ícone + texto) levando para esta rota. */
  voltarHref?: string;
  children: ReactNode;
};

/**
 * Estrutura padrão de toda tela do técnico: cabeçalho fixo com nome da tela,
 * botão voltar (quando aplicável) e o indicador de sincronização, mais o conteúdo.
 * No celular, com botão Voltar, o título desce para uma segunda linha (nunca fica espremido).
 */
export function Tela({ titulo, voltarHref, children }: Props) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background print:hidden">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
          {voltarHref && (
            <Button asChild variant="outline" size="sm" className="order-1">
              <Link href={voltarHref}>
                <ArrowLeft aria-hidden />
                Voltar
              </Link>
            </Button>
          )}
          <h1
            className={cn(
              "min-w-0 text-xl leading-tight font-bold",
              voltarHref ? "order-3 basis-full md:order-2 md:basis-0 md:flex-1" : "order-1 flex-1",
            )}
          >
            {titulo}
          </h1>
          <div className={cn("ml-auto", voltarHref ? "order-2 md:order-3" : "order-2")}>
            <IndicadorSincronizacao />
          </div>
        </div>
      </header>
      {/* Espaço extra embaixo no celular para a barra inferior fixa não cobrir o conteúdo. */}
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-28 md:pb-8 print:p-0">{children}</main>
    </>
  );
}
