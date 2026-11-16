import { banco, gravarMeta, META } from "@/lib/tecnico/data/banco";
import { notificarMudanca } from "@/lib/tecnico/data/invalidacao";
import { aquecerCache } from "./aquecimento";
import { atualizarEstado, lerEstado } from "./estado";
import { puxar } from "./pull";
import { enviarFila } from "./push";
import { ErroDeRede, ErroDeSessao, ErroDoServidor, type Fetch } from "./rede";

export type ResultadoSincronizacao =
  | { situacao: "ok"; enviados: number }
  | { situacao: "sem-internet" }
  | { situacao: "sessao-expirada" }
  | { situacao: "erro"; mensagem: string }
  /** Já existe uma sincronização rodando (nesta aba ou em outra). */
  | { situacao: "ocupado" };

type Opcoes = {
  /** "Sincronizar agora": ignora a espera entre tentativas. */
  forcar?: boolean;
  /** Só baixa as novidades (usado depois de gravar um cadastro). */
  soPull?: boolean;
  fetchFn?: Fetch;
};

let emAndamento: Promise<ResultadoSincronizacao> | null = null;

async function rodar({ forcar, soPull, fetchFn }: Opcoes): Promise<ResultadoSincronizacao> {
  atualizarEstado({ sincronizando: true, enviando: 0, erro: null });
  try {
    let enviados = 0;
    if (!soPull) {
      // 1) sobe a fila (fotos → serviços)  2) baixa as novidades (já com o que acabou de subir)
      const resumo = await enviarFila({ fetchFn, forcar, aoComecar: (total) => atualizarEstado({ enviando: total }) });
      enviados = resumo.enviados;
    }
    await puxar(fetchFn);
    const agora = new Date().toISOString();
    await gravarMeta(META.ultimaSincronizacao, agora);
    atualizarEstado({ sincronizando: false, enviando: 0, semInternet: false, sessaoExpirada: false, erro: null, ultimaSincronizacao: agora });
    notificarMudanca();
    // Guarda no cache do service worker as telas offline (sem esperar).
    void aquecerCache();
    return { situacao: "ok", enviados };
  } catch (e) {
    notificarMudanca();
    if (e instanceof ErroDeRede) {
      atualizarEstado({ sincronizando: false, enviando: 0, semInternet: true });
      return { situacao: "sem-internet" };
    }
    if (e instanceof ErroDeSessao) {
      atualizarEstado({ sincronizando: false, enviando: 0, sessaoExpirada: true, erro: "Sua sessão terminou. Entre de novo." });
      return { situacao: "sessao-expirada" };
    }
    const mensagem = e instanceof ErroDoServidor || e instanceof Error ? e.message : "Erro desconhecido.";
    atualizarEstado({ sincronizando: false, enviando: 0, erro: mensagem });
    return { situacao: "erro", mensagem };
  }
}

/**
 * Sincroniza: sobe a fila e baixa as novidades. Só roda uma por vez (nesta aba e entre abas, com Web Locks);
 * chamadas durante uma rodada recebem a mesma promessa. Nunca lança: o resultado diz o que aconteceu.
 */
export function sincronizar(opcoes: Opcoes = {}): Promise<ResultadoSincronizacao> {
  if (emAndamento) return emAndamento;
  const executar = async (): Promise<ResultadoSincronizacao> => {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) return rodar(opcoes);
    const resultado = await locks.request("sync-manutencoes", { ifAvailable: true }, async (lock) => {
      if (!lock) return null;
      return rodar(opcoes);
    });
    return resultado ?? { situacao: "ocupado" };
  };
  emAndamento = executar().finally(() => {
    emAndamento = null;
  });
  return emAndamento;
}

/** Dispara a sincronização sem esperar (depois de salvar um serviço, por exemplo). */
export function agendarSincronizacao(): void {
  void sincronizar();
}

/** Baixa as novidades agora (depois de um cadastro gravado online). */
export async function puxarAgora(): Promise<void> {
  await sincronizar({ soPull: true, forcar: true });
}

/** Instante (ms) da próxima tentativa agendada na fila, ou null se nada espera. */
export async function proximaTentativaDaFila(): Promise<number | null> {
  const itens = await banco().filaServicos.toArray();
  const datas = itens.filter((i) => !i.recusado && i.proximaTentativa > 0).map((i) => i.proximaTentativa);
  return datas.length ? Math.min(...datas) : null;
}

export { lerEstado };
