import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { ListaEquipamentos } from "./lista-equipamentos";

export const metadata: Metadata = { title: "Equipamentos" };

export default function PaginaEquipamentos() {
  return (
    <Tela titulo="Equipamentos">
      <ListaEquipamentos />
    </Tela>
  );
}
