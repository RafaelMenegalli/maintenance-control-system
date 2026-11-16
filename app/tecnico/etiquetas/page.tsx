import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoLista } from "@/components/estados";
import { Tela } from "@/components/tecnico/tela";
import { SeletorEtiquetas } from "./seletor-etiquetas";

export const metadata: Metadata = { title: "Etiquetas QR" };

export default function PaginaEtiquetas() {
  return (
    <Tela titulo="Etiquetas QR">
      <Suspense fallback={<CarregandoLista />}>
        <SeletorEtiquetas />
      </Suspense>
    </Tela>
  );
}
