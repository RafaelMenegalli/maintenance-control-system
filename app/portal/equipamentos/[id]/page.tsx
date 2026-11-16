import type { Metadata } from "next";
import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconeTipo } from "@/components/icone-tipo";
import { ListaServicos } from "@/components/servico/lista-servicos";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { idValido } from "@/lib/api";
import { escopoCliente } from "@/lib/auth/permissoes";
import { formatarData, formatarDias, formatarNumero } from "@/lib/format";
import { listarServicosDoEquipamentoDoCliente, obterEquipamentoDoCliente } from "@/lib/portal/queries";
import type { CampoDefinicao, ValorAtributo } from "@/lib/schemas/campo";

export const metadata: Metadata = { title: "Equipamento" };

function textoDoValor(campo: CampoDefinicao, valor: ValorAtributo | undefined): string {
  if (valor === undefined || valor === null || valor === "") return "Não informado";
  switch (campo.type) {
    case "numero":
      return `${formatarNumero(Number(valor), 2)}${campo.unidade ? ` ${campo.unidade}` : ""}`;
    case "data":
      return formatarData(String(valor));
    case "sim_nao":
      return valor ? "Sim" : "Não";
    default:
      return String(valor);
  }
}

export default async function PaginaPortalEquipamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idValido(id)) notFound();

  // Sempre filtrado pelo cliente da sessão: equipamento de outra empresa vira "não encontrado".
  const escopo = await escopoCliente();
  const e = await obterEquipamentoDoCliente(escopo, id);
  if (!e) notFound();
  const servicos = (await listarServicosDoEquipamentoDoCliente(escopo, id)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link href="/portal/equipamentos">
          <ArrowLeft aria-hidden />
          Voltar para os equipamentos
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <IconeTipo nome={e.tipoIcone} className="size-9" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl leading-tight font-bold">{e.nome}</h1>
              <p className="text-muted-foreground">
                {e.tipoNome} · {e.localNome}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusBadge status={e.status} proximaData={e.proximaData} />
            <span className="text-muted-foreground">
              {e.ultimoServicoEm ? `Último serviço: ${formatarData(e.ultimoServicoEm)}` : "Nenhum serviço registrado"}
            </span>
          </div>
          {e.proximaData && (
            <p>
              <span className="font-medium">Próxima manutenção:</span> {formatarData(e.proximaData)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do cadastro</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {e.campos.map((campo) => (
              <div key={campo.key}>
                <dt className="text-muted-foreground">{campo.label}</dt>
                <dd className="font-medium">{textoDoValor(campo, e.atributos[campo.key])}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted-foreground">Manutenção a cada</dt>
              <dd className="font-medium">{formatarDias(e.periodicidadeDias)}</dd>
            </div>
            {e.observacoes && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Observações</dt>
                <dd className="font-medium whitespace-pre-line">{e.observacoes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
        <h2 id="titulo-historico" className="flex items-center gap-2 text-lg font-bold">
          <History className="size-5" aria-hidden />
          Histórico de serviços
        </h2>
        {/* Sem `acoes`: o portal é somente leitura (nenhum botão de editar ou excluir). */}
        <ListaServicos
          servicos={servicos}
          vazio={
            <p className="rounded-xl border-2 border-dashed p-4 text-muted-foreground">
              Nenhum serviço registrado neste equipamento ainda.
            </p>
          }
        />
      </section>
    </div>
  );
}
