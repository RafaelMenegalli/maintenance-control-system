import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoLista } from "@/components/estados";
import { escopoCliente } from "@/lib/auth/permissoes";
import { listarEquipamentosDoCliente, listarOpcoesDoCliente } from "@/lib/portal/queries";
import { ListaPortal } from "./lista-portal";

export const metadata: Metadata = { title: "Equipamentos" };

export default async function PaginaPortalEquipamentos() {
  // Sempre filtrado pelo cliente da sessão.
  const escopo = await escopoCliente();
  const [equipamentos, opcoes] = await Promise.all([
    listarEquipamentosDoCliente(escopo),
    listarOpcoesDoCliente(escopo),
  ]);
  // Só mostra os tipos que a empresa realmente tem em equipamentos ativos.
  const tiposEmUso = new Set(equipamentos.map((e) => e.tipoId));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Equipamentos</h1>
      {/* Suspense: a lista lê os filtros da URL (useSearchParams). */}
      <Suspense fallback={<CarregandoLista />}>
        <ListaPortal equipamentos={equipamentos} tipos={opcoes.tipos.filter((t) => tiposEmUso.has(t.id))} />
      </Suspense>
    </div>
  );
}
