import { banco } from "@/lib/tecnico/data/banco";
import { urlsParaAquecer } from "@/lib/tecnico/offline";

const SIMULTANEOS = 3;
let aquecendo = false;

/**
 * "Aquece" o cache do service worker: baixa em segundo plano o HTML das telas que funcionam offline
 * (início, lista, leitor de QR, e o detalhe + registro de serviço de cada equipamento), para elas abrirem sem
 * internet com as mesmas URLs de sempre. Só baixa o que falta (3 por vez) e nunca atrapalha a sincronização.
 * O service worker só guarda as rotas da lista permitida (app/sw.ts); o resto ele recusa.
 */
export async function aquecerCache(): Promise<void> {
  if (aquecendo || typeof caches === "undefined" || !("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
  aquecendo = true;
  try {
    const equipamentos = await banco().equipamentos.toArray();
    const urls = urlsParaAquecer(equipamentos.filter((e) => !e.arquivado).map((e) => e.id));

    const nomes = (await caches.keys()).filter((n) => n.startsWith("paginas-"));
    const guardadas = new Set<string>();
    for (const nome of nomes) {
      for (const req of await (await caches.open(nome)).keys()) guardadas.add(new URL(req.url).pathname);
    }

    const faltando = urls.filter((u) => !guardadas.has(u));
    let indice = 0;
    const trabalhador = async () => {
      while (indice < faltando.length) {
        const url = faltando[indice++];
        try {
          await fetch(url, { headers: { "X-Aquecer": "1" } });
        } catch {
          return; // sem internet: para; tenta na próxima sincronização
        }
      }
    };
    await Promise.all(Array.from({ length: SIMULTANEOS }, trabalhador));
  } finally {
    aquecendo = false;
  }
}
