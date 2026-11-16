"use client";

import { Plus, Search, SearchX, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChipsFiltro as Chips } from "@/components/chips-filtro";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { CartaoEquipamento } from "@/components/equipamento/cartao-equipamento";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { STATUS_EQUIPAMENTO, type StatusEquipamento } from "@/lib/status";
import { ordenarPorUrgencia } from "@/lib/tecnico/data/filtros";
import { OPCOES_STATUS } from "@/lib/equipamentos/opcoes";
import { useClienteAutomatico, useEquipamentos, useLocais, useTipos } from "@/lib/tecnico/data";


export function ListaEquipamentos() {
  const [busca, setBusca] = useState("");
  // Os cartões do painel abrem esta lista já filtrada: ?situacao=vencido&tipo=...&local=...
  const params = useSearchParams();
  const [tipoId, setTipoId] = useState<string | undefined>(params.get("tipo") ?? undefined);
  const [localId, setLocalId] = useState<string | undefined>(params.get("local") ?? undefined);
  const [status, setStatus] = useState<StatusEquipamento | undefined>(() => {
    const s = params.get("situacao");
    return (STATUS_EQUIPAMENTO as readonly string[]).includes(s ?? "") ? (s as StatusEquipamento) : undefined;
  });
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
                <CartaoEquipamento equipamento={e} href={`/tecnico/equipamentos/${e.id}`} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
