"use client";

import { MapPin, Search, SearchX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChipsFiltro } from "@/components/chips-filtro";
import { CartaoEquipamento } from "@/components/equipamento/cartao-equipamento";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { OPCOES_STATUS } from "@/lib/equipamentos/opcoes";
import { STATUS_EQUIPAMENTO, type StatusEquipamento } from "@/lib/status";
import { filtrarEquipamentos, ordenarPorUrgencia } from "@/lib/tecnico/data/filtros";
import type { EquipamentoResumo } from "@/lib/tecnico/data/types";

type Props = {
  /** Já vem do servidor, filtrado pelo cliente da sessão (escopoCliente). */
  equipamentos: EquipamentoResumo[];
  tipos: { id: string; nome: string }[];
};

/** Lista de equipamentos do portal: agrupada por local, com busca e filtros de tipo e situação. */
export function ListaPortal({ equipamentos, tipos }: Props) {
  const params = useSearchParams();
  const [busca, setBusca] = useState("");
  const [tipoId, setTipoId] = useState<string | undefined>(params.get("tipo") ?? undefined);
  const [status, setStatus] = useState<StatusEquipamento | undefined>(() => {
    const s = params.get("situacao");
    return (STATUS_EQUIPAMENTO as readonly string[]).includes(s ?? "") ? (s as StatusEquipamento) : undefined;
  });
  const temFiltro = !!(busca || tipoId || status);

  // Cada local com seus equipamentos, do mais urgente ao menos urgente.
  const grupos = useMemo(() => {
    const filtrados = ordenarPorUrgencia(filtrarEquipamentos(equipamentos, { busca, tipoId, status }));
    const porLocal = new Map<string, { nome: string; itens: EquipamentoResumo[] }>();
    for (const e of filtrados) {
      const g = porLocal.get(e.localId) ?? { nome: e.localNome, itens: [] };
      g.itens.push(e);
      porLocal.set(e.localId, g);
    }
    return [...porLocal.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [equipamentos, busca, tipoId, status]);

  const total = grupos.reduce((n, g) => n + g.itens.length, 0);

  function limpar() {
    setBusca("");
    setTipoId(undefined);
    setStatus(undefined);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="busca-portal">Procurar equipamento</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-5" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="busca-portal"
            type="search"
            autoComplete="off"
            placeholder="Nome, local ou tipo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={() => setBusca("")}>
                <X aria-hidden />
                Limpar
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </Field>

      <details className="group rounded-xl border-2 p-3" open={!!(tipoId || status)}>
        <summary className="flex min-h-12 cursor-pointer items-center justify-between font-semibold">
          Filtros
          <span className="text-sm font-normal text-muted-foreground group-open:hidden">Toque para abrir</span>
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <ChipsFiltro
            rotulo="Situação"
            opcoes={OPCOES_STATUS}
            valor={status}
            aoMudar={(v) => setStatus(v as StatusEquipamento | undefined)}
          />
          <ChipsFiltro
            rotulo="Tipo de equipamento"
            opcoes={tipos.map((t) => ({ valor: t.id, rotulo: t.nome }))}
            valor={tipoId}
            aoMudar={setTipoId}
          />
        </div>
      </details>

      {equipamentos.length === 0 && (
        <p className="rounded-xl border-2 border-dashed p-4 text-muted-foreground">
          Ainda não há equipamentos cadastrados para a sua empresa.
        </p>
      )}

      {equipamentos.length > 0 && total === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Nenhum equipamento encontrado</EmptyTitle>
            <EmptyDescription>Confira o que você digitou ou tire algum filtro.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" variant="outline" onClick={limpar}>
              <X aria-hidden />
              Limpar busca e filtros
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {total > 0 && (
        <>
          <p className="text-muted-foreground" aria-live="polite">
            {total === 1 ? "1 equipamento" : `${total} equipamentos`}
            {temFiltro && (
              <>
                {" · "}
                <button type="button" onClick={limpar} className="font-medium text-primary underline underline-offset-4">
                  Limpar busca e filtros
                </button>
              </>
            )}
          </p>
          {grupos.map((g) => (
            <section key={g.nome} aria-label={`Local: ${g.nome}`} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="size-5 text-primary" aria-hidden />
                {g.nome}
                <span className="font-normal text-muted-foreground">({g.itens.length})</span>
              </h2>
              <ul className="flex flex-col gap-3">
                {g.itens.map((e) => (
                  <li key={e.id}>
                    <CartaoEquipamento equipamento={e} href={`/portal/equipamentos/${e.id}`} mostrarLocal={false} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
