/**
 * Estado da sincronização (store externa, lida pelo indicador do cabeçalho com useSyncExternalStore).
 * Quantos serviços estão na fila vem direto do Dexie (useLiveQuery): aqui fica só o "o que o motor está fazendo".
 */
export type EstadoSincronizacao = {
  /** Há uma sincronização em andamento agora. */
  sincronizando: boolean;
  /** Quantos serviços estão sendo enviados nesta rodada (para "Enviando 2 serviços…"). */
  enviando: number;
  /** A última tentativa falhou por falta de internet (ou o navegador diz que está offline). */
  semInternet: boolean;
  /** A sessão terminou: é preciso entrar de novo (a fila continua guardada). */
  sessaoExpirada: boolean;
  /** Mensagem do último erro que não é falta de internet (para o indicador "Erro ao enviar"). */
  erro: string | null;
  /** ISO da última sincronização completa bem-sucedida. */
  ultimaSincronizacao: string | null;
};

const inicial: EstadoSincronizacao = {
  sincronizando: false,
  enviando: 0,
  semInternet: false,
  sessaoExpirada: false,
  erro: null,
  ultimaSincronizacao: null,
};

let atual: EstadoSincronizacao = inicial;
const ouvintes = new Set<() => void>();

export function lerEstado(): EstadoSincronizacao {
  return atual;
}

export function assinarEstado(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  return () => ouvintes.delete(aoMudar);
}

export function atualizarEstado(parcial: Partial<EstadoSincronizacao>): void {
  atual = { ...atual, ...parcial };
  for (const f of ouvintes) f();
}

/** Só para testes. */
export function reiniciarEstado(): void {
  atual = inicial;
  for (const f of ouvintes) f();
}
