import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { FormularioEquipamento } from "../formulario-equipamento";

export const metadata: Metadata = { title: "Novo equipamento" };

export default function PaginaNovoEquipamento() {
  return (
    <Tela exigeInternet titulo="Novo equipamento" voltarHref="/tecnico/equipamentos">
      <FormularioEquipamento />
    </Tela>
  );
}
