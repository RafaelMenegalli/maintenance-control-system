"use client";

import { ChevronRight, Plus, Search, SearchX, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatarData } from "@/lib/format";
import type { StatusEquipamento } from "@/lib/status";
import {
  useClienteAutomatico,
  useEquipamentos,
  useLocais,
  useTipos,
  type EquipamentoResumo,
} from "@/lib/tecnico/data";

const ORDEM_STATUS: Record<StatusEquipamento, number> = {
  vencido: 0,
  vence_em_breve: 1,
  sem_registro: 2,
  em_dia: 3,
};

/** Vencidos primeiro, depois os que vencem em breve, depois o resto (do mais urgente ao menos). */
export function ordenarPorUrgencia(lista: EquipamentoResumo[]): EquipamentoResumo[] {
  return [...lista].sort(
    (a, b) =>
      ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
      (a.proximaData ?? "9999").localeCompare(b.proximaData ?? "9999") ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

type OpcaoChip = { valor: string; rotulo: string };

function Chips({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: OpcaoChip[];
  valor: string | undefined;
  aoMudar: (valor: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span id={`chips-${rotulo}`} className="font-semibold">
        {rotulo}
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby={`chips-${rotulo}`}
        value={valor ?? "todos"}
        // Tocar de novo no chip ativo não pode deixar a seleção vazia: volta para "Todos".
        onValueChange={(v) => aoMudar(!v || v === "todos" ? undefined : v)}
        className="flex w-full flex-wrap justify-start"
      >
        <ToggleGroupItem
          value="todos"
          className="rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          Todos
        </ToggleGroupItem>
        {opcoes.map((o) => (
          <ToggleGroupItem
            key={o.valor}
            value={o.valor}
            className="rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {o.rotulo}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

const OPCOES_STATUS: OpcaoChip[] = [
  { valor: "vencido", rotulo: "Vencidos" },
  { valor: "vence_em_breve", rotulo: "Vencem em breve" },
  { valor: "em_dia", rotulo: "Em dia" },
  { valor: "sem_registro", rotulo: "Sem registro" },
];

export function ListaEquipamentos() {
  const [busca, setBusca] = useState("");
  const [tipoId, setTipoId] = useState<string>();
  const [localId, setLocalId] = useState<string>();
  const [status, setStatus] = useState<StatusEquipamento>();
  const [arquivados, setArquivados] = useState(false);

  const filtros = useMemo(
    () => ({ busca, tipoId, localId, status, incluirArquivados: arquivados }),
    [busca, tipoId, localId, status, arquivados],
  );
  const { dados, erro, recarregar } = useEquipamentos(filtros);
  const { dados: tipos } = useTipos();
  const { dados: locais } = useLocais();
  const { precisaEscolher } = useClienteAutomatico();

  const lista = useMemo(() => (dados ? ordenarPorUrgencia(dados) : undefined), [dados]);
  const temFiltro = !!(busca || tipoId || localId || status || arquivados);

  function limparFiltros() {
    setBusca("");
    setTipoId(undefined);
    setLocalId(undefined);
    setStatus(undefined);
    setArquivados(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Button asChild size="lg" className="w-full sm:w-auto sm:self-start">
        <Link href="/tecnico/equipamentos/novo">
          <Plus aria-hidden />
          Novo equipamento
        </Link>
      </Button>

      <Field>
        <FieldLabel htmlFor="busca-equipamento">Procurar equipamento</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-5" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="busca-equipamento"
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

      <details className="group rounded-xl border-2 p-3" open={!!(tipoId || localId || status || arquivados)}>
        <summary className="flex min-h-12 cursor-pointer items-center justify-between font-semibold">
          Filtros
          <span className="text-sm font-normal text-muted-foreground group-open:hidden">Toque para abrir</span>
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <Chips
            rotulo="Situação"
            opcoes={OPCOES_STATUS}
            valor={status}
            aoMudar={(v) => setStatus(v as StatusEquipamento | undefined)}
          />
          <Chips
            rotulo="Tipo"
            opcoes={(tipos ?? []).filter((t) => t.ativo).map((t) => ({ valor: t.id, rotulo: t.nome }))}
            valor={tipoId}
            aoMudar={setTipoId}
          />
          <Chips
            rotulo="Local"
            opcoes={(locais ?? []).map((l) => ({
              valor: l.id,
              rotulo: precisaEscolher ? `${l.clienteNome} › ${l.nome}` : l.nome,
            }))}
            valor={localId}
            aoMudar={setLocalId}
          />
          <label
            htmlFor="mostrar-arquivados"
            className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border px-4"
          >
            <span className="font-medium">Mostrar equipamentos arquivados</span>
            <Switch id="mostrar-arquivados" checked={arquivados} onCheckedChange={setArquivados} />
          </label>
        </div>
      </details>

      {!lista && (erro ? <ErroAoCarregar mensagem={erro} aoTentar={recarregar} /> : <CarregandoLista />)}

      {lista && lista.length === 0 && !temFiltro && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wrench aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Nenhum equipamento cadastrado</EmptyTitle>
            <EmptyDescription>Cadastre o primeiro equipamento para começar a registrar os serviços.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="lg">
              <Link href="/tecnico/equipamentos/novo">
                <Plus aria-hidden />
                Cadastrar equipamento
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {lista && lista.length === 0 && temFiltro && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Nenhum equipamento encontrado</EmptyTitle>
            <EmptyDescription>Confira o que você digitou ou tire algum filtro.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" variant="outline" onClick={limparFiltros}>
              <X aria-hidden />
              Limpar busca e filtros
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {lista && lista.length > 0 && (
        <>
          <p className="text-muted-foreground" aria-live="polite">
            {lista.length === 1 ? "1 equipamento" : `${lista.length} equipamentos`}
            {temFiltro && (
              <>
                {" · "}
                <button type="button" onClick={limparFiltros} className="font-medium text-primary underline underline-offset-4">
                  Limpar busca e filtros
                </button>
              </>
            )}
          </p>
          <ul className="flex flex-col gap-3">
            {lista.map((e) => (
              <li key={e.id}>
                <Link href={`/tecnico/equipamentos/${e.id}`} className="block rounded-xl">
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                        <IconeTipo nome={e.tipoIcone} className="size-7" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold">
                          {e.nome}
                          {e.arquivado && <Badge variant="secondary">Arquivado</Badge>}
                        </p>
                        <p className="text-muted-foreground">
                          {e.localNome} · {e.tipoNome}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <StatusBadge status={e.status} proximaData={e.proximaData} />
                          <span className="text-muted-foreground">
                            {e.ultimoServicoEm ? `Último serviço: ${formatarData(e.ultimoServicoEm)}` : "Nenhum serviço registrado"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
