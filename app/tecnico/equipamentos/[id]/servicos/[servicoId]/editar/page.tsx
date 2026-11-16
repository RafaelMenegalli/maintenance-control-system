import type { Metadata } from "next";
import { FormularioServico } from "@/components/servico/formulario-servico";
import { Tela } from "@/components/tecnico/tela";

export const metadata: Metadata = { title: "Editar serviço" };

export default async function PaginaEditarServico({
  params,
}: {
  params: Promise<{ id: string; servicoId: string }>;
}) {
  const { id, servicoId } = await params;
  return (
    <Tela titulo="Editar serviço" voltarHref={`/tecnico/equipamentos/${id}`}>
      <FormularioServico equipamentoId={id} servicoId={servicoId} />
    </Tela>
  );
}
