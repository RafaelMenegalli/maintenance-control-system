import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { EditorTipo } from "../editor-tipo";

export const metadata: Metadata = { title: "Editar tipo" };

export default async function PaginaEditarTipo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Tela exigeInternet titulo="Editar tipo" voltarHref="/tecnico/tipos">
      <EditorTipo id={id} />
    </Tela>
  );
}
