import type { OpcaoChip } from "@/components/chips-filtro";

/** Opções do filtro "Situação" (lista de equipamentos do técnico e do portal). */
export const OPCOES_STATUS: OpcaoChip[] = [
  { valor: "vencido", rotulo: "Vencidos" },
  { valor: "vence_em_breve", rotulo: "Vencem em breve" },
  { valor: "em_dia", rotulo: "Em dia" },
  { valor: "sem_registro", rotulo: "Sem registro" },
];
