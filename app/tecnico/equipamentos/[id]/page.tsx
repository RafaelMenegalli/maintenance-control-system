import type { Metadata } from "next";
import { ClipboardList, History } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Equipamento" };

export default async function PaginaEquipamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Tela titulo="Equipamento" voltarHref="/tecnico/equipamentos">
      <TelaVazia
        icone={History}
        titulo="Dados e histórico do equipamento"
        descricao="Aqui você vai ver os dados do equipamento, o status e a linha do tempo com todos os serviços, checklists e fotos. Esta tela será liberada nas próximas etapas."
        acao={{
          rotulo: "Registrar serviço",
          href: `/tecnico/servicos/novo?equipamento=${encodeURIComponent(id)}`,
          icone: ClipboardList,
        }}
      />
    </Tela>
  );
}
