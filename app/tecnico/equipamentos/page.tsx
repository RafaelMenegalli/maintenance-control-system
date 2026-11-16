import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoLista } from "@/components/estados";
import { Tela } from "@/components/tecnico/tela";
import { ListaEquipamentos } from "./lista-equipamentos";

export const metadata: Metadata = { title: "Equipamentos" };

export default function PaginaEquipamentos() {
  return (
    <Tela titulo="Equipamentos">
      {/* Suspense: a lista lê os filtros da URL (useSearchParams). */}
      <Suspense fallback={<CarregandoLista />}>
        <ListaEquipamentos />
      </Suspense>
    </Tela>
  );
}
