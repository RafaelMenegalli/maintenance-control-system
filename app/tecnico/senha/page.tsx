import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { exigirAdmin } from "@/lib/auth/permissoes";
import { FormularioSenha } from "./formulario-senha";

export const metadata: Metadata = { title: "Alterar minha senha" };

export default async function PaginaAlterarSenha() {
  await exigirAdmin();
  return (
    <Tela exigeInternet titulo="Alterar minha senha">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <p className="text-lg text-muted-foreground">Digite a senha de agora e escolha uma nova, com pelo menos 8 caracteres.</p>
        <FormularioSenha />
      </div>
    </Tela>
  );
}
