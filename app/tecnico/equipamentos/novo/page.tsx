import type { Metadata } from "next";
import { List, Plus } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Novo equipamento" };

export default function PaginaNovoEquipamento() {
  return (
    <Tela titulo="Novo equipamento" voltarHref="/tecnico/equipamentos">
      <TelaVazia
        icone={Plus}
        titulo="Cadastro de equipamento"
        descricao="Aqui você vai cadastrar um equipamento: escolher o local e o tipo e preencher os dados dele. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver equipamentos", href: "/tecnico/equipamentos", icone: List }}
      />
    </Tela>
  );
}
