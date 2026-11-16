import type { Metadata } from "next";
import { ClipboardList, LayoutDashboard } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Início" };

export default function PaginaInicio() {
  return (
    <Tela titulo="Início">
      <TelaVazia
        icone={LayoutDashboard}
        titulo="Painel de manutenções"
        descricao="Aqui você vai ver as manutenções vencidas, as que vencem em até 15 dias e os equipamentos sem nenhum registro. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Registrar serviço", href: "/tecnico/servicos/novo", icone: ClipboardList }}
      />
    </Tela>
  );
}
