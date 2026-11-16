import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { ListaTipos } from "./lista-tipos";

export const metadata: Metadata = { title: "Tipos de equipamento" };

export default function PaginaTipos() {
  return (
    <Tela exigeInternet titulo="Tipos de equipamento">
      <ListaTipos />
    </Tela>
  );
}
