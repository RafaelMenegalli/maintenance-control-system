/**
 * Implementação de dados em uso pelas telas do técnico.
 * Etapa 5: trocar `fetchRepositorio` pela implementação em Dexie nesta linha.
 */
import { fetchRepositorio } from "./fetch-repositorio";
import type { RepositorioTecnico } from "./repositorio";

export const repositorio: RepositorioTecnico = fetchRepositorio;
