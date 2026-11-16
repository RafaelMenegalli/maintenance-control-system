import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { z } from "zod";

/** Período máximo de um relatório (2 anos): evita PDFs gigantes. */
export const DIAS_MAXIMOS_RELATORIO = 731;

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((v) => isValid(parseISO(v)), "Data inválida.");

const uuidOpcional = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().uuid("Filtro inválido.").optional(),
);

/** Filtros de GET /api/relatorios (vêm da query string). */
export const filtrosRelatorioSchema = z
  .object({
    inicio: dataIso,
    fim: dataIso,
    /** Só vale para o técnico (admin). O cliente sempre usa o próprio cliente da sessão. */
    clienteId: uuidOpcional,
    localId: uuidOpcional,
    tipoId: uuidOpcional,
    equipamentoId: uuidOpcional,
  })
  .refine((f) => f.inicio <= f.fim, { message: "A data final não pode ser antes da data inicial.", path: ["fim"] })
  .refine((f) => differenceInCalendarDays(parseISO(f.fim), parseISO(f.inicio)) <= DIAS_MAXIMOS_RELATORIO, {
    message: "Escolha um período de até 2 anos.",
    path: ["fim"],
  });

export type FiltrosRelatorio = z.output<typeof filtrosRelatorioSchema>;

/** Nome do arquivo: relatorio-manutencoes-{cliente}-{dd-mm-aaaa}-a-{dd-mm-aaaa}.pdf (sem acentos nem símbolos). */
export function nomeArquivoRelatorio(clienteNome: string, inicio: string, fim: string): string {
  const slug =
    clienteNome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "cliente";
  const br = (d: string) => format(parseISO(d), "dd-MM-yyyy");
  return `relatorio-manutencoes-${slug}-${br(inicio)}-a-${br(fim)}.pdf`;
}
