import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { FormularioEquipamento } from "../../formulario-equipamento";

export const metadata: Metadata = { title: "Editar equipamento" };

export default async function PaginaEditarEquipamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Tela titulo="Editar equipamento" voltarHref={`/tecnico/equipamentos/${id}`}>
      <FormularioEquipamento id={id} />
    </Tela>
  );
}
