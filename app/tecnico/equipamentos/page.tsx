import type { Metadata } from "next";
import { Plus, Wrench } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Equipamentos" };

export default function PaginaEquipamentos() {
  return (
    <Tela titulo="Equipamentos">
      <TelaVazia
        icone={Wrench}
        titulo="Lista de equipamentos"
        descricao="Aqui você vai procurar um equipamento pelo nome, local ou tipo e abrir o histórico dele. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Cadastrar equipamento", href: "/tecnico/equipamentos/novo", icone: Plus }}
      />
    </Tela>
  );
}
