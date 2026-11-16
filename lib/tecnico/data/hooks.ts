"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { assinarEstado, lerEstado } from "@/lib/tecnico/sync/estado";
import { repositorio } from "./atual";
import { SemDadosLocais } from "./dexie-repositorio";
import { filtrarEquipamentos } from "./filtros";
import { assinarMudancas, versaoAtual } from "./invalidacao";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  EquipamentoResumo,
  FiltrosEquipamentos,
  LocalDTO,
  OpcoesServicos,
  PainelTecnico,
  ServicoDetalhe,
  ServicoRecente,
  TipoEquipamentoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/**
 * Hooks que as telas do técnico usam para ler dados. O formato do retorno é fixo:
 *   { dados, carregando, erro, recarregar }
 * Recarregam sozinhos depois de qualquer escrita (ver ./invalidacao).
 * Leem do Dexie com `useLiveQuery` (ver `useConsulta`); o formato do retorno é o mesmo de sempre.
 */
export type Consulta<T> = {
  /** `undefined` enquanto carrega pela primeira vez. */
  dados: T | undefined;
  carregando: boolean;
  /** Mensagem pronta para o usuário, ou null. */
  erro: string | null;
  recarregar: () => void;
};

type Resultado<T> = { chave: string; dados?: T; erro: string | null; semDados: boolean };

/**
 * Lê do banco local com `useLiveQuery` (Dexie): a tela se atualiza sozinha quando o Dexie muda
 * (sincronização, serviço salvo na fila…). Mantém o formato antigo { dados, carregando, erro, recarregar }.
 */
function useConsulta<T>(carregar: () => Promise<T>, chave: string): Consulta<T> {
  const [versaoManual, setVersaoManual] = useState(0);
  const versaoGlobal = useSyncExternalStore(assinarMudancas, versaoAtual, versaoAtual);
  const estado = useSyncExternalStore(assinarEstado, lerEstado, lerEstado);

  const resultado = useLiveQuery(
    async (): Promise<Resultado<T>> => {
      try {
        return { chave, dados: await carregar(), erro: null, semDados: false };
      } catch (e) {
        if (e instanceof SemDadosLocais) return { chave, erro: null, semDados: true };
        const erro = e instanceof Error ? e.message : "Não foi possível carregar os dados.";
        return { chave, erro, semDados: false };
      }
    },
    [chave, versaoManual, versaoGlobal],
  );

  // O Dexie mantém o resultado anterior enquanto recarrega (sem piscar); só aceitamos o que é DESTA consulta.
  const valido = resultado && resultado.chave === chave ? resultado : null;

  const recarregar = useCallback(() => setVersaoManual((v) => v + 1), []);
  const semDados = valido?.semDados === true;
  return {
    dados: valido?.dados,
    carregando: !valido || (semDados && !estado.semInternet),
    // Primeira vez, sem internet: não há o que mostrar até baixar os dados.
    erro: semDados && estado.semInternet ? new SemDadosLocais().message : (valido?.erro ?? null),
    recarregar,
  };
}

/**
 * Equipamentos filtrados. A lista inteira é carregada uma vez e os filtros (busca, tipo,
 * local, status) são aplicados em memória — a busca responde a cada letra digitada.
 */
export function useEquipamentos(filtros?: FiltrosEquipamentos): Consulta<EquipamentoResumo[]> {
  const todos = useConsulta(() => repositorio.listarEquipamentos({ incluirArquivados: true }), "eq");
  const { busca, tipoId, localId, status, incluirArquivados } = filtros ?? {};
  const dados = useMemo(
    () =>
      todos.dados
        ? filtrarEquipamentos(todos.dados, { busca, tipoId, localId, status, incluirArquivados })
        : undefined,
    [todos.dados, busca, tipoId, localId, status, incluirArquivados],
  );
  return { ...todos, dados };
}

/** `id` nulo não busca nada (útil em formulários que servem para criar e editar). */
export function useEquipamento(id: string | null): Consulta<EquipamentoDetalhe | null> {
  return useConsulta(() => (id ? repositorio.obterEquipamento(id) : Promise.resolve(null)), `eqd:${id}`);
}

export function useServicos(equipamentoId: string, opcoes?: OpcoesServicos): Consulta<ServicoDetalhe[]> {
  return useConsulta(
    () => repositorio.listarServicos(equipamentoId, opcoes),
    `sv:${equipamentoId}:${JSON.stringify(opcoes ?? {})}`,
  );
}

export function useTipos(): Consulta<TipoEquipamentoDTO[]> {
  return useConsulta(() => repositorio.listarTipos(), "tipos");
}

export function useTipo(id: string): Consulta<TipoEquipamentoDetalhe | null> {
  return useConsulta(() => repositorio.obterTipo(id), `tipo:${id}`);
}

export function useLocais(): Consulta<LocalDTO[]> {
  return useConsulta(() => repositorio.listarLocais(), "locais");
}

export function useClientes(): Consulta<ClienteDTO[]> {
  return useConsulta(() => repositorio.listarClientes(), "clientes");
}

export function usePainel(): Consulta<PainelTecnico> {
  return useConsulta(() => repositorio.obterPainel(), "painel");
}

/**
 * Cliente atual. Com 1 cliente só, ele é escolhido automaticamente e `precisaEscolher`
 * é falso: nenhuma tela deve mostrar seletor de cliente. Só com 2 ou mais clientes
 * `precisaEscolher` é verdadeiro.
 */
export function useClienteAutomatico(): {
  carregando: boolean;
  clientes: ClienteDTO[];
  /** O único cliente, ou null se há 0 ou 2+. */
  clienteUnico: ClienteDTO | null;
  precisaEscolher: boolean;
} {
  const { dados, carregando } = useClientes();
  const clientes = useMemo(() => dados ?? [], [dados]);
  return {
    carregando,
    clientes,
    clienteUnico: clientes.length === 1 ? clientes[0] : null,
    precisaEscolher: clientes.length > 1,
  };
}

/** Últimos serviços registrados em qualquer equipamento (mais novo primeiro). */
export function useServicosRecentes(limite = 10): Consulta<ServicoRecente[]> {
  return useConsulta(() => repositorio.listarServicosRecentes(limite), `recentes:${limite}`);
}
