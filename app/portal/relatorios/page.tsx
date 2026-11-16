import type { Metadata } from "next";
import { FileText, Wrench } from "lucide-react";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Relatórios" };

export default function PaginaPortalRelatorios() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Relatórios</h1>
      <TelaVazia
        icone={FileText}
        titulo="Relatórios em PDF"
        descricao="Aqui você vai baixar o relatório dos serviços realizados na sua empresa, escolhendo o período. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver equipamentos", href: "/portal", icone: Wrench }}
      />
    </div>
  );
}
