import type { Metadata } from "next";
import { CalendarClock, FileText } from "lucide-react";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Próximas manutenções" };

export default function PaginaPortalProximas() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Próximas manutenções</h1>
      <TelaVazia
        icone={CalendarClock}
        titulo="Próximas manutenções"
        descricao="Aqui você vai ver quais equipamentos já estão com a manutenção vencida e quais vencem nos próximos dias. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver relatórios", href: "/portal/relatorios", icone: FileText }}
      />
    </div>
  );
}
