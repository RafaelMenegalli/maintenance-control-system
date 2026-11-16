import { banco, gravarMeta, lerMeta, META } from "@/lib/tecnico/data/banco";
import { chamar, type Fetch } from "./rede";
import type { RespostaPull } from "./tipos";

/** Sobreposição entre um pull e o próximo (relógios diferentes; repetir equipamentos é inofensivo). */
const FOLGA_MS = 2 * 60_000;

/**
 * Grava no Dexie o que o servidor mandou, numa transação só (as telas nunca veem metade).
 * - tipos e clientes (com locais): sempre vêm completos → substituem os locais.
 * - equipamentos: completo → troca tudo; incremental → atualiza só os que vieram.
 * - serviços: para cada equipamento que veio, a lista de serviços dele é trocada inteira
 *   (é assim que um serviço editado ou excluído no computador chega ao celular).
 */
export async function aplicarPull(r: RespostaPull): Promise<void> {
  const b = banco();
  await b.transaction("rw", [b.meta, b.clientes, b.tipos, b.equipamentos, b.servicos], async () => {
    await b.clientes.clear();
    await b.clientes.bulkPut(r.clientes);
    await b.tipos.clear();
    await b.tipos.bulkPut(r.tipos);
    if (r.completo) {
      await b.equipamentos.clear();
      await b.servicos.clear();
    }
    await b.equipamentos.bulkPut(r.equipamentos);
    for (const [equipamentoId, lista] of Object.entries(r.servicosPorEquipamento)) {
      await b.servicos.where("equipamentoId").equals(equipamentoId).delete();
      await b.servicos.bulkPut(lista);
    }
    await b.meta.put({ chave: META.ultimoPull, valor: new Date(Date.parse(r.agora) - FOLGA_MS).toISOString() });
  });
}

/** Baixa as novidades (incremental, ou completo na primeira vez) e grava no Dexie. */
export async function puxar(fetchFn: Fetch = fetch): Promise<{ equipamentos: number }> {
  const desde = await lerMeta<string>(META.ultimoPull);
  const url = desde ? `/api/sync/pull?desde=${encodeURIComponent(desde)}` : "/api/sync/pull";
  const resposta = await chamar<RespostaPull>(fetchFn, url, { headers: { Accept: "application/json" } });
  await aplicarPull(resposta);
  await gravarMeta(META.ultimaSincronizacao, new Date().toISOString());
  return { equipamentos: resposta.equipamentos.length };
}
