/**
 * ÚNICA porta de acesso a dados das telas do técnico que funcionam offline.
 * - Leitura: hooks (`useEquipamentos`, `useTipos`…).
 * - Escrita: métodos de `repositorio` (`repositorio.salvarEquipamento(...)`).
 * As telas importam daqui — nunca de `fetch`, `db` ou route handlers.
 * A implementação em uso é escolhida em ./atual.ts.
 */
export type { RepositorioTecnico } from "./repositorio";
export { repositorio } from "./atual";
export * from "./types";
export * from "./hooks";
export { ErroDeDados } from "./fetch-repositorio";
export { normalizarTexto } from "./filtros";
