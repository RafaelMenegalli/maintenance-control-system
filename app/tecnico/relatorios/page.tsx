import type { Metadata } from "next";
import { FileText, Wrench } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Relatórios" };

export default function PaginaRelatorios() {
  return (
    <Tela titulo="Relatórios">
      <TelaVazia
        icone={FileText}
        titulo="Relatórios em PDF"
        descricao="Aqui você vai gerar o relatório dos serviços realizados, filtrando por período, local, tipo de equipamento ou equipamento, para entregar à empresa. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver equipamentos", href: "/tecnico/equipamentos", icone: Wrench }}
      />
    </Tela>
  );
}
