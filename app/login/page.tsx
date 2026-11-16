import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessao, rotaInicial } from "@/lib/auth/permissoes";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  // Quem já está logado não precisa ver o login de novo.
  const sessao = await getSessao();
  if (sessao) redirect(rotaInicial(sessao.user.papel));

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wrench className="size-8" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">Controle de Manutenções</h1>
          <p className="text-muted-foreground">Entre com o seu e-mail e a sua senha.</p>
        </div>
        <FormularioLogin />
      </div>
    </main>
  );
}
