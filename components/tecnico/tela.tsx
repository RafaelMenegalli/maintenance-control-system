import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
 */
export function Tela({ titulo, voltarHref, children }: Props) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center gap-3 px-4 py-2">
          {voltarHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={voltarHref}>
                <ArrowLeft aria-hidden />
                Voltar
              </Link>
            </Button>
          )}
          <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{titulo}</h1>
          <IndicadorSincronizacao />
        </div>
      </header>
      {/* Espaço extra embaixo no celular para a barra inferior fixa não cobrir o conteúdo. */}
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-28 md:pb-8">{children}</main>
    </>
  );
}
