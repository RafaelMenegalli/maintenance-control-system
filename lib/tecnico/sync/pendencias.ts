"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { banco } from "@/lib/tecnico/data/banco";

/** Um serviço registrado no celular que ainda não foi confirmado pelo servidor. */
export type Pendencia = {
  id: string;
  equipamentoNome: string;
  /** Data do serviço (yyyy-mm-dd). */
  data: string;
  quantidadeFotos: number;
  tentativas: number;
  /** Mensagem do último erro, se houver. */
  erro: string | null;
  /** O servidor recusou: precisa de "Tentar de novo". */
  recusado: boolean;
};

/** Fila de envio, ao vivo (atualiza sozinha quando algo entra ou sai da fila). `undefined` = carregando. */
export function usePendencias(): Pendencia[] | undefined {
  return useLiveQuery(async () => {
    const b = banco();
    const [fila, equipamentos] = await Promise.all([b.filaServicos.orderBy("criadoEm").toArray(), b.equipamentos.toArray()]);
    const nomes = new Map(equipamentos.map((e) => [e.id, e.nome]));
    return fila.map(
      (i): Pendencia => ({
        id: i.id,
        equipamentoNome: nomes.get(i.equipamentoId) ?? "Equipamento",
        data: i.dados.data,
        quantidadeFotos: i.dados.fotos.length,
        tentativas: i.tentativas,
        erro: i.erro,
        recusado: i.recusado,
      }),
    );
  }, []);
}

/** Quantos serviços aguardam envio (uso pontual, fora de componentes). */
export async function contarPendencias(): Promise<number> {
  try {
    return await banco().filaServicos.count();
  } catch {
    return 0;
  }
}
