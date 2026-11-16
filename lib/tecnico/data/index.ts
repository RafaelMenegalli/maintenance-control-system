/**
 * ÚNICA porta de acesso a dados das telas do técnico que funcionam offline.
 * As telas importam daqui (hooks e tipos) — nunca de `fetch`, `db` ou route handlers.
 * A implementação em uso é escolhida em ./atual.ts.
 */
export type { RepositorioTecnico } from "./repositorio";
export * from "./types";
export * from "./hooks";
export { ErroDeDados } from "./fetch-repositorio";
