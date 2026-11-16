import { z } from "zod";

/** Tipos de campo de cadastro que um tipo de equipamento pode definir. */
export const TIPOS_CAMPO = ["texto", "numero", "data", "selecao", "sim_nao"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

/**
 * Definição de campo (JSONB `tipos_equipamento.campos`).
 * `selecao` exige ao menos uma opção.
 */
export const campoDefinicaoSchema = z
  .object({
    key: z
      .string()
      .min(1, "Informe a chave do campo")
      .regex(/^[a-z][a-z0-9_]*$/, "Use só letras minúsculas, números e _"),
    label: z.string().min(1, "Informe o nome do campo"),
    type: z.enum(TIPOS_CAMPO),
    options: z.array(z.string().min(1)).optional(),
    obrigatorio: z.boolean(),
    unidade: z.string().optional(),
  })
  .refine((c) => c.type !== "selecao" || (c.options && c.options.length > 0), {
    message: "Campos de seleção precisam de pelo menos uma opção",
    path: ["options"],
  });

export type CampoDefinicao = z.infer<typeof campoDefinicaoSchema>;

export const camposSchema = z
  .array(campoDefinicaoSchema)
  .refine((campos) => new Set(campos.map((c) => c.key)).size === campos.length, {
    message: "Existem dois campos com a mesma chave",
  });

/**
 * Valores dos campos de um equipamento (JSONB `equipamentos.atributos`),
 * indexados pela `key` do campo.
 */
export const valorAtributoSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const atributosSchema = z.record(z.string(), valorAtributoSchema);
export type ValorAtributo = z.infer<typeof valorAtributoSchema>;
export type Atributos = z.infer<typeof atributosSchema>;
