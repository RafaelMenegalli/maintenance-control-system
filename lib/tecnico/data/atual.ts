/**
 * Implementação de dados em uso pelas telas do técnico: banco local (Dexie) + fila de envio.
 * A implementação antiga, que chama a API direto, continua em ./fetch-repositorio (os cadastros a usam por baixo).
 */
import { dexieRepositorio } from "./dexie-repositorio";
import type { RepositorioTecnico } from "./repositorio";

export const repositorio: RepositorioTecnico = dexieRepositorio;
