import type { ServicoInput } from "@/lib/schemas/entidades";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  ServicoDetalhe,
  TipoEquipamentoDTO,
} from "@/lib/tecnico/data/types";

/**
 * Contrato da sincronização (servidor ⇄ celular). Só tipos: usado pelas rotas
 * `/api/sync/pull` e `/api/sync/push` e pelo motor em lib/tecnico/sync.
 */

/** Quantos serviços recentes de cada equipamento vão para o celular (e aparecem na linha do tempo offline). */
export const SERVICOS_POR_EQUIPAMENTO = 10;

/** O servidor não calcula o status: o celular calcula (lib/status.ts), com a fila pendente incluída. */
export type EquipamentoSincronizado = Omit<EquipamentoDetalhe, "status">;

/** GET /api/sync/pull?desde={ISO} */
export type RespostaPull = {
  /** Hora do servidor no momento da consulta (ISO). O próximo pull usa `agora` menos uma folga. */
  agora: string;
  /** `true` quando não veio `desde` (primeira sincronização): o celular troca tudo. */
  completo: boolean;
  /** Tipos e clientes (com locais) sempre completos: são poucos. */
  tipos: TipoEquipamentoDTO[];
  clientes: ClienteDTO[];
  /** Só os equipamentos alterados desde `desde` (ou todos, se completo). */
  equipamentos: EquipamentoSincronizado[];
  /** Últimos serviços dos equipamentos acima: substituem os que o celular tinha deles. */
  servicosPorEquipamento: Record<string, ServicoDetalhe[]>;
};

/** Um serviço da fila, no formato aceito por POST /api/sync/push (as fotos já subiram por POST /api/fotos). */
export type ServicoParaEnviar = ServicoInput;

/** POST /api/sync/push */
export type CorpoPush = { servicos: ServicoParaEnviar[] };

export type ResultadoPush = {
  id: string;
  /** O servidor tem o serviço (recém-criado ou já existia). Só então a fila pode apagá-lo. */
  ok: boolean;
  criado?: boolean;
  /** Fotos citadas que o servidor não achou no disco: o celular reenvia e repete o push. */
  fotosFaltando?: string[];
  /** O servidor recusou de vez (ex.: equipamento não existe mais): não adianta repetir. */
  permanente?: boolean;
  erro?: string;
  /** Serviço como o servidor o guardou (vai para o Dexie quando sai da fila). */
  servico?: ServicoDetalhe;
};

export type RespostaPush = { resultados: ResultadoPush[] };

/** Máximo de serviços por chamada de push. */
export const MAX_SERVICOS_POR_PUSH = 20;
