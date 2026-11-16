/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";

/**
 * Service worker do app (Serwist). Papel dele:
 *  1. Precache de tudo que o Next gera em `.next/static` + `public/` (para as telas hidratarem offline).
 *  2. Telas OFFLINE do técnico: o HTML das rotas permitidas (lista abaixo) é guardado em cache e
 *     servido quando não há internet. O app "aquece" esse cache depois de cada sincronização
 *     (pedidos com o cabeçalho `X-Aquecer`), inclusive as rotas com id de cada equipamento.
 *  3. Qualquer outra tela (cadastros, acessos, relatórios, portal) NUNCA é guardada:
 *     sem internet mostra a página `/offline` ("Esta tela precisa de internet.").
 *  4. `/e/{id}` (QR aberto pela câmera do celular) sem internet vira um redirecionamento
 *     para o equipamento.
 *  5. Miniaturas das fotos (`/api/fotos/*?tamanho=miniatura`) ficam em cache para a linha do tempo.
 * Atualização: o SW novo fica "esperando" e o app mostra "Nova versão disponível" (skipWaiting
 * só acontece quando a pessoa toca em "Atualizar").
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Telas do técnico que funcionam sem internet (a lista tem de bater com lib/tecnico/offline.ts). */
const ROTAS_OFFLINE = [
  /^\/tecnico$/,
  /^\/tecnico\/equipamentos$/,
  /^\/tecnico\/escanear$/,
  /^\/tecnico\/servicos\/novo$/,
  /^\/tecnico\/instalar$/,
  new RegExp(`^/tecnico/equipamentos/${UUID}$`, "i"),
  new RegExp(`^/tecnico/equipamentos/${UUID}/novo-servico$`, "i"),
];
const ROTA_QR = new RegExp(`^/e/(${UUID})$`, "i");

const permitida = (caminho: string) => ROTAS_OFFLINE.some((r) => r.test(caminho));

/** Versão do cache de páginas: muda a cada build (o HTML guardado aponta para os arquivos daquele build). */
function hashTexto(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const manifesto = self.__SW_MANIFEST ?? [];
const VERSAO = hashTexto(manifesto.map((e) => (typeof e === "string" ? e : `${e.url}@${e.revision ?? ""}`)).join("|"));
const CACHE_PAGINAS = `paginas-${VERSAO}`;

/** Espera máxima pela rede antes de usar a página guardada (cobertura fraca não pode travar o app). */
const ESPERA_REDE_MS = 4000;

const serwist: Serwist = new Serwist({
  precacheEntries: manifesto,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Aquecimento do cache pelo app: GET com `X-Aquecer` guarda o HTML da rota permitida.
    {
      matcher: ({ request }) => request.headers.has("X-Aquecer"),
      handler: async ({ request }) => {
        const url = new URL(request.url);
        if (!permitida(url.pathname)) return new Response(null, { status: 400 });
        try {
          const resposta = await fetch(url.pathname + url.search, {
            credentials: "same-origin",
            headers: { Accept: "text/html" },
          });
          if (!resposta.ok || resposta.redirected) return new Response(null, { status: 502 });
          const cache = await caches.open(CACHE_PAGINAS);
          await cache.put(url.pathname + url.search, resposta);
          return new Response(null, { status: 204 });
        } catch {
          return new Response(null, { status: 503 });
        }
      },
    },
    // Navegações (abrir o app, recarregar, soft-navigation que caiu para navegação completa).
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: async ({ request }): Promise<Response> => {
        const url = new URL(request.url);
        const chave = url.pathname + url.search;
        const guardavel = permitida(url.pathname);
        const cache = await caches.open(CACHE_PAGINAS);

        const daCache = async () =>
          (await cache.match(chave)) ?? (await cache.match(url.pathname)) ?? undefined;

        try {
          let resposta: Response;
          if (guardavel && (await daCache())) {
            // Tem cópia: espera a rede só um pouco.
            const controlador = new AbortController();
            const timer = setTimeout(() => controlador.abort(), ESPERA_REDE_MS);
            try {
              resposta = await fetch(request, { signal: controlador.signal });
            } finally {
              clearTimeout(timer);
            }
          } else {
            resposta = await fetch(request);
          }
          // Só guarda página normal (nunca o redirecionamento para o login).
          const html = resposta.headers.get("content-type")?.includes("text/html");
          if (guardavel && resposta.ok && !resposta.redirected && html) {
            await cache.put(chave, resposta.clone());
          }
          return resposta;
        } catch {
          // Sem internet (ou rede travada).
          if (guardavel) {
            const guardada = await daCache();
            if (guardada) return guardada;
          }
          const qr = ROTA_QR.exec(url.pathname);
          if (qr) return Response.redirect(`/tecnico/equipamentos/${qr[1]}`, 302);
          const offline: Response | undefined = await serwist.matchPrecache("/offline");
          return offline ?? Response.error();
        }
      },
    },
    // Miniaturas das fotos (linha do tempo offline).
    {
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname.startsWith("/api/fotos/") && url.searchParams.get("tamanho") === "miniatura",
      handler: new StaleWhileRevalidate({
        cacheName: "fotos-miniaturas",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30, maxAgeFrom: "last-used" })],
      }),
    },
  ],
});

// Ao ativar uma versão nova, apaga o cache de páginas das versões antigas.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n.startsWith("paginas-") && n !== CACHE_PAGINAS).map((n) => caches.delete(n)));
    })(),
  );
});

serwist.addEventListeners();
