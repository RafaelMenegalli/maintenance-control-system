import type { RespostaChecklist } from "@/lib/schemas/checklist";

export type ResumoChecklist = {
  total: number;
  ok: number;
  naoOk: number;
  na: number;
  /** Itens aplicáveis (todos menos os "N/A"). */
  aplicaveis: number;
  /** Há algum item "Não OK"? (para destacar em vermelho) */
  temProblema: boolean;
  /** "8 de 8 OK", "1 item Não OK", "Sem checklist". */
  texto: string;
};

/**
 * Resumo do checklist de um serviço.
 * - sem itens → "Sem checklist"
 * - com "Não OK" → "1 item Não OK" / "3 itens Não OK" (destaque)
 * - senão → "8 de 8 OK" (N/A não entra na conta; aparece ao lado: "6 de 6 OK · 2 N/A")
 */
export function resumirChecklist(respostas: Pick<RespostaChecklist, "resultado">[]): ResumoChecklist {
  const total = respostas.length;
  const ok = respostas.filter((r) => r.resultado === "ok").length;
  const naoOk = respostas.filter((r) => r.resultado === "nao_ok").length;
  const na = respostas.filter((r) => r.resultado === "na").length;
  const aplicaveis = total - na;

  let texto: string;
  if (total === 0) texto = "Sem checklist";
  else if (naoOk > 0) texto = `${naoOk} ${naoOk === 1 ? "item Não OK" : "itens Não OK"}`;
  else texto = `${ok} de ${aplicaveis} OK${na > 0 ? ` · ${na} N/A` : ""}`;

  return { total, ok, naoOk, na, aplicaveis, temProblema: naoOk > 0, texto };
}
