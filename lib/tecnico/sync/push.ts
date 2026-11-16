import { banco, type ItemFilaFoto, type ItemFilaServico } from "@/lib/tecnico/data/banco";
import { liberarUrlLocalDaFoto } from "@/lib/tecnico/data/pendentes";
import { calcularEspera } from "./espera";
import { chamar, ErroDeRede, ErroDeSessao, ErroDoServidor, type Fetch } from "./rede";
import { MAX_SERVICOS_POR_PUSH, type CorpoPush, type RespostaPush, type ResultadoPush } from "./tipos";

export type ResumoPush = {
  /** Serviços que o servidor confirmou nesta rodada (saíram da fila). */
  enviados: number;
  /** Serviços que continuam na fila (falha, espera, ou recusados). */
  restantes: number;
};

type Opcoes = {
  fetchFn?: Fetch;
  /** "Sincronizar agora": ignora a espera entre tentativas e reabre os recusados. */
  forcar?: boolean;
  agora?: () => number;
  /** Avisa quantos serviços vão ser enviados nesta rodada (para "Enviando 2 serviços…"). */
  aoComecar?: (total: number) => void;
};

/** Envia uma foto da fila (POST /api/fotos, idempotente pelo id da foto). */
async function enviarFoto(fetchFn: Fetch, foto: ItemFilaFoto): Promise<void> {
  const form = new FormData();
  form.append("fotoId", foto.id);
  form.append("servicoId", foto.servicoId);
  form.append("momento", foto.momento);
  form.append("arquivo", foto.arquivo, `${foto.id}.jpg`);
  await chamar<unknown>(fetchFn, "/api/fotos", { method: "POST", body: form, headers: { Accept: "application/json" } });
}

async function registrarFalha(item: ItemFilaServico, mensagem: string, agora: number, recusado = false) {
  const tentativas = item.tentativas + 1;
  await banco().filaServicos.update(item.id, {
    tentativas,
    erro: mensagem,
    recusado,
    proximaTentativa: recusado ? 0 : agora + calcularEspera(tentativas),
  });
}

/** O servidor confirmou o serviço: tira da fila (e apaga as fotos locais) e guarda a versão do servidor. */
async function concluir(item: ItemFilaServico, resultado: ResultadoPush) {
  const b = banco();
  const fotos = await b.filaFotos.where("servicoId").equals(item.id).toArray();
  await b.transaction("rw", [b.filaServicos, b.filaFotos, b.servicos], async () => {
    await b.filaServicos.delete(item.id);
    await b.filaFotos.where("servicoId").equals(item.id).delete();
    if (resultado.servico) await b.servicos.put(resultado.servico);
  });
  for (const f of fotos) liberarUrlLocalDaFoto(f.id);
}

/**
 * Envia a fila, serviço por serviço, em ordem:
 *   1. as fotos do serviço (POST /api/fotos — idempotente pelo id da foto);
 *   2. só os serviços com TODAS as fotos confirmadas vão no lote de POST /api/sync/push (idempotente por id);
 *   3. só o que o servidor confirmou (`ok`) sai da fila local. Nada é apagado sem confirmação.
 * Uma foto ou serviço que falha não trava os outros. Sem internet, para na hora (o que sobrou fica na fila).
 * Lança `ErroDeRede`/`ErroDeSessao`; erros de um serviço ficam gravados nele (tentativas, espera, mensagem).
 */
export async function enviarFila({ fetchFn = fetch, forcar = false, agora = Date.now, aoComecar }: Opcoes = {}): Promise<ResumoPush> {
  const b = banco();
  const todos = await b.filaServicos.orderBy("criadoEm").toArray();
  const t0 = agora();

  const elegiveis = todos.filter((i) => (forcar ? true : !i.recusado && i.proximaTentativa <= t0));
  if (forcar) {
    // "Tentar de novo": recusados voltam a valer e a espera zera.
    for (const i of elegiveis) {
      if (i.recusado || i.proximaTentativa > t0) await b.filaServicos.update(i.id, { recusado: false, proximaTentativa: 0 });
    }
  }
  aoComecar?.(elegiveis.length);

  const prontos: ItemFilaServico[] = [];
  for (const item of elegiveis) {
    const fotos = await b.filaFotos.where("servicoId").equals(item.id).toArray();
    let completo = true;
    for (const foto of fotos.filter((f) => f.enviada === 0)) {
      try {
        await enviarFoto(fetchFn, foto);
        await b.filaFotos.update(foto.id, { enviada: 1 });
      } catch (e) {
        if (e instanceof ErroDeRede || e instanceof ErroDeSessao) throw e;
        const msg = e instanceof ErroDoServidor ? e.message : "Não foi possível enviar uma foto.";
        const recusada = e instanceof ErroDoServidor && e.permanente;
        await registrarFalha(item, `Foto: ${msg}`, agora(), recusada);
        completo = false;
        break; // este serviço espera; os outros seguem
      }
    }
    // Fotos que o serviço cita mas a fila não tem mais (nunca deveria acontecer): não bloqueia, o servidor avisa.
    if (completo) prontos.push(item);
  }

  let enviados = 0;
  for (let i = 0; i < prontos.length; i += MAX_SERVICOS_POR_PUSH) {
    const lote = prontos.slice(i, i + MAX_SERVICOS_POR_PUSH);
    const corpo: CorpoPush = { servicos: lote.map((p) => ({ ...p.dados, id: p.id })) };
    let resposta: RespostaPush;
    try {
      resposta = await chamar<RespostaPush>(fetchFn, "/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(corpo),
      });
    } catch (e) {
      if (e instanceof ErroDeRede || e instanceof ErroDeSessao) throw e;
      // O servidor recusou o lote inteiro (ex.: dados inválidos). Cada item guarda o motivo e espera.
      const msg = e instanceof ErroDoServidor ? e.message : "Não foi possível enviar.";
      const recusado = e instanceof ErroDoServidor && e.permanente;
      for (const item of lote) await registrarFalha(item, msg, agora(), recusado);
      continue;
    }

    for (const item of lote) {
      const r = resposta.resultados.find((x) => x.id === item.id);
      if (r?.ok) {
        await concluir(item, r);
        enviados++;
      } else if (r?.fotosFaltando?.length) {
        // O servidor não achou os arquivos: marca para reenviar e tenta de novo (o serviço continua na fila).
        for (const fotoId of r.fotosFaltando) await b.filaFotos.update(fotoId, { enviada: 0 });
        await registrarFalha(item, "O servidor ainda não recebeu todas as fotos. Vou reenviar.", agora());
      } else {
        await registrarFalha(item, r?.erro ?? "O servidor não confirmou o serviço.", agora(), r?.permanente === true);
      }
    }
  }

  return { enviados, restantes: await b.filaServicos.count() };
}

/** "Tentar de novo" de um serviço recusado (ou em espera). */
export async function tentarDeNovo(id: string): Promise<void> {
  await banco().filaServicos.update(id, { recusado: false, proximaTentativa: 0, erro: null });
}
