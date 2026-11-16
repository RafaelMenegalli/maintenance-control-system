import type { EquipamentoResumo, FiltrosEquipamentos, PainelTecnico } from "./types";

/** Minúsculas e sem acentos, para a busca achar "Recepcao" ao digitar "recepção". */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtros de equipamentos em memória. Compartilhado entre a implementação via API
 * e a futura implementação offline (Dexie), para o comportamento ser idêntico.
 */
export function filtrarEquipamentos(
  lista: EquipamentoResumo[],
  filtros: FiltrosEquipamentos = {},
): EquipamentoResumo[] {
  const termos = filtros.busca ? normalizarTexto(filtros.busca).split(/\s+/).filter(Boolean) : [];

  return lista.filter((e) => {
    if (!filtros.incluirArquivados && e.arquivado) return false;
    if (filtros.tipoId && e.tipoId !== filtros.tipoId) return false;
    if (filtros.localId && e.localId !== filtros.localId) return false;
    if (filtros.status && e.status !== filtros.status) return false;
    if (termos.length > 0) {
      const alvo = normalizarTexto(`${e.nome} ${e.localNome} ${e.tipoNome}`);
      if (!termos.every((t) => alvo.includes(t))) return false;
    }
    return true;
  });
}

/** Monta o painel (vencidos / vencem em breve / sem registro) a partir da lista. */
export function montarPainel(lista: EquipamentoResumo[]): PainelTecnico {
  const ativos = lista.filter((e) => !e.arquivado);
  const porVencimento = (a: EquipamentoResumo, b: EquipamentoResumo) =>
    (a.proximaData ?? "").localeCompare(b.proximaData ?? "");
  return {
    vencidos: ativos.filter((e) => e.status === "vencido").sort(porVencimento),
    venceEmBreve: ativos.filter((e) => e.status === "vence_em_breve").sort(porVencimento),
    semRegistro: ativos.filter((e) => e.status === "sem_registro"),
  };
}
