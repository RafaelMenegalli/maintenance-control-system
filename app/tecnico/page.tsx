import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { exigirAdmin } from "@/lib/auth/permissoes";
import { Painel } from "./painel";

export const metadata: Metadata = { title: "Início" };

export default async function PaginaInicio() {
  const sessao = await exigirAdmin();
  const primeiroNome = sessao.user.name.trim().split(/\s+/)[0] ?? "";
  return (
    <Tela titulo="Início">
      <Painel primeiroNome={primeiroNome} />
    </Tela>
  );
}
