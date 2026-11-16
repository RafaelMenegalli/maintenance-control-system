import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

/**
 * ÚNICA fonte da regra de status de um equipamento (escopo, seção 5).
 * Usada no painel, na lista, no detalhe e (nas próximas etapas) no portal e no PDF.
 * Não reimplemente esta regra em outro lugar.
 */

/** Status do equipamento, calculado a partir do último serviço. */
export const STATUS_EQUIPAMENTO = ["em_dia", "vence_em_breve", "vencido", "sem_registro"] as const;
export type StatusEquipamento = (typeof STATUS_EQUIPAMENTO)[number];

/** Quantos dias antes do vencimento o equipamento passa a "vence em breve". */
export const DIAS_VENCE_EM_BREVE = 15;

/** Dias de calendário até a data (negativo = já venceu). */
export function diasAteVencer(proximaData: string | Date, hoje: Date = new Date()): number {
  const alvo = typeof proximaData === "string" ? parseISO(proximaData) : proximaData;
  return differenceInCalendarDays(startOfDay(alvo), startOfDay(hoje));
}

/**
 * Status a partir da `proxima_data` do último serviço (yyyy-mm-dd).
 * - sem data (equipamento nunca recebeu serviço) → `sem_registro`
 * - já passou (antes de hoje) → `vencido`
 * - vence hoje ou em até 15 dias → `vence_em_breve`
 * - depois disso → `em_dia`
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

/** Serviço mínimo necessário para decidir o status. */
export type ServicoParaStatus = {
  data: string;
  proximaData: string | null;
  /** Desempate quando há dois serviços na mesma data (o criado por último vale). */
  criadoEm?: string | Date;
};

/** O último serviço: maior `data`; em empate, o criado por último. */
export function ultimoServico<T extends ServicoParaStatus>(servicos: T[]): T | null {
  let melhor: T | null = null;
  for (const s of servicos) {
    if (!melhor) {
      melhor = s;
      continue;
    }
    if (s.data !== melhor.data ? s.data > melhor.data : (s.criadoEm ? +new Date(s.criadoEm) : 0) > (melhor.criadoEm ? +new Date(melhor.criadoEm) : 0)) {
      melhor = s;
    }
  }
  return melhor;
}

/** Status calculado direto da lista de serviços do equipamento. */
export function calcularStatusPorServicos(
  servicos: ServicoParaStatus[],
  hoje: Date = new Date(),
): StatusEquipamento {
  return calcularStatus(ultimoServico(servicos)?.proximaData, hoje);
}

function plural(n: number, singular: string, pluralTxt: string): string {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}

/**
 * Texto relativo ao vencimento:
 * "vence hoje", "vence amanhã", "vence em 5 dias", "venceu ontem", "venceu há 3 dias".
 */
export function textoVencimento(proximaData: string | Date, hoje: Date = new Date()): string {
  const dias = diasAteVencer(proximaData, hoje);
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias > 1) return `vence em ${plural(dias, "dia", "dias")}`;
  if (dias === -1) return "venceu ontem";
  return `venceu há ${plural(Math.abs(dias), "dia", "dias")}`;
}

/**
 * Texto amigável do status, com a primeira letra maiúscula:
 * "Vence em 5 dias", "Venceu há 3 dias", "Em dia", "Sem registro".
 */
export function textoStatus(
  proximaData: string | Date | null | undefined,
  hoje: Date = new Date(),
): string {
  const status = calcularStatus(proximaData, hoje);
  if (status === "sem_registro") return "Sem registro";
  if (status === "em_dia") return "Em dia";
  const texto = textoVencimento(proximaData as string | Date, hoje);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
