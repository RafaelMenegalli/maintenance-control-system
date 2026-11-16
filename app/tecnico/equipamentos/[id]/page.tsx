import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { DetalheEquipamento } from "./detalhe-equipamento";

export const metadata: Metadata = { title: "Equipamento" };

export default async function PaginaEquipamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Tela titulo="Equipamento" voltarHref="/tecnico/equipamentos">
      <DetalheEquipamento id={id} />
    </Tela>
  );
}
