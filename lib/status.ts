import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

/** Status do equipamento, calculado a partir do último serviço (escopo, seção 5). */
export const STATUS_EQUIPAMENTO = ["em_dia", "vence_em_breve", "vencido", "sem_registro"] as const;
export type StatusEquipamento = (typeof STATUS_EQUIPAMENTO)[number];

/** Quantos dias antes do vencimento o equipamento passa a "vence em breve". */
export const DIAS_VENCE_EM_BREVE = 15;

/**
 * @param proximaData `proxima_data` do último serviço (yyyy-mm-dd) ou null quando
 *   o equipamento não tem nenhum serviço.
 * @param hoje data de referência (padrão: agora).
 */
export function calcularStatus(
  proximaData: string | Date | null | undefined,
  hoje: Date = new Date(),
): StatusEquipamento {
  if (!proximaData) return "sem_registro";
  const dias = diasAteVencer(proximaData, hoje);
  if (dias < 0) return "vencido";
  if (dias <= DIAS_VENCE_EM_BREVE) return "vence_em_breve";
  return "em_dia";
}

/** Dias de calendário até a data (negativo = já venceu). */
export function diasAteVencer(proximaData: string | Date, hoje: Date = new Date()): number {
  const alvo = typeof proximaData === "string" ? parseISO(proximaData) : proximaData;
  return differenceInCalendarDays(startOfDay(alvo), startOfDay(hoje));
}
