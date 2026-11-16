import type { Metadata } from "next";
import { Settings2, Wrench } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Tipos de equipamento" };

export default function PaginaTipos() {
  return (
    <Tela titulo="Tipos de equipamento">
      <TelaVazia
        icone={Settings2}
        titulo="Tipos de equipamento"
        descricao="Aqui você vai editar os tipos (ar-condicionado, caixa d'água, porta corta-fogo, luz de emergência) e criar novos, definindo os campos, o checklist e a periodicidade. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver equipamentos", href: "/tecnico/equipamentos", icone: Wrench }}
      />
    </Tela>
  );
}
