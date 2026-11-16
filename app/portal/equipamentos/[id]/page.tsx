import type { Metadata } from "next";
import { History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { TelaVazia } from "@/components/tela-vazia";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { idValido } from "@/lib/api";
import { escopoCliente } from "@/lib/auth/permissoes";
import { formatarData } from "@/lib/format";
import { obterEquipamentoDoCliente } from "@/lib/portal/queries";
import { calcularStatus } from "@/lib/status";

export const metadata: Metadata = { title: "Equipamento" };

export default async function PaginaPortalEquipamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idValido(id)) notFound();

  // Sempre filtrado pelo cliente da sessão: equipamento de outra empresa vira "não encontrado".
  const escopo = await escopoCliente();
  const e = await obterEquipamentoDoCliente(escopo, id);
  if (!e) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link href="/portal">Voltar para os equipamentos</Link>
      </Button>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">{e.nome}</h1>
          <p className="text-muted-foreground">
            {e.tipoNome} · {e.localNome}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusBadge status={calcularStatus(e.proximaData)} proximaData={e.proximaData} />
            <span className="text-muted-foreground">
              {e.ultimoServicoEm ? `Último serviço: ${formatarData(e.ultimoServicoEm)}` : "Nenhum serviço registrado"}
            </span>
          </div>
        </CardContent>
      </Card>
      <TelaVazia
        icone={History}
        titulo="Histórico de serviços"
        descricao="Aqui você vai ver todos os serviços feitos neste equipamento, com checklist e fotos. Esta tela será liberada nas próximas etapas."
      />
    </div>
  );
}
