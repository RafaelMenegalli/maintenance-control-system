import { createSerwistRoute } from "@serwist/turbopack";
import { randomUUID } from "node:crypto";

/**
 * Serve o service worker (/serwist/sw.js), gerado no `next build` a partir de app/sw.ts.
 * O manifesto de precache lista os arquivos de `.next/static` (JS, CSS, fontes) e `public/`,
 * para as telas offline conseguirem carregar sem internet. A resposta leva o cabeçalho
 * `Service-Worker-Allowed: /`, então o escopo do SW é o site todo.
 */
const revisao = randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  // `/offline` é a página amigável de "Esta tela precisa de internet" (precache a cada build).
  additionalPrecacheEntries: [{ url: "/offline", revision: revisao }],
  // As fontes do next/font ficam em .next/static/media (woff2): entram no precache.
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest,woff,woff2}",
    "public/**/*",
  ],
  useNativeEsbuild: true,
});
