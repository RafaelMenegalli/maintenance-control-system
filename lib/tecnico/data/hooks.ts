"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { repositorio } from "./atual";
import type {
  EquipamentoDetalhe,
  EquipamentoResumo,
  FiltrosEquipamentos,
  LocalDTO,
  OpcoesServicos,
  PainelTecnico,
  ServicoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/**
 * Hooks que as telas do técnico usam para ler dados. O formato do retorno é fixo:
 *   { dados, carregando, erro, recarregar }
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
  const [versao, setVersao] = useState(0);
  const chaveCompleta = `${chave}#${versao}`;
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

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return {
    // Enquanto recarrega, mantém os dados anteriores na tela (sem piscar).
    dados: resultado?.dados,
    carregando: resultado?.chave !== chaveCompleta,
    erro: resultado?.chave === chaveCompleta ? resultado.erro : null,
    recarregar,
  };
}

export function useEquipamentos(filtros?: FiltrosEquipamentos): Consulta<EquipamentoResumo[]> {
  return useConsulta(() => repositorio.listarEquipamentos(filtros), `eq:${JSON.stringify(filtros ?? {})}`);
}

export function useEquipamento(id: string): Consulta<EquipamentoDetalhe | null> {
  return useConsulta(() => repositorio.obterEquipamento(id), `eqd:${id}`);
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

export function useLocais(): Consulta<LocalDTO[]> {
  return useConsulta(() => repositorio.listarLocais(), "locais");
}

export function usePainel(): Consulta<PainelTecnico> {
  return useConsulta(() => repositorio.obterPainel(), "painel");
}
