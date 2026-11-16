import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Tela } from "@/components/tecnico/tela";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { listarAcessos } from "@/lib/auth/acessos";
import { exigirAdmin } from "@/lib/auth/permissoes";
import { GerenciarAcessos } from "./gerenciar-acessos";

export const metadata: Metadata = { title: "Acessos" };

export default async function PaginaAcessos() {
  const sessao = await exigirAdmin();
  const [acessos, listaClientes] = await Promise.all([
    listarAcessos(),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome)),
  ]);

  return (
    <Tela exigeInternet titulo="Acessos">
      <GerenciarAcessos acessos={acessos} clientes={listaClientes} meuId={sessao.user.id} />
    </Tela>
  );
}
