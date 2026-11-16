"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";
import { repositorio } from "./atual";
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
  TipoEquipamentoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/**
 * Hooks que as telas do técnico usam para ler dados. O formato do retorno é fixo:
 *   { dados, carregando, erro, recarregar }
 * Recarregam sozinhos depois de qualquer escrita (ver ./invalidacao).
 * Na etapa 5 estes hooks passam a usar `useLiveQuery` (Dexie) mantendo o mesmo retorno.
 */
export type Consulta<T> = {
  /** `undefined` enquanto carrega pela primeira vez. */
  dados: T | undefined;
  carregando: boolean;
  /** Mensagem pronta para o usuário, ou null. */
  erro: string | null;
  recarregar: () => void;
};

type Resultado<T> = { chave: string; dados?: T; erro: string | null };

function useConsulta<T>(carregar: () => Promise<T>, chave: string): Consulta<T> {
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const [versaoManual, setVersaoManual] = useState(0);
  const versaoGlobal = useSyncExternalStore(assinarMudancas, versaoAtual, versaoAtual);
  const chaveCompleta = `${chave}#${versaoManual}.${versaoGlobal}`;
  // Sempre usa a função mais recente sem refazer a consulta a cada renderização.
  const executar = useEffectEvent(carregar);

  useEffect(() => {
    let cancelado = false;
    executar()
      .then((dados) => {
        if (!cancelado) setResultado({ chave: chaveCompleta, dados, erro: null });
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        const erro = e instanceof Error ? e.message : "Não foi possível carregar os dados.";
        setResultado((anterior) => ({ chave: chaveCompleta, dados: anterior?.dados, erro }));
      });
    return () => {
      cancelado = true;
    };
  }, [chaveCompleta]);

  const recarregar = useCallback(() => setVersaoManual((v) => v + 1), []);
  return {
    // Enquanto recarrega, mantém os dados anteriores na tela (sem piscar).
    dados: resultado?.dados,
    carregando: resultado?.chave !== chaveCompleta,
    erro: resultado?.chave === chaveCompleta ? resultado.erro : null,
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
