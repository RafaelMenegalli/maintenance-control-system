import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { FormularioRelatorio, type OpcoesRelatorio } from "@/components/relatorios/formulario-relatorio";
import { exigirAdmin } from "@/lib/auth/permissoes";
import { listarClientesAdmin, listarEquipamentosAdmin, listarTiposAdmin } from "@/lib/tecnico/queries";

export const metadata: Metadata = { title: "Relatórios" };

export default async function PaginaRelatorios() {
  await exigirAdmin();
  const [clientes, tipos, equipamentos] = await Promise.all([
    listarClientesAdmin(),
    listarTiposAdmin(),
    listarEquipamentosAdmin(),
  ]);

  const opcoes: OpcoesRelatorio = {
    // Com 1 cliente só, a tela não pergunta a empresa (o servidor usa o único cliente).
    clientes: clientes.length > 1 ? clientes.map((c) => ({ id: c.id, nome: c.nome })) : undefined,
    locais: clientes.flatMap((c) => c.locais.map((l) => ({ id: l.id, nome: l.nome, clienteId: c.id }))),
    tipos: tipos.map((t) => ({ id: t.id, nome: t.nome })),
    equipamentos: equipamentos
      .filter((e) => !e.arquivado)
      .map((e) => ({ id: e.id, nome: e.nome, localId: e.localId, tipoId: e.tipoId, clienteId: e.clienteId })),
  };

  return (
    <Tela exigeInternet titulo="Relatórios">
      <div className="flex flex-col gap-4">
        <p className="text-lg text-muted-foreground">
          Escolha o período e gere o relatório em PDF para entregar à empresa.
        </p>
        <FormularioRelatorio opcoes={opcoes} />
      </div>
    </Tela>
  );
}
