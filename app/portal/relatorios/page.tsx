import type { Metadata } from "next";
import { FormularioRelatorio } from "@/components/relatorios/formulario-relatorio";
import { escopoCliente } from "@/lib/auth/permissoes";
import { listarEquipamentosDoCliente, listarOpcoesDoCliente } from "@/lib/portal/queries";

export const metadata: Metadata = { title: "Relatórios" };

export default async function PaginaPortalRelatorios() {
  // Sempre filtrado pelo cliente da sessão: só aparecem locais, tipos e equipamentos da própria empresa.
  const escopo = await escopoCliente();
  const [opcoes, equipamentos] = await Promise.all([
    listarOpcoesDoCliente(escopo),
    listarEquipamentosDoCliente(escopo),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Relatórios</h1>
      <p className="text-lg text-muted-foreground">
        Escolha o período e baixe o relatório dos serviços realizados na sua empresa, em PDF.
      </p>
      <FormularioRelatorio
        opcoes={{
          clienteFixoId: escopo.clienteId,
          locais: opcoes.locais,
          tipos: opcoes.tipos,
          equipamentos: equipamentos.map((e) => ({
            id: e.id,
            nome: e.nome,
            localId: e.localId,
            tipoId: e.tipoId,
            clienteId: e.clienteId,
          })),
        }}
      />
    </div>
  );
}
