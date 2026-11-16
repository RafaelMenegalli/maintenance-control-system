import { eq } from "drizzle-orm";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { BotaoSair } from "@/components/botao-sair";
import { NavegacaoPortal } from "@/components/portal/navegacao-portal";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { escopoCliente, getSessaoOuRedirect } from "@/lib/auth/permissoes";

/**
 * Portal da empresa: somente leitura e somente online.
 * Todo dado daqui passa por `escopoCliente()` (filtro de cliente_id da sessão).
 */
export default async function LayoutPortal({ children }: { children: React.ReactNode }) {
  const sessao = await getSessaoOuRedirect();
  const escopo = await escopoCliente();

  const [cliente] = await db
    .select({ nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, escopo.clienteId))
    .limit(1);

  const admin = sessao.user.papel === "admin";

  return (
    <div className="flex min-h-svh flex-col">
      {admin && (
        <div className="border-b-2 border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-2">
            <p className="min-w-[14rem] flex-1 font-medium">Você está vendo como a empresa enxerga.</p>
            <Button asChild variant="outline" size="sm" className="bg-background">
              <Link href="/tecnico">
                <ArrowLeft aria-hidden />
                Voltar ao painel do técnico
              </Link>
            </Button>
          </div>
        </div>
      )}

      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center gap-3 px-4 py-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-lg leading-tight font-bold">{cliente?.nome ?? "Sua empresa"}</p>
            <p className="truncate text-sm text-muted-foreground">Manutenções</p>
          </div>
          <BotaoSair size="sm" />
        </div>
      </header>

      <NavegacaoPortal />

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-8">{children}</main>
    </div>
  );
}
