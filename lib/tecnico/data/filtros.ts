import type { StatusEquipamento } from "@/lib/status";
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

const ORDEM_STATUS: Record<StatusEquipamento, number> = {
  vencido: 0,
  vence_em_breve: 1,
  sem_registro: 2,
  em_dia: 3,
};

/** Vencidos primeiro, depois os que vencem em breve, depois o resto (do mais urgente ao menos). */
export function ordenarPorUrgencia(lista: EquipamentoResumo[]): EquipamentoResumo[] {
  return [...lista].sort(
    (a, b) =>
      ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
      (a.proximaData ?? "9999").localeCompare(b.proximaData ?? "9999") ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/** Equipamentos que têm data de próxima manutenção, da mais antiga para a mais nova. */
export function proximasManutencoes(lista: EquipamentoResumo[], limite = 10): EquipamentoResumo[] {
  return lista
    .filter((e) => e.proximaData)
    .sort((a, b) => a.proximaData!.localeCompare(b.proximaData!) || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

/** Conta os equipamentos (não arquivados) por situação, para os 3 cartões do painel. */
export function contarSituacoes(lista: EquipamentoResumo[]) {
  const c = { vencido: 0, vence_em_breve: 0, sem_registro: 0 };
  for (const e of lista) {
    if (!e.arquivado && e.status in c) c[e.status as keyof typeof c] += 1;
  }
  return c;
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
