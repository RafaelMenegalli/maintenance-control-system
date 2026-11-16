import { z } from "zod";
import { cnpjValido, mascararCnpj } from "@/lib/format";
import { atributosSchema, camposSchema } from "./campo";
import { checklistSchema, respostasChecklistSchema } from "./checklist";
import { NOMES_ICONES } from "./icones";

/**
 * Schemas dos dados que o técnico envia nos cadastros. São usados no navegador
 * (formulários) e no servidor (route handlers), com mensagens em português.
 */

const textoOpcional = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

export const clienteInputSchema = z.object({
  /** UUID gerado no cliente (opcional). */
  id: z.uuid().optional(),
  nome: z.string().trim().min(1, "Informe o nome do cliente"),
  cnpj: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || cnpjValido(v), "CNPJ inválido. Confira os 14 números ou deixe em branco")
    .transform((v) => (v ? mascararCnpj(v) : null)),
  contato: textoOpcional,
});
export type ClienteInput = z.input<typeof clienteInputSchema>;

export const localInputSchema = z.object({
  id: z.uuid().optional(),
  clienteId: z.uuid("Escolha o cliente"),
  nome: z.string().trim().min(1, "Informe o nome do local, por exemplo Bloco A"),
});
export type LocalInput = z.input<typeof localInputSchema>;

export const PERIODICIDADES_RAPIDAS = [
  { rotulo: "Mensal", dias: 30 },
  { rotulo: "Trimestral", dias: 90 },
  { rotulo: "Semestral", dias: 180 },
  { rotulo: "Anual", dias: 365 },
] as const;

export const periodicidadeSchema = z
  .number({ error: "Informe a periodicidade em dias" })
  .int("Use um número inteiro de dias")
  .min(1, "A periodicidade precisa ser de pelo menos 1 dia")
  .max(3650, "A periodicidade máxima é de 3650 dias");

export const tipoInputSchema = z.object({
  id: z.uuid().optional(),
  nome: z.string().trim().min(1, "Informe o nome do tipo, por exemplo Extintor"),
  icone: z.enum(NOMES_ICONES, { error: "Escolha um ícone" }),
  periodicidadePadraoDias: periodicidadeSchema,
  campos: camposSchema,
  checklist: checklistSchema,
});
export type TipoInput = z.input<typeof tipoInputSchema>;

export const equipamentoInputSchema = z.object({
  id: z.uuid().optional(),
  localId: z.uuid("Escolha o local do equipamento"),
  tipoId: z.uuid("Escolha o tipo do equipamento"),
  nome: z.string().trim().min(1, "Informe o nome ou a identificação do equipamento"),
  periodicidadeDias: periodicidadeSchema,
  atributos: atributosSchema,
  observacoes: textoOpcional,
});
export type EquipamentoInput = z.input<typeof equipamentoInputSchema>;

// ───────────────────────── Serviços ─────────────────────────

export const TIPOS_SERVICO = ["instalacao", "preventiva", "corretiva", "limpeza", "inspecao"] as const;
export type TipoServicoValor = (typeof TIPOS_SERVICO)[number];

export const ROTULOS_TIPO_SERVICO: Record<TipoServicoValor, string> = {
  instalacao: "Instalação",
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  limpeza: "Limpeza",
  inspecao: "Inspeção/teste",
};

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida");

const fotoDoServicoSchema = z.object({
  id: z.uuid(),
  momento: z.enum(["antes", "depois"]),
});

const camposComunsServico = {
  tipo: z.enum(TIPOS_SERVICO, { error: "Escolha o tipo de serviço" }),
  data: dataIso,
  descricao: z.string().trim().min(1, "Escreva o que foi feito").max(5000, "A descrição está longa demais"),
  checklist: respostasChecklistSchema,
  proximaData: dataIso.nullish(),
};

/** Serviço novo. `id` e os ids das fotos são UUIDs gerados no navegador (o registro pode nascer offline). */
export const servicoInputSchema = z.object({
  id: z.uuid(),
  equipamentoId: z.uuid(),
  ...camposComunsServico,
  /** Fotos já enviadas (POST /api/fotos) que pertencem a este serviço. */
  fotos: z.array(fotoDoServicoSchema).max(40).default([]),
});
export type ServicoInput = z.input<typeof servicoInputSchema>;

/** Edição de um serviço existente. */
export const servicoEdicaoSchema = z.object({
  ...camposComunsServico,
  fotosNovas: z.array(fotoDoServicoSchema).max(40).default([]),
  fotosRemovidas: z.array(z.uuid()).max(40).default([]),
});
export type ServicoEdicaoInput = z.input<typeof servicoEdicaoSchema>;
