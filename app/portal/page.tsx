import type { Metadata } from "next";
import { FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { CartoesResumo } from "@/components/painel/cartoes-resumo";
import { ProximasManutencoes } from "@/components/painel/proximas-manutencoes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { escopoCliente } from "@/lib/auth/permissoes";
import { listarEquipamentosDoCliente } from "@/lib/portal/queries";
import { contarSituacoes, proximasManutencoes } from "@/lib/tecnico/data/filtros";

export const metadata: Metadata = { title: "Início" };

export default async function PaginaPortalInicio({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;

  // Sempre filtrado pelo cliente da sessão.
  const escopo = await escopoCliente();
  const equipamentos = await listarEquipamentosDoCliente(escopo);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Início</h1>

      {aviso === "sem-acesso" && (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden />
          <AlertTitle>Esta área é só do técnico</AlertTitle>
          <AlertDescription>
            O seu acesso permite consultar os equipamentos e o histórico de manutenções da sua empresa.
          </AlertDescription>
        </Alert>
      )}

      <CartoesResumo
        contagem={contarSituacoes(equipamentos)}
        hrefDaSituacao={(status) => `/portal/equipamentos?situacao=${status}`}
      />

      <ProximasManutencoes
        equipamentos={proximasManutencoes(equipamentos)}
        hrefDoEquipamento={(id) => `/portal/equipamentos/${id}`}
      />

      <Button asChild size="lg" variant="outline" className="w-full sm:w-auto sm:self-start">
        <Link href="/portal/relatorios">
          <FileText aria-hidden />
          Gerar relatório em PDF
        </Link>
      </Button>
    </div>
  );
}
