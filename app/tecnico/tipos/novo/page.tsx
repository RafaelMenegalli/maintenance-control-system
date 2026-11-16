import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { EditorTipo } from "../editor-tipo";

export const metadata: Metadata = { title: "Novo tipo" };

export default function PaginaNovoTipo() {
  return (
    <Tela exigeInternet titulo="Novo tipo" voltarHref="/tecnico/tipos">
      <EditorTipo />
    </Tela>
  );
}
