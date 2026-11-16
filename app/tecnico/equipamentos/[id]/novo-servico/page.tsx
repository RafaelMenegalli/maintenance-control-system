import type { Metadata } from "next";
import { FormularioServico } from "@/components/servico/formulario-servico";
import { Tela } from "@/components/tecnico/tela";

export const metadata: Metadata = { title: "Registrar serviço" };

export default async function PaginaNovoServico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Tela titulo="Registrar serviço" voltarHref={`/tecnico/equipamentos/${id}`}>
      <FormularioServico equipamentoId={id} />
    </Tela>
  );
}
