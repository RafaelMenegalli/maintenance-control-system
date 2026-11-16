"use client";

import { ChevronRight, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatarNumero } from "@/lib/format";
import { PERIODICIDADES_RAPIDAS } from "@/lib/schemas/entidades";
import { useTipos } from "@/lib/tecnico/data";

export function textoPeriodicidade(dias: number): string {
  const rapida = PERIODICIDADES_RAPIDAS.find((p) => p.dias === dias);
  return rapida ? `${rapida.rotulo} (a cada ${dias} dias)` : `A cada ${formatarNumero(dias, 0)} dias`;
}

export function ListaTipos() {
  const { dados: tipos, erro, recarregar } = useTipos();

  if (!tipos) {
    if (erro) return <ErroAoCarregar mensagem={erro} aoTentar={recarregar} />;
    return <CarregandoLista />;
  }

  const ativos = tipos.filter((t) => t.ativo);
  const arquivados = tipos.filter((t) => !t.ativo);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/tecnico/tipos/novo">
            <Plus aria-hidden />
            Novo tipo
          </Link>
        </Button>
      </div>

      {tipos.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings2 aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Nenhum tipo cadastrado</EmptyTitle>
            <EmptyDescription>
              Rode o cadastro inicial (pnpm db:seed) para criar os 4 tipos padrão, ou crie um tipo novo.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="lg">
              <Link href="/tecnico/tipos/novo">
                <Plus aria-hidden />
                Novo tipo
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <ul className="flex flex-col gap-3">
        {ativos.map((t) => (
          <ItemTipo key={t.id} tipo={t} />
        ))}
      </ul>

      {arquivados.length > 0 && (
        <>
          <h2 className="mt-2 text-lg font-semibold">Tipos arquivados</h2>
          <ul className="flex flex-col gap-3">
            {arquivados.map((t) => (
              <ItemTipo key={t.id} tipo={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ItemTipo({ tipo }: { tipo: NonNullable<ReturnType<typeof useTipos>["dados"]>[number] }) {
  return (
    <li>
      <Link href={`/tecnico/tipos/${tipo.id}`} className="block rounded-xl">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <IconeTipo nome={tipo.icone} className="size-8" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold">
                {tipo.nome}
                {!tipo.ativo && <Badge variant="secondary">Arquivado</Badge>}
              </p>
              <p className="text-muted-foreground">
                {tipo.quantidadeEquipamentos === 0
                  ? "Nenhum equipamento"
                  : `${formatarNumero(tipo.quantidadeEquipamentos, 0)} equipamento${tipo.quantidadeEquipamentos === 1 ? "" : "s"}`}
                {" · "}
                {textoPeriodicidade(tipo.periodicidadePadraoDias)}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 font-medium text-primary">
              Editar
              <ChevronRight className="size-5" aria-hidden />
            </span>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
