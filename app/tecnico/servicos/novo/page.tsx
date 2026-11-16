import type { Metadata } from "next";
import { EscolherEquipamento } from "@/components/servico/escolher-equipamento";
import { Tela } from "@/components/tecnico/tela";

export const metadata: Metadata = { title: "Registrar serviço" };

export default function PaginaEscolherEquipamento() {
  return (
    <Tela titulo="Registrar serviço" voltarHref="/tecnico">
      <EscolherEquipamento />
    </Tela>
  );
}
